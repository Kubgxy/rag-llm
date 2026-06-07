# -*- coding: utf-8 -*-
import asyncio
import logging
from datetime import datetime, timezone
import httpx
from typing import Dict, Any, List, Optional
import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter

from app.database import async_session, engine
from app.db_models import SystemSession, SyncHistory
from app.services.vector_store import vector_store_service, thai_tokenizer
from app.services.data_transformer import json_to_document

logger = logging.getLogger("sync_engine")

HRM_BASE_URL = "http://127.0.0.1:8001/api/hrm"
HRM_API_KEY = "hrm-mock-api-key-2026"
HRM_WEBHOOK_SECRET = "hrm-webhook-secret-2026"
SYSTEM_SESSION_ID = "hrm"

class SyncEngine:
    """Sync Engine สำหรับดึงข้อมูลจาก Mock HRM Server เข้าสู่ pgvector RAG"""

    def __init__(self):
        self.base_url = HRM_BASE_URL
        self.api_key = HRM_API_KEY
        self.webhook_secret = HRM_WEBHOOK_SECRET

    async def init_system_session(self):
        """ตรวจสอบและสร้าง System Session ในฐานข้อมูลหากยังไม่มี"""
        async with async_session() as db:
            result = await db.execute(
                select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
            )
            session = result.scalar_one_or_none()
            
            if not session:
                session = SystemSession(
                    id=SYSTEM_SESSION_ID,
                    name="🏢 HR Management",
                    description="ระบบถามตอบข้อมูลบุคคล พนักงาน วันลา วันเข้างาน นโยบาย และประกาศองค์กร",
                    icon="users",
                    data_source_type="api",
                    data_source_config={
                        "base_url": self.base_url,
                        "endpoints": ["employees", "leaves", "attendance", "policies", "announcements", "benefits"]
                    },
                    sync_interval_minutes=60,
                    sync_status="idle",
                    is_active=True
                )
                db.add(session)
                await db.commit()
                logger.info(f"✅ [SyncEngine] สร้าง System Session '{SYSTEM_SESSION_ID}' เรียบร้อย")
            else:
                logger.info(f"ℹ️ [SyncEngine] System Session '{SYSTEM_SESSION_ID}' มีอยู่แล้ว")

    async def fetch_with_retry(self, url: str, headers: Dict[str, str], method: str = "GET", json_body: Optional[Dict] = None) -> Dict[str, Any]:
        """เรียก API ปลายทาง พร้อมระบบ Retry 3 ครั้งและหน่วงเวลา 5 วินาทีหากล้มเหลว"""
        max_retries = 3
        delay = 5.0
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(1, max_retries + 1):
                try:
                    if method.upper() == "POST":
                        resp = await client.post(url, headers=headers, json=json_body)
                    else:
                        resp = await client.get(url, headers=headers)
                    
                    resp.raise_for_status()
                    return resp.json()
                except (httpx.HTTPStatusError, httpx.RequestError) as e:
                    logger.warning(f"⚠️ [SyncEngine] API Error ที่ {url} (ครั้งที่ {attempt}/{max_retries}): {e}")
                    if attempt == max_retries:
                        raise e
                    await asyncio.sleep(delay)
            raise Exception("API Request failed after max retries")

    async def register_webhook_on_hrm(self):
        """ลงทะเบียน Webhook URL ไปยัง Mock HRM API Server"""
        url = f"{self.base_url}/webhook/register"
        # URL ของ RAG backend ที่จะใช้รับ webhook
        webhook_url = "http://localhost:8000/api/webhook/hrm"
        payload = {
            "url": webhook_url,
            "events": ["*"],
            "secret": self.webhook_secret
        }
        headers = {"Content-Type": "application/json"}
        
        try:
            res = await self.fetch_with_retry(url, headers, method="POST", json_body=payload)
            logger.info(f"✅ [SyncEngine] ลงทะเบียน Webhook สำเร็จ: {res}")
            return True
        except Exception as e:
            logger.error(f"❌ [SyncEngine] ไม่สามารถลงทะเบียน Webhook บน HRM Server ได้: {e}")
            return False

    async def delete_resource_embeddings(self, resource_id: str):
        """ลบ embeddings ของ resource เฉพาะตัวเพื่อหลีกเลี่ยงการสร้างข้อมูลซ้ำ"""
        # ลบจากทั้ง data_document_embeddings และ data_document_embeddings_store (เพื่อความปลอดภัยหาก LlamaIndex ใช้ตารางไหน)
        tables = ["data_document_embeddings", "data_document_embeddings_store"]
        async with engine.connect() as conn:
            for table in tables:
                try:
                    # ตรวจสอบว่ามีตารางนี้อยู่จริงก่อนรัน query
                    table_exists = await conn.execute(text(
                        f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table}')"
                    ))
                    if table_exists.scalar():
                        result = await conn.execute(
                            text(f"DELETE FROM {table} WHERE metadata_->>'session_id' = :session_id AND metadata_->>'resource_id' = :resource_id"),
                            {"session_id": SYSTEM_SESSION_ID, "resource_id": resource_id}
                        )
                        await conn.commit()
                        logger.debug(f"🗑️ [SyncEngine] ลบ embeddings จาก {table} สำเร็จ (รหัส {resource_id}, ลบไป {result.rowcount} แถว)")
                except Exception as e:
                    logger.error(f"⚠️ [SyncEngine] เกิดข้อผิดพลาดขณะลบ embeddings ใน {table}: {e}")

    async def run_full_sync(self):
        """รัน Full Sync ดึงข้อมูลใหม่ทั้งหมดและเคลียร์ข้อมูลเดิม"""
        logger.info("⚡ [SyncEngine] เริ่มต้น Full Sync ข้อมูลจาก HRM API...")
        
        # 1. อัปเดตสถานะใน SystemSession เป็น syncing
        async with async_session() as db:
            result = await db.execute(
                select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
            )
            session = result.scalar_one_or_none()
            if not session:
                logger.error("❌ ไม่พบข้อมูล SystemSession 'hrm'")
                return
            session.sync_status = "syncing"
            await db.commit()

        # สร้าง Log ใน SyncHistory
        history_id = uuid.uuid4()
        history = SyncHistory(
            id=history_id,
            system_session_id=SYSTEM_SESSION_ID,
            sync_type="full",
            status="running",
            started_at=datetime.utcnow()
        )
        async with async_session() as db:
            db.add(history)
            await db.commit()

        headers = {"X-API-Key": self.api_key}
        docs = []
        synced_count = 0

        try:
            # 2. ดึงข้อมูลทีละประเภท
            # 2.1 พนักงาน (Employees) + รายละเอียด sensitive
            emp_res = await self.fetch_with_retry(f"{self.base_url}/employees?limit=500", headers)
            employees = emp_res.get("data", [])
            logger.info(f"👥 ดึงข้อมูลพนักงานได้ {len(employees)} คน. กำลังดึงข้อมูลสวัสดิการ/เงินเดือน/ผลงานรายบุคคล...")
            
            for emp in employees:
                # พนักงานแต่ละคน
                doc_emp = json_to_document("employees", emp)
                if doc_emp:
                    docs.append(doc_emp)
                    synced_count += 1
                
                emp_id = emp.get("id")
                emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                emp_email = emp.get("email", "")
                
                # เงินเดือนรายบุคคล (ต้องใช้ API Key)
                try:
                    salary_res = await self.fetch_with_retry(f"{self.base_url}/salary/{emp_id}", headers)
                    salary_data = salary_res.get("data", {})
                    salary_data["employee_email"] = emp_email
                    doc_sal = json_to_document("salary", salary_data)
                    if doc_sal:
                        docs.append(doc_sal)
                        synced_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ ไม่สามารถดึงข้อมูลเงินเดือนของพนักงาน {emp_name}: {e}")

                # ประเมินผลงาน (ต้องใช้ API Key)
                try:
                    perf_res = await self.fetch_with_retry(f"{self.base_url}/performance/{emp_id}", headers)
                    perf_data = perf_res.get("data", {})
                    perf_data["employee_email"] = emp_email
                    doc_perf = json_to_document("performance", perf_data)
                    if doc_perf:
                        docs.append(doc_perf)
                        synced_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ ไม่สามารถดึงข้อมูลประเมินผลงานของพนักงาน {emp_name}: {e}")

                # โควตาวันลาคงเหลือ
                try:
                    balance_res = await self.fetch_with_retry(f"{self.base_url}/leaves/balance/{emp_id}", headers)
                    balance_data = balance_res.get("data", {})
                    balance_data["employee_name"] = emp_name
                    balance_data["employee_email"] = emp_email
                    doc_bal = json_to_document("leave_balance", balance_data)
                    if doc_bal:
                        docs.append(doc_bal)
                        synced_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ ไม่สามารถดึงข้อมูลโควตาวันลาพนักงาน {emp_name}: {e}")

            # 2.2 ประวัติการลาทั้งหมด (Leaves)
            leaves_res = await self.fetch_with_retry(f"{self.base_url}/leaves?limit=500", headers)
            for item in leaves_res.get("data", []):
                doc_leave = json_to_document("leaves", item)
                if doc_leave:
                    docs.append(doc_leave)
                    synced_count += 1

            # 2.3 บันทึกเข้าออกงาน (Attendance)
            att_res = await self.fetch_with_retry(f"{self.base_url}/attendance?limit=500", headers)
            for item in att_res.get("data", []):
                doc_att = json_to_document("attendance", item)
                if doc_att:
                    docs.append(doc_att)
                    synced_count += 1

            # 2.4 นโยบายบริษัท (Policies)
            pol_res = await self.fetch_with_retry(f"{self.base_url}/policies", headers)
            for item in pol_res.get("data", []):
                doc_pol = json_to_document("policies", item)
                if doc_pol:
                    docs.append(doc_pol)
                    synced_count += 1

            # 2.5 ประกาศองค์กร (Announcements)
            ann_res = await self.fetch_with_retry(f"{self.base_url}/announcements", headers)
            for item in ann_res.get("data", []):
                doc_ann = json_to_document("announcements", item)
                if doc_ann:
                    docs.append(doc_ann)
                    synced_count += 1

            # 2.6 สวัสดิการพนักงาน (Benefits)
            ben_res = await self.fetch_with_retry(f"{self.base_url}/benefits", headers)
            for item in ben_res.get("data", []):
                doc_ben = json_to_document("benefits", item)
                if doc_ben:
                    docs.append(doc_ben)
                    synced_count += 1

            # 3. ลบ Embeddings เดิมของ session 'hrm' ออกก่อน
            logger.info("🗑️ กำลังล้างข้อมูล Embeddings เดิมของระบบ 'hrm'...")
            vector_store_service.delete_session_embeddings(SYSTEM_SESSION_ID)

            # 4. แปลงและบันทึกลง pgvector ผ่าน LlamaIndex
            if docs:
                logger.info(f"🔍 กำลังสร้าง embeddings และอัปเดตลงฐานข้อมูล ({len(docs)} chunks)...")
                storage_context = vector_store_service.get_session_storage(SYSTEM_SESSION_ID, for_sync=True)
                splitter = SentenceSplitter(chunk_size=1500, chunk_overlap=150, tokenizer=thai_tokenizer)
                nodes = splitter.get_nodes_from_documents(docs)
                
                # สร้าง VectorStoreIndex (LlamaIndex จะรัน embedding อัตโนมัติและเก็บลง pgvector)
                VectorStoreIndex(
                    nodes=nodes,
                    storage_context=storage_context
                )
                
                # ขยายและบันทึก BM25 nodes สำหรับ keyword search
                try:
                    vector_store_service.extend_bm25_nodes(SYSTEM_SESSION_ID, nodes)
                    logger.info("✅ [BM25] อัปเดต Keyword Index สำเร็จ")
                except Exception as e:
                    logger.error(f"⚠️ [BM25] ไม่สามารถสร้างหรืออัปเดต BM25 Index: {e}")

            # 5. สรุปความสำเร็จ
            async with async_session() as db:
                # อัปเดตสถานะของ session
                sess_result = await db.execute(
                    select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
                )
                session = sess_result.scalar_one_or_none()
                if session:
                    session.sync_status = "idle"
                    session.last_synced_at = datetime.utcnow()
                
                # อัปเดตสถานะประวัติการ sync
                hist_result = await db.execute(
                    select(SyncHistory).where(SyncHistory.id == history_id)
                )
                hist = hist_result.scalar_one_or_none()
                if hist:
                    hist.status = "success"
                    hist.records_synced = synced_count
                    hist.completed_at = datetime.utcnow()
                
                await db.commit()

            logger.info(f"🎉 [SyncEngine] รัน Full Sync สำเร็จ! ซิงค์ทั้งหมด {synced_count} ข้อมูล")
            return synced_count

        except Exception as e:
            logger.error(f"❌ [SyncEngine] เกิดข้อผิดพลาดระหว่างรัน Full Sync: {e}")
            # กรณีพัง ให้เซฟประวัติเป็น error
            async with async_session() as db:
                sess_result = await db.execute(
                    select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
                )
                session = sess_result.scalar_one_or_none()
                if session:
                    session.sync_status = "error"
                
                hist_result = await db.execute(
                    select(SyncHistory).where(SyncHistory.id == history_id)
                )
                hist = hist_result.scalar_one_or_none()
                if hist:
                    hist.status = "error"
                    hist.error_message = str(e)
                    hist.completed_at = datetime.utcnow()
                
                await db.commit()
            raise e

    async def run_incremental_sync(self):
        """รัน Incremental Sync ดึงเฉพาะข้อมูลอัปเดตใหม่"""
        # เช็ควันเวลา sync ล่าสุด
        async with async_session() as db:
            result = await db.execute(
                select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
            )
            session = result.scalar_one_or_none()
            if not session:
                logger.error("❌ ไม่พบ SystemSession 'hrm'")
                return
            
            since = session.last_synced_at
            
        if not since:
            logger.info("ℹ️ ไม่พบวันเวลาซิงค์ล่าสุด เริ่มต้นทำ Full Sync แทน...")
            return await self.run_full_sync()

        logger.info(f"⚡ [SyncEngine] เริ่มต้น Incremental Sync ตั้งแต่: {since.isoformat()}...")
        
        # ปรับสถานะเป็น syncing
        async with async_session() as db:
            result = await db.execute(
                select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
            )
            session = result.scalar_one_or_none()
            if session:
                session.sync_status = "syncing"
                await db.commit()

        # สร้าง Log ใน SyncHistory
        history_id = uuid.uuid4()
        history = SyncHistory(
            id=history_id,
            system_session_id=SYSTEM_SESSION_ID,
            sync_type="incremental",
            status="running",
            started_at=datetime.utcnow()
        )
        async with async_session() as db:
            db.add(history)
            await db.commit()

        headers = {"X-API-Key": self.api_key}
        synced_count = 0
        docs = []

        try:
            # เรียก endpoint sync/changes
            url = f"{self.base_url}/sync/changes?since={since.isoformat()}"
            changes_res = await self.fetch_with_retry(url, headers)
            changes = changes_res.get("changes", {})
            total_changes = changes_res.get("total_changes", 0)

            logger.info(f"📦 พบข้อมูลที่เปลี่ยนแปลงทั้งหมด: {total_changes} รายการ")

            # วนลูปจัดการการเปลี่ยนแปลงแต่ละประเภท
            for resource_type, change_info in changes.items():
                data_list = change_info.get("data", [])
                for item in data_list:
                    # 1. ลบ embeddings เก่าของข้อมูลชิ้นนี้ก่อน
                    resource_id = f"{resource_type}_{item.get('id')}"
                    if resource_type == "employees":
                        # ถ้าเป็นพนักงาน ต้องลบข้อมูลเงินเดือน ประเมินผล และวันลาคงเหลือของคนนั้นด้วย
                        await self.delete_resource_embeddings(f"employees_{item.get('id')}")
                        await self.delete_resource_embeddings(f"salary_{item.get('id')}")
                        await self.delete_resource_embeddings(f"performance_{item.get('id')}")
                        await self.delete_resource_embeddings(f"leave_balance_{item.get('id')}")
                        
                        # จากนั้นดึงและแปลงข้อมูลพนักงาน
                        doc_emp = json_to_document("employees", item)
                        if doc_emp:
                            docs.append(doc_emp)
                            synced_count += 1
                        
                        # ดึงข้อมูลเพิ่มเติมและเพิ่มเข้าไปในคิว
                        emp_id = item.get("id")
                        emp_email = item.get("email")
                        emp_name = f"{item.get('first_name', '')} {item.get('last_name', '')}"
                        
                        try:
                            # เงินเดือน
                            salary_res = await self.fetch_with_retry(f"{self.base_url}/salary/{emp_id}", headers)
                            salary_data = salary_res.get("data", {})
                            salary_data["employee_email"] = emp_email
                            doc_sal = json_to_document("salary", salary_data)
                            if doc_sal:
                                docs.append(doc_sal)
                                synced_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️ [Incremental] ไม่สามารถดึงเงินเดือนพนักงาน {emp_name}: {e}")

                        try:
                            # ผลงาน
                            perf_res = await self.fetch_with_retry(f"{self.base_url}/performance/{emp_id}", headers)
                            perf_data = perf_res.get("data", {})
                            perf_data["employee_email"] = emp_email
                            doc_perf = json_to_document("performance", perf_data)
                            if doc_perf:
                                docs.append(doc_perf)
                                synced_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️ [Incremental] ไม่สามารถดึงประเมินผลพนักงาน {emp_name}: {e}")

                        try:
                            # โควตาวันลาคงเหลือ
                            balance_res = await self.fetch_with_retry(f"{self.base_url}/leaves/balance/{emp_id}", headers)
                            balance_data = balance_res.get("data", {})
                            balance_data["employee_name"] = emp_name
                            balance_data["employee_email"] = emp_email
                            doc_bal = json_to_document("leave_balance", balance_data)
                            if doc_bal:
                                docs.append(doc_bal)
                                synced_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️ [Incremental] ไม่สามารถดึงวันลาคงเหลือพนักงาน {emp_name}: {e}")
                    else:
                        # ข้อมูลประเภทอื่นๆ ลบอันเก่าแล้วดึงใหม่ปกติ
                        await self.delete_resource_embeddings(resource_id)
                        doc = json_to_document(resource_type, item)
                        if doc:
                            docs.append(doc)
                            synced_count += 1

            # 2. ทำ Embedding และอัปเดตลง Vector Store
            if docs:
                logger.info(f"🔍 [Incremental] กำลังอัปเดต embeddings ({len(docs)} chunks)...")
                storage_context = vector_store_service.get_session_storage(SYSTEM_SESSION_ID, for_sync=True)
                splitter = SentenceSplitter(chunk_size=1500, chunk_overlap=150, tokenizer=thai_tokenizer)
                nodes = splitter.get_nodes_from_documents(docs)
                
                # อัปเดตลงเวกเตอร์สโตร์
                VectorStoreIndex(
                    nodes=nodes,
                    storage_context=storage_context
                )
                
                # Rebuild BM25 เพื่อความถูกต้อง (เพราะมีการอัปเดต nodes)
                try:
                    vector_store_service._rebuild_bm25_from_db(SYSTEM_SESSION_ID)
                    logger.info("✅ [BM25] ทำการ Rebuild Keyword Index สำเร็จ")
                except Exception as e:
                    logger.error(f"⚠️ [BM25] ล้มเหลวในการ Rebuild BM25: {e}")

            # 3. อัปเดตข้อมูลเสร็จสิ้น
            async with async_session() as db:
                sess_result = await db.execute(
                    select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
                )
                session = sess_result.scalar_one_or_none()
                if session:
                    session.sync_status = "idle"
                    session.last_synced_at = datetime.utcnow()
                
                hist_result = await db.execute(
                    select(SyncHistory).where(SyncHistory.id == history_id)
                )
                hist = hist_result.scalar_one_or_none()
                if hist:
                    hist.status = "success"
                    hist.records_synced = synced_count
                    hist.completed_at = datetime.utcnow()
                
                await db.commit()

            logger.info(f"🎉 [SyncEngine] รัน Incremental Sync สำเร็จ! จำนวนข้อมูลอัปเดต: {synced_count}")
            return synced_count

        except Exception as e:
            logger.error(f"❌ [SyncEngine] เกิดข้อผิดพลาดระหว่างรัน Incremental Sync: {e}")
            async with async_session() as db:
                sess_result = await db.execute(
                    select(SystemSession).where(SystemSession.id == SYSTEM_SESSION_ID)
                )
                session = sess_result.scalar_one_or_none()
                if session:
                    session.sync_status = "error"
                
                hist_result = await db.execute(
                    select(SyncHistory).where(SyncHistory.id == history_id)
                )
                hist = hist_result.scalar_one_or_none()
                if hist:
                    hist.status = "error"
                    hist.error_message = str(e)
                    hist.completed_at = datetime.utcnow()
                
                await db.commit()
            raise e

    async def handle_webhook_event(self, event: str, resource_id: str, data: Dict[str, Any]):
        """รับเหตุการณ์การเปลี่ยนแปลงทันทีจาก Webhook"""
        logger.info(f"📥 [SyncEngine Webhook] ได้รับ Event: {event} | ID: {resource_id}")
        
        # แปลงชื่อ event เช่น 'employee.updated' -> 'employees'
        resource_type = event.split(".")[0]
        # เพื่อความเป็นระเบียบแปลงรูปพหูพจน์ให้ตรงกับ schema
        if resource_type == "employee":
            resource_type = "employees"
        elif resource_type == "leave":
            resource_type = "leaves"

        headers = {"X-API-Key": self.api_key}
        docs = []

        try:
            # 1. จัดการแยกประเภท
            if resource_type == "employees":
                # เคลียร์ข้อมูลเดิมที่เกี่ยวกับพนักงานคนนี้
                await self.delete_resource_embeddings(f"employees_{resource_id}")
                await self.delete_resource_embeddings(f"salary_{resource_id}")
                await self.delete_resource_embeddings(f"performance_{resource_id}")
                await self.delete_resource_embeddings(f"leave_balance_{resource_id}")

                # ดึงข้อมูลใหม่
                emp_res = await self.fetch_with_retry(f"{self.base_url}/employees/{resource_id}", headers)
                emp = emp_res.get("data", {})
                doc_emp = json_to_document("employees", emp)
                if doc_emp:
                    docs.append(doc_emp)

                # ดึงเงินเดือน ประเมินผล และโควตาวันลาใหม่
                emp_email = emp.get("email", "")
                emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                
                try:
                    salary_res = await self.fetch_with_retry(f"{self.base_url}/salary/{resource_id}", headers)
                    sal_data = salary_res.get("data", {})
                    sal_data["employee_email"] = emp_email
                    doc_sal = json_to_document("salary", sal_data)
                    if doc_sal:
                        docs.append(doc_sal)
                except Exception as e:
                    logger.warning(f"⚠️ Webhook ไม่สามารถซิงค์เงินเดือนพนักงาน {resource_id}: {e}")

                try:
                    perf_res = await self.fetch_with_retry(f"{self.base_url}/performance/{resource_id}", headers)
                    perf_data = perf_res.get("data", {})
                    perf_data["employee_email"] = emp_email
                    doc_perf = json_to_document("performance", perf_data)
                    if doc_perf:
                        docs.append(doc_perf)
                except Exception as e:
                    logger.warning(f"⚠️ Webhook ไม่สามารถซิงค์ข้อมูลประเมินผลงานพนักงาน {resource_id}: {e}")

                try:
                    balance_res = await self.fetch_with_retry(f"{self.base_url}/leaves/balance/{resource_id}", headers)
                    bal_data = balance_res.get("data", {})
                    bal_data["employee_name"] = emp_name
                    bal_data["employee_email"] = emp_email
                    doc_bal = json_to_document("leave_balance", bal_data)
                    if doc_bal:
                        docs.append(doc_bal)
                except Exception as e:
                    logger.warning(f"⚠️ Webhook ไม่สามารถซิงค์โควตาวันลาพนักงาน {resource_id}: {e}")

            else:
                # ลบและดึงข้อมูลใหม่สำหรับโมเดลอื่นๆ (leaves, attendance, policies, announcements)
                await self.delete_resource_embeddings(f"{resource_type}_{resource_id}")
                
                # เรียก HRM endpoint เฉพาะตัวเพื่อเอา data ล่าสุด
                # leaves: /leaves/{id}, policies: /policies/{id} etc.
                url_map = {
                    "leaves": f"{self.base_url}/leaves", # endpoints อาจจะไม่มี list detail แต่ใช้ search ได้
                    "attendance": f"{self.base_url}/attendance",
                    "policies": f"{self.base_url}/policies",
                    "announcements": f"{self.base_url}/announcements",
                }
                
                # ดึงแบบ specific ถ้ามีข้อมูลใน payload webhook, หรือพยายามเรียก API
                if data:
                    doc = json_to_document(resource_type, data)
                    if doc:
                        docs.append(doc)
                elif resource_type in url_map:
                    # ถ้าไม่มี payload ให้ query จาก endpoint โดยกรองด้วย resource_id/parameter
                    # สำหรับตัวนี้ เนื่องจากเป็น API mock ขนาดเล็ก การ sync changes ทั่วไปจะผ่าน payload อยู่แล้ว
                    pass

            # 2. อัปเดตลงเวกเตอร์สโตร์
            if docs:
                logger.info(f"🔍 [Webhook] อัปเดต embeddings สำหรับ {resource_type}_{resource_id}...")
                storage_context = vector_store_service.get_session_storage(SYSTEM_SESSION_ID, for_sync=True)
                splitter = SentenceSplitter(chunk_size=1500, chunk_overlap=150, tokenizer=thai_tokenizer)
                nodes = splitter.get_nodes_from_documents(docs)
                
                VectorStoreIndex(
                    nodes=nodes,
                    storage_context=storage_context
                )
                
                # Rebuild BM25
                try:
                    vector_store_service._rebuild_bm25_from_db(SYSTEM_SESSION_ID)
                    logger.info("✅ [BM25 Webhook] ทำการ Rebuild Keyword Index สำเร็จ")
                except Exception as e:
                    logger.error(f"⚠️ [BM25 Webhook] ล้มเหลวในการ Rebuild BM25: {e}")

            # บันทึกประวัติ
            history = SyncHistory(
                id=uuid.uuid4(),
                system_session_id=SYSTEM_SESSION_ID,
                sync_type="webhook",
                status="success",
                records_synced=len(docs),
                completed_at=datetime.utcnow()
            )
            async with async_session() as db:
                db.add(history)
                await db.commit()
                
            logger.info("🎉 [SyncEngine Webhook] ประมวลผลเหตุการณ์เสร็จสมบูรณ์")
            return len(docs)
            
        except Exception as e:
            logger.error(f"❌ [SyncEngine Webhook] ไม่สามารถประมวลผล Webhook ได้: {e}")
            history = SyncHistory(
                id=uuid.uuid4(),
                system_session_id=SYSTEM_SESSION_ID,
                sync_type="webhook",
                status="error",
                error_message=str(e),
                completed_at=datetime.utcnow()
            )
            async with async_session() as db:
                db.add(history)
                await db.commit()
            raise e

# Singleton instance
sync_engine = SyncEngine()
