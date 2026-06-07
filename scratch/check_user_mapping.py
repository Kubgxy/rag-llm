# -*- coding: utf-8 -*-
import asyncio
import sys
import os

sys.path.append(r"c:\my-project\rag-llm\backend")

async def update_user_mapping():
    log_file = r"c:\my-project\rag-llm\scratch\user_mapping_status.txt"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("=== STARTING USER MAPPING UPDATE ===\n")
        try:
            from app.database import engine
            from sqlalchemy import text
            import sqlite3
            
            # 1. Query employee_id from SQLite hrm_mock.db
            sqlite_db = r"c:\my-project\rag-llm\hrm_mock.db"
            f.write(f"Connecting to SQLite: {sqlite_db}\n")
            conn_sqlite = sqlite3.connect(sqlite_db)
            cursor = conn_sqlite.cursor()
            cursor.execute("SELECT id, employee_code, email FROM employees WHERE email = 'guyhnr123@gmail.com'")
            emp = cursor.fetchone()
            conn_sqlite.close()
            
            if not emp:
                f.write("❌ Employee 'guyhnr123@gmail.com' not found in SQLite hrm_mock.db!\n")
                print("Employee not found in SQLite")
                return
            
            emp_uuid = emp[0]
            emp_code = emp[1]
            f.write(f"Found employee in SQLite: Code={emp_code}, UUID={emp_uuid}\n")
            
            # 2. Update user in PostgreSQL
            async with engine.connect() as conn:
                # Check if user exists
                r = await conn.execute(
                    text("SELECT id, username, email, employee_id, hrm_role FROM users WHERE email = 'guyhnr123@gmail.com'")
                )
                user = r.fetchone()
                if not user:
                    f.write("❌ User 'guyhnr123@gmail.com' not found in PostgreSQL backend DB!\n")
                    print("User not found in Postgres")
                    return
                
                user_id, username, email, current_emp_id, current_role = user
                f.write(f"Found User in PostgreSQL: ID={user_id}, Username={username}, Current Employee ID={current_emp_id}, Role={current_role}\n")
                
                # Update if empty or incorrect
                if current_emp_id != emp_uuid or current_role != "employee":
                    f.write(f"Updating user {email} -> employee_id={emp_uuid}, hrm_role='employee'\n")
                    await conn.execute(
                        text("UPDATE users SET employee_id = :emp_id, hrm_role = :role WHERE email = 'guyhnr123@gmail.com'"),
                        {"emp_id": emp_uuid, "role": "employee"}
                    )
                    await conn.commit()
                    f.write("✅ Database update completed successfully!\n")
                else:
                    f.write("ℹ️ User mapping is already up-to-date. No action needed.\n")
                
                # Double check
                r_verify = await conn.execute(
                    text("SELECT id, username, email, employee_id, hrm_role FROM users WHERE email = 'guyhnr123@gmail.com'")
                )
                verified_user = r_verify.fetchone()
                f.write(f"Verified user state in PostgreSQL: employee_id={verified_user[3]}, hrm_role={verified_user[4]}\n")
                print(f"Success: employee_id={verified_user[3]}, hrm_role={verified_user[4]}")
                
        except Exception as e:
            f.write(f"❌ Error occurred: {str(e)}\n")
            import traceback
            traceback.print_exc(file=f)
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(update_user_mapping())
