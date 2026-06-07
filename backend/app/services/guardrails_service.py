import re
import uuid
import httpx
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.db_models import OrgPolicy, User
from app.services.vector_store import vector_store_service
from app.services.rbac_service import rbac_service

# Heuristic lists for self query detection
SELF_KEYWORDS = [
    "ฉัน", "ผม", "หนู", "ข้าพเจ้า", "ตัวเอง", "ของฉัน", "ของผม", "ประวัติฉัน", "ข้อมูลฉัน",
    "my", "me", "myself", "own", "เงินเดือนฉัน", "เงินเดือนผม", "ผลประเมินฉัน", "ผลประเมินผม"
]

OTHERS_KEYWORDS = [
    "คนอื่น", "พนักงานคนอื่น", "ของพนักงาน", "ทุกคน", "แผนก", "เฉลี่ย", "สูงสุด", "ต่ำสุด",
    "สมชาย", "วิชัย", "นงนุช", "กิตติ", "ศิริ", "พร", "สมศรี"  # ชื่อพนักงานคนอื่นๆ ใน mock data
]

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """คำนวณ Cosine Similarity ระหว่างเวกเตอร์ 2 ตัว"""
    dot_product = sum(x * y for x, y in zip(v1, v2))
    magnitude_v1 = sum(x * x for x in v1) ** 0.5
    magnitude_v2 = sum(x * x for x in v2) ** 0.5
    if magnitude_v1 == 0 or magnitude_v2 == 0:
        return 0.0
    return dot_product / (magnitude_v1 * magnitude_v2)

class GuardrailsService:
    """Service สำหรับตรวจสอบความปลอดภัย 3-layer pipeline (Input -> RBAC -> Output)"""

    def __init__(self):
        self.hrm_base_url = "http://127.0.0.1:8001/api/hrm"

    async def seed_org_policies(self, db: AsyncSession):
        """Seed นโยบายความปลอดภัยเริ่มต้นลงในตาราง org_policies หากยังไม่มี"""
        print("🌱 Checking and seeding org_policies...")
        result = await db.execute(select(OrgPolicy))
        existing_policies = result.scalars().all()
        
        if len(existing_policies) == 0:
            default_policies = [
                {
                    "policy_type": "topic_restriction",
                    "name": "ห้ามเปิดเผยเงินเดือนผู้อื่น",
                    "description": "ห้ามพนักงานทั่วไปถามหรือเข้าถึงข้อมูลเงินเดือน ค่าตอบแทน โบนัส ของพนักงานคนอื่น",
                    "rules": {
                        "restricted_topics": ["เงินเดือน", "ค่าตอบแทน", "โบนัส", "salary", "compensation", "bonus"],
                        "exception": "own_data",
                        "semantic_threshold": 0.75
                    },
                    "applies_to_roles": ["employee"],
                    "applies_to_sessions": ["hrm", "*"],
                    "severity": "block",
                    "is_active": True
                },
                {
                    "policy_type": "topic_restriction",
                    "name": "ห้ามเปิดเผยผลประเมินผู้อื่น",
                    "description": "ห้ามพนักงานทั่วไปถามหรือเข้าถึงผลการประเมินผลการทำงาน KPI ของพนักงานคนอื่น",
                    "rules": {
                        "restricted_topics": ["ประเมินผล", "KPI", "performance review", "ประเมินผลงาน", "คะแนนประเมิน"],
                        "exception": "own_data",
                        "semantic_threshold": 0.75
                    },
                    "applies_to_roles": ["employee"],
                    "applies_to_sessions": ["hrm", "*"],
                    "severity": "block",
                    "is_active": True
                },
                {
                    "policy_type": "pii_filter",
                    "name": "Redact PII ใน output",
                    "description": "กรองและปกปิดข้อมูลส่วนบุคคลที่อ่อนไหว เช่น เลขบัตรประชาชน เบอร์โทรศัพท์ บัญชีธนาคาร ที่ปรากฏในคำตอบ",
                    "rules": {
                        "pii_types": ["id_card", "phone", "bank_account"],
                        "action": "redact"
                    },
                    "applies_to_roles": ["*"],
                    "applies_to_sessions": ["*"],
                    "severity": "redact",
                    "is_active": True
                }
            ]
            
            for policy_data in default_policies:
                db_policy = OrgPolicy(
                    id=uuid.uuid4(),
                    policy_type=policy_data["policy_type"],
                    name=policy_data["name"],
                    description=policy_data["description"],
                    rules=policy_data["rules"],
                    applies_to_roles=policy_data["applies_to_roles"],
                    applies_to_sessions=policy_data["applies_to_sessions"],
                    severity=policy_data["severity"],
                    is_active=policy_data["is_active"]
                )
                db.add(db_policy)
            
            await db.commit()
            print("✅ Seeding org_policies completed successfully!")
        else:
            print(f"ℹ️ Found {len(existing_policies)} existing org_policies. Skipping seed.")

    async def check_input_guardrails(
        self, 
        db: AsyncSession, 
        user: User, 
        system_session_id: str | None, 
        query: str
    ) -> Dict[str, Any]:
        """
        Layer 1 & 2: Input Guardrails + RBAC check
        
        Returns:
            Dict containing:
                "allowed": bool
                "reason": str | None
                "severity": str ("block", "warn", "allow")
                "filter_employee_email": str | None (สำหรับกรอง RAG ให้เห็นเฉพาะข้อมูลตนเอง)
        """
        # หากไม่มี system_session_id ให้ผ่านไปเลย (ยกเว้น RAG ปกติที่ผู้ใช้เป็นเจ้าของเอกสารเอง)
        if not system_session_id:
            return {"allowed": True, "reason": None, "severity": "allow", "filter_employee_email": None}

        # 1. ซิงค์สิทธิ์และดึงข้อมูลของ user กับ HRM server
        emp_id, hrm_role = await rbac_service.get_or_sync_employee_id(db, user)

        # หากผู้ใช้เป็น admin หรือ hr_admin จะได้รับสิทธิ์เข้าถึงทั้งหมดโดยไม่มีข้อจำกัด
        if rbac_service.is_hr_or_admin(hrm_role):
            return {"allowed": True, "reason": None, "severity": "allow", "filter_employee_email": None}

        # 2. ดึงนโยบายจำกัดหัวข้อ (topic_restriction) จากฐานข้อมูล
        result = await db.execute(
            select(OrgPolicy).where(
                OrgPolicy.policy_type == "topic_restriction",
                OrgPolicy.is_active == True
            )
        )
        policies = result.scalars().all()

        # โหลด embedding สำหรับการเช็คความหมาย (Semantic check)
        user_query_emb = None
        if vector_store_service.embedding_model:
            try:
                user_query_emb = vector_store_service.embedding_model.get_text_embedding(query)
            except Exception as e:
                print(f"⚠️ [Guardrails] Failed to embed user query: {e}")

        for policy in policies:
            # ตรวจสอบว่านโยบายนี้มีผลบังคับใช้กับบทบาทและเซสชันของผู้ใช้หรือไม่
            roles = policy.applies_to_roles or []
            sessions = policy.applies_to_sessions or []
            
            applies_role = ("*" in roles) or (hrm_role in roles)
            applies_sess = ("*" in sessions) or (system_session_id in sessions)
            
            if not (applies_role and applies_sess):
                continue

            rules = policy.rules or {}
            restricted_topics = rules.get("restricted_topics", [])
            threshold = rules.get("semantic_threshold", 0.75)
            
            # ตรวจสอบความสอดคล้องทางความหมาย (Semantic check) + Keyword Match
            is_matched = False
            matched_topic = ""
            
            # Check keywords first
            for topic in restricted_topics:
                if topic in query:
                    is_matched = True
                    matched_topic = topic
                    break
            
            # Check semantic similarity
            if not is_matched and user_query_emb and vector_store_service.embedding_model:
                for topic in restricted_topics:
                    try:
                        topic_emb = vector_store_service.embedding_model.get_text_embedding(topic)
                        sim = cosine_similarity(user_query_emb, topic_emb)
                        if sim >= threshold:
                            is_matched = True
                            matched_topic = topic
                            print(f"🎯 [Guardrails] Semantic match detected! Query similarity to '{topic}' is {sim:.4f} (>= {threshold})")
                            break
                    except Exception as emb_err:
                        print(f"⚠️ [Guardrails] Embedding matching error: {emb_err}")

            if is_matched:
                print(f"🚨 [Guardrails] Matched Policy: '{policy.name}' for query: '{query}'")
                
                # ตรวจสอบข้อยกเว้นสำหรับข้อมูลของตัวเอง (own_data exception)
                if rules.get("exception") == "own_data" and emp_id:
                    # ตรวจสอบว่าเป็นการถามข้อมูลตัวเองหรือเปล่า
                    is_self = any(kw in query for kw in SELF_KEYWORDS)
                    # ตรวจสอบว่าไม่มีคำค้นหาของบุคคลอื่น
                    has_others = any(kw in query for kw in OTHERS_KEYWORDS)
                    
                    if is_self and not has_others:
                        print(f"🟢 [Guardrails] Own data access detected for employee {emp_id}. Allowing query with dynamic RAG filtering.")
                        # อนุญาตให้ถามได้ แต่ต้องกรอง RAG ให้เห็นเฉพาะข้อมูลตัวเอง
                        return {
                            "allowed": True, 
                            "reason": None, 
                            "severity": "allow", 
                            "filter_employee_email": user.email
                        }
                    else:
                        print(f"❌ [Guardrails] Query asks for sensitive data of others or organization. Blocking query.")
                        return {
                            "allowed": False,
                            "reason": f"คำขอของคุณถูกปฏิเสธเนื่องจากนโยบายความมั่นคงปลอดภัยของบริษัท: '{policy.name}' (คุณสามารถตรวจสอบได้เฉพาะข้อมูลของตนเองเท่านั้น)",
                            "severity": "block",
                            "filter_employee_email": None
                        }
                else:
                    # นโยบายไม่มีข้อยกเว้น หรือผู้ใช้ไม่มี employee_id -> บล็อกทันที
                    return {
                        "allowed": False,
                        "reason": f"คำขอของคุณถูกปฏิเสธเนื่องจากนโยบายความมั่นคงปลอดภัยของบริษัท: '{policy.name}'",
                        "severity": "block",
                        "filter_employee_email": None
                    }

        return {"allowed": True, "reason": None, "severity": "allow", "filter_employee_email": None}

    async def redact_pii(self, db: AsyncSession, text_content: str) -> str:
        """
        Layer 3: Output Guardrails - ปกปิดข้อมูล PII ที่หลุดออกมาจาก LLM
        """
        # ดึง active pii_filter policy จากฐานข้อมูล
        result = await db.execute(
            select(OrgPolicy).where(
                OrgPolicy.policy_type == "pii_filter",
                OrgPolicy.is_active == True
            )
        )
        policy = result.scalar_one_or_none()
        
        if not policy:
            return text_content
            
        rules = policy.rules or {}
        pii_types = rules.get("pii_types", [])
        
        redacted_text = text_content
        
        # 1. เลขบัตรประชาชน (13 หลัก) เช่น 1234567890123 หรือ 1-2345-67890-12-3
        if "id_card" in pii_types:
            # แบบไม่มีขีด
            redacted_text = re.sub(r'\b\d{13}\b', '[เลขบัตรประชาชนถูกปกปิด]', redacted_text)
            # แบบมีขีด
            redacted_text = re.sub(r'\b\d-\d{4}-\d{5}-\d{2}-\d\b', '[เลขบัตรประชาชนถูกปกปิด]', redacted_text)

        # 2. เบอร์โทรศัพท์ (10 หลักขึ้นด้วย 0 หรือมีขีด) เช่น 0812345678, 081-234-5678
        if "phone" in pii_types:
            # แบบไม่มีขีด 10 หลัก (เบอร์มือถือ/เบอร์บ้าน)
            redacted_text = re.sub(r'\b0[23456789]\d{8}\b', '[เบอร์โทรศัพท์ถูกปกปิด]', redacted_text)
            # แบบมีขีด เช่น 081-234-5678 หรือ 02-345-6789
            redacted_text = re.sub(r'\b0[23456789]\d-\d{3,4}-\d{4}\b', '[เบอร์โทรศัพท์ถูกปกปิด]', redacted_text)

        # 3. เลขบัญชีธนาคาร (10 หลักทั่วไป หรือมีขีด) เช่น 1234567890, 123-4-56789-0
        if "bank_account" in pii_types:
            # แบบไม่มีขีด 10 หลัก
            # (ตรวจสอบให้แน่ใจว่าไม่ชนกับเบอร์โทรศัพท์ด้วยการลบ Regex ซ้อนทับ)
            redacted_text = re.sub(r'\b[1-9]\d{9}\b', '[เลขบัญชีถูกปกปิด]', redacted_text)
            # แบบมีขีด เช่น 123-4-56789-0
            redacted_text = re.sub(r'\b\d{3}-\d-\d{5}-\d\b', '[เลขบัญชีถูกปกปิด]', redacted_text)

        return redacted_text

guardrails_service = GuardrailsService()
