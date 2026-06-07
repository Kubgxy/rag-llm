# -*- coding: utf-8 -*-
import asyncio
import sys
import os
import bcrypt
import psycopg2
import sqlite3

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.append(r"c:\my-project\rag-llm\backend")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def run_setup_and_sync():
    print("🚀 Starting User Setup and RAG Sync Process...")
    
    # 1. ค้นหาข้อมูลพนักงานจาก SQLite hrm_mock.db
    sqlite_db = r"c:\my-project\rag-llm\hrm_mock.db"
    print(f"📡 Connecting to SQLite: {sqlite_db}")
    conn_sqlite = sqlite3.connect(sqlite_db)
    cursor_sqlite = conn_sqlite.cursor()
    cursor_sqlite.execute("SELECT id, employee_code, email, first_name, last_name FROM employees WHERE email = 'guyhnr123@gmail.com'")
    emp = cursor_sqlite.fetchone()
    conn_sqlite.close()
    
    if not emp:
        print("❌ Employee 'guyhnr123@gmail.com' not found in SQLite hrm_mock.db!")
        return
    
    emp_uuid, emp_code, emp_email, first_name, last_name = emp
    print(f"Found employee in SQLite: Code={emp_code}, UUID={emp_uuid}, Name={first_name} {last_name}")
    
    # 2. เชื่อมต่อ PostgreSQL เพื่อตรวจสอบและสร้าง/อัปเดต User
    pg_dsn = "postgresql://raguser:ragpass@localhost:5433/ragllm"
    print(f"📡 Connecting to PostgreSQL: {pg_dsn}")
    
    try:
        conn_pg = psycopg2.connect(pg_dsn)
        cursor_pg = conn_pg.cursor()
        
        # ค้นหาว่ามี user นี้หรือยัง
        cursor_pg.execute("SELECT id, username, email, employee_id, hrm_role FROM users WHERE email = %s", (emp_email,))
        user = cursor_pg.fetchone()
        
        user_uuid = None
        password_plain = "tigerdev888"
        
        if not user:
            # สร้าง User ใหม่
            import uuid
            new_user_id = str(uuid.uuid4())
            pw_hash = hash_password(password_plain)
            username = "tigerdev888"
            
            print(f"📝 User not found. Creating new user '{username}' with email '{emp_email}' and password '{password_plain}'...")
            cursor_pg.execute(
                """INSERT INTO users (id, username, email, password_hash, display_name, role, is_active, employee_id, hrm_role, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())""",
                (new_user_id, username, emp_email, pw_hash, username, "user", True, emp_uuid, "employee")
            )
            conn_pg.commit()
            print("✅ User created successfully in PostgreSQL!")
            user_uuid = new_user_id
        else:
            user_uuid, username, email, current_emp_id, current_role = user
            print(f"ℹ️ User already exists: ID={user_uuid}, Username={username}, Current EmpID={current_emp_id}, Role={current_role}")
            
            # อัปเดตข้อมูลเชื่อมโยงถ้ายังไม่ตรง
            if current_emp_id != emp_uuid or current_role != "employee":
                print(f"📝 Updating user mapping -> employee_id={emp_uuid}, hrm_role='employee'")
                cursor_pg.execute(
                    "UPDATE users SET employee_id = %s, hrm_role = %s, updated_at = NOW() WHERE email = %s",
                    (emp_uuid, "employee", emp_email)
                )
                conn_pg.commit()
                print("✅ User mapping updated successfully!")
            else:
                print("ℹ️ User mapping is already up-to-date.")
        
        cursor_pg.close()
        conn_pg.close()
        
    except Exception as e:
        print(f"❌ Database Error: {e}")
        import traceback
        traceback.print_exc()
        return

    # 3. สั่ง Sync RAG ผ่าน SyncEngine.handle_webhook_event
    print("🔄 Triggering Incremental RAG Sync for employee...")
    try:
        from app.services.sync_engine import sync_engine
        
        # รัน webhook handler เพื่อซิงค์ข้อมูลพนักงานรายนี้ทันที
        print(f"Calling handle_webhook_event for employee ID: {emp_uuid}...")
        synced_docs = await sync_engine.handle_webhook_event(
            event="employee.updated",
            resource_id=emp_uuid,
            data={}
        )
        print(f"🎉 RAG Sync completed! Total document chunks synced/updated: {synced_docs}")
        
        # ตรวจสอบจำนวนข้อมูลในเวกเตอร์สโตร์ของ session 'hrm'
        from app.database import engine as pg_engine
        from sqlalchemy import text
        async with pg_engine.connect() as conn:
            r = await conn.execute(text(
                "SELECT count(*) FROM data_document_embeddings_store WHERE metadata_->>'session_id' = 'hrm' AND metadata_->>'resource_id' LIKE :emp_pattern"
            ), {"emp_pattern": f"%{emp_uuid}%"})
            count = r.scalar()
            print(f"📊 Vector store status: Found {count} embedding chunks for employee {emp_code} ({emp_uuid})")
            
    except Exception as e:
        print(f"❌ Error during RAG Sync: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_setup_and_sync())
