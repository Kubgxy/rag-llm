# -*- coding: utf-8 -*-
import asyncio
import sys
import uuid
import httpx
from httpx import AsyncClient, ASGITransport

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(r"c:\my-project\rag-llm\backend")

async def test_guardrails_pipeline():
    print("🧪 [Test] Starting integration tests for RBAC + Guardrails AI Security Pipeline...")
    
    from app.main import app
    from app.database import engine
    from sqlalchemy import text
    from app.services.llm_service import llm_service

    # Mock llm_service.query_with_context เพื่อหลีกเลี่ยงการรันโมเดลจริงบน CPU ซึ่งช้าและอาจทำให้ timeout
    async def mock_query_with_context(
        query, session_id, model_name, search_query=None, top_k=None, 
        selected_files=None, memory_context="", filter_employee_email=None
    ):
        print(f"🔮 [Mock LLM Service] Received query: '{query}' | Filter email: '{filter_employee_email}'")
        
        # สำหรับกรณี regular employee ถามเงินเดือนตัวเอง
        if "เงินเดือนของฉัน" in query:
            # คืนค่าข้อมูลจำลองที่มีข้อมูล PII ปนอยู่ด้วย เพื่อให้ทดสอบ Output Redaction (Layer 3) ได้ในตัว
            return {
                "answer": "เงินเดือนสุทธิของคุณคือ 50,000 บาท (จ่ายเข้าบัญชีธนาคารเลขที่ 123-4-56789-0 เบอร์โทรฉุกเฉินของคุณคือ 081-234-5678)",
                "thinking": "[Mocked RAG Retrieval]",
                "citations": [
                    {
                        "file_name": "hrm_salary",
                        "page_label": "api",
                        "text_snippet": "Salary record for somchai.wongprasert@company.com",
                        "similarity_score": 1.0,
                        "source_type": "api",
                        "url": None
                    }
                ]
            }
            
        # สำหรับกรณี HR staff ถามเงินเดือนพนักงานคนอื่น
        if "ข้อมูลอัตราเงินเดือน" in query:
            return {
                "answer": "เงินเดือนของพนักงาน สมชาย วงศ์ประเสริฐ คือ 45,000 บาท ได้รับการจ่ายเรียบร้อยแล้ว",
                "thinking": "[Mocked HR Admin RAG]",
                "citations": [
                    {
                        "file_name": "hrm_salary",
                        "page_label": "api",
                        "text_snippet": "Salary record for somchai.wongprasert@company.com",
                        "similarity_score": 1.0,
                        "source_type": "api",
                        "url": None
                    }
                ]
            }
            
        return {
            "answer": f"นี่คือข้อมูลตอบกลับจากระบบสำหรับคำถาม: '{query}'",
            "thinking": "[Mocked General Retrieval]",
            "citations": []
        }
        
    llm_service.query_with_context = mock_query_with_context
    print("🔮 [Mock] Successfully patched llm_service.query_with_context with secure mock function.")

    # ดึงรายชื่อพนักงานจาก mock HRM server เพื่อดึง email ของพนักงานทั่วไป และ HR admin
    hrm_url = "http://127.0.0.1:8001/api/hrm"
    print(f"📡 Querying employees list from Mock HRM Server ({hrm_url})...")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{hrm_url}/employees", params={"limit": 50})
            if resp.status_code != 200:
                print(f"❌ Cannot connect to Mock HRM Server. Status: {resp.status_code}")
                return
            
            employees = resp.json().get("data", [])
            print(f"Fetched {len(employees)} employees from Mock HRM Server.")
        except Exception as conn_err:
            print(f"❌ Failed to connect to Mock HRM Server: {conn_err}")
            print("Please ensure Mock HRM Server is running at http://localhost:8001")
            return

    # คัดแยกพนักงาน
    employee_emp = None
    hr_emp = None
    
    for emp in employees:
        dept = emp.get("department", {})
        dept_name = dept.get("name", "") if dept else ""
        
        # เลือกพนักงานทั่วไปที่ไม่ใช่ฝ่าย HR
        if not employee_emp and "ทรัพยากรบุคคล" not in dept_name and "hr" not in dept_name.lower():
            employee_emp = emp
        # เลือกพนักงานในฝ่าย HR
        if not hr_emp and ("ทรัพยากรบุคคล" in dept_name or "hr" in dept_name.lower()):
            hr_emp = emp

    if not employee_emp or not hr_emp:
        print("❌ Could not select suitable test employees from Mock HRM server seed data.")
        return

    print(f"\nSelected Employee for Test:")
    print(f"- Regular Employee: {employee_emp.get('first_name')} {employee_emp.get('last_name')} ({employee_emp.get('email')}) in {employee_emp.get('department', {}).get('name')}")
    print(f"- HR Employee: {hr_emp.get('first_name')} {hr_emp.get('last_name')} ({hr_emp.get('email')}) in {hr_emp.get('department', {}).get('name')}")

    # ทำความสะอาดข้อมูล test users ในตาราง users เพื่อป้องกันปัญหา 400 Bad Request ตอน Register
    print(f"\n🧹 Cleaning up test users in RAG database...")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM users WHERE email IN (:email1, :email2)"), {
            "email1": employee_emp["email"],
            "email2": hr_emp["email"]
        })
    print("Cleanup completed.")

    # เริ่มทดสอบ API
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        
        # Helper: ฟังก์ชันสมัครและล็อกอินผู้ใช้
        async def register_and_login(username, email, password):
            # register
            await ac.post("/auth/register", json={
                "username": username,
                "email": email,
                "password": password
            })
            # login
            login_resp = await ac.post("/auth/login", json={
                "username": username,
                "password": password
            })
            tokens = login_resp.json()
            return tokens.get("access_token")

        # 1. สมัครและเข้าสู่ระบบด้วยสิทธิ์พนักงานทั่วไป
        print("\n1. Logging in as Regular Employee...")
        emp_token = await register_and_login(
            username=f"emp_{uuid.uuid4().hex[:6]}",
            email=employee_emp["email"],
            password="password123"
        )
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        print("Employee login successful.")

        # 2. สมัครและเข้าสู่ระบบด้วยสิทธิ์ HR Admin
        print("\n2. Logging in as HR Staff...")
        hr_token = await register_and_login(
            username=f"hr_{uuid.uuid4().hex[:6]}",
            email=hr_emp["email"],
            password="password123"
        )
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        print("HR staff login successful.")

        # 3. สร้างห้องแชทประเภท system ('hrm') สำหรับพนักงานทั่วไป
        print("\n3. Creating System Chat Session for Regular Employee...")
        chat_sess_resp = await ac.post("/sessions", headers=emp_headers, json={
            "title": "Regular Employee Chat",
            "session_type": "system",
            "model_name": "scb10x/typhoon2.5-qwen3-4b",
            "system_session_id": "hrm"
        })
        assert chat_sess_resp.status_code == 200, chat_sess_resp.text
        emp_session_id = chat_sess_resp.json().get("id")
        print(f"Created Session ID: {emp_session_id}")

        # 4. ทดสอบความมั่นคงปลอดภัย Layer 1 & 2: ตรวจสอบ Input Semantic & RBAC
        # 4.1 พนักงานทั่วไปถามเรื่องเงินเดือนพนักงานคนอื่น (ควรโดนบล็อก!)
        print("\n4.1 [Test Block] Regular Employee asks for someone else's salary...")
        blocked_query = f"เงินเดือนของ {hr_emp['first_name']} {hr_emp['last_name']} เท่าไหร่"
        print(f"Question: {blocked_query}")
        
        chat_resp = await ac.post("/chat/single", headers=emp_headers, json={
            "query": blocked_query,
            "model_name": "scb10x/typhoon2.5-qwen3-4b",
            "session_id": emp_session_id
        })
        print(f"Status Code: {chat_resp.status_code}")
        assert chat_resp.status_code == 200
        chat_result = chat_resp.json()
        print(f"AI Thinking Block: {chat_result.get('thinking')}")
        print(f"AI Response Answer: {chat_result.get('answer')}")
        assert "นโยบายความมั่นคงปลอดภัย" in chat_result.get("answer") or "ถูกปฏิเสธ" in chat_result.get("answer"), "Salary of others query was not blocked!"
        print("✅ Success: Employee was blocked from asking about another employee's salary.")

        # 4.2 พนักงานทั่วไปถามเรื่องเงินเดือนตนเอง (ควรผ่านและตอบได้!)
        print("\n4.2 [Test Allow] Regular Employee asks for their own salary...")
        allow_query = "เงินเดือนของฉันเท่าไหร่และมีข้อมูลการจ่ายเงินอย่างไรบ้าง"
        print(f"Question: {allow_query}")
        
        chat_resp = await ac.post("/chat/single", headers=emp_headers, json={
            "query": allow_query,
            "model_name": "scb10x/typhoon2.5-qwen3-4b",
            "session_id": emp_session_id
        })
        print(f"Status Code: {chat_resp.status_code}")
        assert chat_resp.status_code == 200
        chat_result = chat_resp.json()
        print(f"AI Response Answer: {chat_result.get('answer')[:120]}...")
        # ผลลัพธ์ต้องไม่ขึ้นคำแจ้งเตือนบล็อก
        assert "นโยบายความมั่นคงปลอดภัย" not in chat_result.get("answer"), "Own salary query was blocked!"
        print("✅ Success: Employee was allowed to ask for their own salary.")

        # 5. ทดสอบสิทธิ์ HR Admin
        # HR Admin ถามเงินเดือนของพนักงานคนแรก (ควรผ่าน!)
        print("\n5. [Test HR Role Allow] HR Staff asks for another employee's salary...")
        hr_chat_resp = await ac.post("/sessions", headers=hr_headers, json={
            "title": "HR Chat",
            "session_type": "system",
            "model_name": "scb10x/typhoon2.5-qwen3-4b",
            "system_session_id": "hrm"
        })
        hr_session_id = hr_chat_resp.json().get("id")
        
        hr_query = f"ข้อมูลอัตราเงินเดือนและการจ่ายของ {employee_emp['first_name']} {employee_emp['last_name']} เป็นอย่างไร"
        print(f"Question: {hr_query}")
        
        chat_resp = await ac.post("/chat/single", headers=hr_headers, json={
            "query": hr_query,
            "model_name": "scb10x/typhoon2.5-qwen3-4b",
            "session_id": hr_session_id
        })
        print(f"Status Code: {chat_resp.status_code}")
        assert chat_resp.status_code == 200
        chat_result = chat_resp.json()
        print(f"AI Response Answer: {chat_result.get('answer')[:120]}...")
        assert "นโยบายความมั่นคงปลอดภัย" not in chat_result.get("answer"), "HR staff was blocked!"
        print("✅ Success: HR staff was allowed to access another employee's salary.")

        # 6. ทดสอบ Layer 3: Output Guardrails (PII Masking)
        # ตรวจสอบการทำ PII redact โดยสร้างคำตอบของระบบที่มีข้อมูลเบอร์โทรหรือเลขบัตรประชาชน
        print("\n6. [Test PII Redaction] Querying policies or other records to verify PII Masking...")
        
        from app.services.guardrails_service import guardrails_service
        from app.database import async_session
        
        raw_text_with_pii = (
            f"พนักงาน {employee_emp['first_name']} เบอร์โทรคือ {employee_emp['phone']} "
            f"และเลขประจำตัวบัตรประชาชนคือ 1-2345-67890-12-3 เลขบัญชีธนาคารคือ 123-4-56789-0"
        )
        print(f"Raw text with PII: {raw_text_with_pii}")
        
        async with async_session() as db:
            redacted_text = await guardrails_service.redact_pii(db, raw_text_with_pii)
            
        print(f"Redacted text: {redacted_text}")
        assert "[เบอร์โทรศัพท์ถูกปกปิด]" in redacted_text
        assert "[เลขบัตรประชาชนถูกปกปิด]" in redacted_text
        assert "[เลขบัญชีถูกปกปิด]" in redacted_text
        print("✅ Success: Sensitive PII data was successfully masked by Output Guardrails.")

        print("\n🎉 [Test] All Guardrails and RBAC tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_guardrails_pipeline())
