# -*- coding: utf-8 -*-
import sys
import os
import psycopg2
import sqlite3

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def run_sync_db_check():
    print("📡 Starting Sync DB Check...")
    
    # 1. อ่านข้อมูลจาก SQLite
    sqlite_db = "hrm_mock.db"
    print(f"Connecting to SQLite: {sqlite_db}")
    conn_sqlite = sqlite3.connect(sqlite_db)
    cursor = conn_sqlite.cursor()
    cursor.execute("SELECT id, employee_code, email FROM employees WHERE email = 'guyhnr123@gmail.com'")
    emp = cursor.fetchone()
    conn_sqlite.close()
    
    if not emp:
        print("❌ Employee 'guyhnr123@gmail.com' not found in SQLite hrm_mock.db!")
        return
    
    emp_uuid, emp_code, emp_email = emp
    print(f"Found employee in SQLite: Code={emp_code}, UUID={emp_uuid}, Email={emp_email}")
    
    # 2. เชื่อมต่อ PostgreSQL และอัปเดต
    pg_dsn = "postgresql://raguser:ragpass@localhost:5433/ragllm"
    print(f"Connecting to PostgreSQL: {pg_dsn}")
    
    try:
        conn_pg = psycopg2.connect(pg_dsn)
        cursor_pg = conn_pg.cursor()
        
        # ค้นหา user ในตาราง users
        cursor_pg.execute("SELECT id, username, email, employee_id, hrm_role FROM users WHERE email = %s", (emp_email,))
        user = cursor_pg.fetchone()
        
        if not user:
            print(f"❌ User '{emp_email}' not found in PostgreSQL backend DB!")
            conn_pg.close()
            return
            
        user_id, username, email, current_emp_id, current_role = user
        print(f"Found User in PostgreSQL: ID={user_id}, Username={username}, Current Employee ID={current_emp_id}, Role={current_role}")
        
        if current_emp_id != emp_uuid or current_role != "employee":
            print(f"Updating user {email} in PostgreSQL -> employee_id={emp_uuid}, hrm_role='employee'")
            cursor_pg.execute(
                "UPDATE users SET employee_id = %s, hrm_role = %s WHERE email = %s",
                (emp_uuid, 'employee', emp_email)
            )
            conn_pg.commit()
            print("✅ Database update completed successfully!")
        else:
            print("ℹ️ User mapping is already up-to-date. No action needed.")
            
        # ตรวจสอบหลังอัปเดต
        cursor_pg.execute("SELECT id, username, email, employee_id, hrm_role FROM users WHERE email = %s", (emp_email,))
        verified_user = cursor_pg.fetchone()
        print(f"Verified user state: employee_id={verified_user[3]}, hrm_role={verified_user[4]}")
        
        cursor_pg.close()
        conn_pg.close()
        
    except Exception as e:
        print(f"❌ Error connecting or updating PostgreSQL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_sync_db_check()
