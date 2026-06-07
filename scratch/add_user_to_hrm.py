# -*- coding: utf-8 -*-
import sqlite3
import uuid
from datetime import datetime, date, timedelta
import sys

# Windows terminal UTF-8 encoding support
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def add_user_to_hrm():
    db_path = "hrm_mock.db"
    print(f"📡 Connecting to HRM Database: {db_path}...")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    email = "guyhnr123@gmail.com"
    username = "tigerdev888"

    # 1. Check if employee already exists
    cursor.execute("SELECT id, employee_code FROM employees WHERE email = ?", (email,))
    existing_emp = cursor.fetchone()
    if existing_emp:
        print(f"ℹ️ Employee with email '{email}' already exists. ID: {existing_emp['id']}, Code: {existing_emp['employee_code']}")
        conn.close()
        return

    # 2. Get Department (IT / เทคโนโลยีสารสนเทศ)
    cursor.execute("SELECT id, name FROM departments WHERE name LIKE '%เทคโนโลยี%' OR name_en LIKE '%IT%' LIMIT 1")
    dept = cursor.fetchone()
    if not dept:
        # Fallback to first department
        cursor.execute("SELECT id, name FROM departments LIMIT 1")
        dept = cursor.fetchone()
    
    dept_id = dept["id"]
    print(f"🏢 Mapped to Department: {dept['name']} (ID: {dept_id})")

    # 3. Get Position (Software Engineer / Developer / Senior Developer)
    cursor.execute("SELECT id, title FROM positions WHERE title LIKE '%Software%' OR title LIKE '%Developer%' OR title_en LIKE '%Developer%' LIMIT 1")
    pos = cursor.fetchone()
    if not pos:
        # Fallback to first position
        cursor.execute("SELECT id, title FROM positions LIMIT 1")
        pos = cursor.fetchone()
    
    pos_id = pos["id"]
    print(f"💼 Mapped to Position: {pos['title']} (ID: {pos_id})")

    # 4. Find a manager (Manager in the same department or any Manager)
    cursor.execute("SELECT id, first_name, last_name FROM employees WHERE department_id = ? AND id != ? LIMIT 1", (dept_id, ""))
    mgr = cursor.fetchone()
    if not mgr:
        cursor.execute("SELECT id, first_name, last_name FROM employees LIMIT 1")
        mgr = cursor.fetchone()
    
    manager_id = mgr["id"] if mgr else None
    print(f"👤 Mapped to Manager: {mgr['first_name'] if mgr else 'None'} {mgr['last_name'] if mgr else ''}")

    # 5. Insert into employees
    emp_id = str(uuid.uuid4())
    employee_code = "EMP-00151" # รหัสต่อจาก 150 คนแรก
    first_name = "เกียรติศักดิ์"
    last_name = "เสือพัฒนา"
    first_name_en = "Kiattisak"
    last_name_en = "Suapattana"
    phone = "089-888-8888"
    dob = "1995-08-08"
    gender = "male"
    national_id = "1-1008-88888-88-8"
    address = "88/8 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110"
    hire_date = "2023-01-15"
    bank_account = "888-8-88888-8"
    bank_name = "ธนาคารไทยพาณิชย์"
    tax_id = "1234567890123"
    social_security_id = "9876543210"

    print(f"📝 Inserting employee record for '{first_name} {last_name}'...")
    cursor.execute("""
        INSERT INTO employees (
            id, employee_code, first_name, last_name, first_name_en, last_name_en,
            email, phone, date_of_birth, gender, national_id, address,
            department_id, position_id, manager_id, hire_date, employment_type,
            status, probation_end_date, bank_account, bank_name, tax_id, social_security_id,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        emp_id, employee_code, first_name, last_name, first_name_en, last_name_en,
        email, phone, dob, gender, national_id, address,
        dept_id, pos_id, manager_id, hire_date, "full_time",
        "active", "2023-05-15", bank_account, bank_name, tax_id, social_security_id,
        datetime.now().isoformat(), datetime.now().isoformat()
    ))

    # 6. Insert into salary_records (May 2026)
    print("💵 Inserting salary record...")
    base_salary = 85000.0
    allowances = 5000.0
    ot_pay = 3500.0
    bonus = 12000.0
    deductions = 500.0
    tax = 2400.0
    social_sec = 750.0
    net_salary = base_salary + allowances + ot_pay + bonus - deductions - tax - social_sec
    payment_date = "2026-05-30"

    cursor.execute("""
        INSERT INTO salary_records (
            id, employee_id, month, year, base_salary, allowances, overtime_pay,
            bonus, deductions, tax, social_security, net_salary, payment_date,
            payment_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()), emp_id, 5, 2026, base_salary, allowances, ot_pay,
        bonus, deductions, tax, social_sec, net_salary, payment_date,
        "paid", datetime.now().isoformat(), datetime.now().isoformat()
    ))

    # 7. Insert into leave_balances & leave_records
    print("📅 Setting up leave balances and records...")
    cursor.execute("SELECT id, name_en FROM leave_types")
    leave_types = cursor.fetchall()
    
    annual_leave_id = None
    for lt in leave_types:
        lt_id = lt["id"]
        lt_name = lt["name_en"]
        
        # กำหนดบาลานซ์ตามประเภท
        total_days = 30
        used_days = 2
        
        if "annual" in lt_name.lower() or "vacation" in lt_name.lower():
            total_days = 12
            used_days = 3
            annual_leave_id = lt_id
        elif "sick" in lt_name.lower():
            total_days = 30
            used_days = 2
        elif "personal" in lt_name.lower():
            total_days = 6
            used_days = 1
            
        remaining_days = total_days - used_days
        cursor.execute("""
            INSERT INTO leave_balances (
                id, employee_id, leave_type_id, year, total_days, used_days, remaining_days, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), emp_id, lt_id, 2026, total_days, used_days, remaining_days, datetime.now().isoformat()
        ))

    # สร้างประวัติการลาพักร้อน 3 วันย้อนหลัง
    if annual_leave_id:
        cursor.execute("""
            INSERT INTO leave_records (
                id, employee_id, leave_type_id, start_date, end_date, days, reason,
                status, approved_by, approved_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), emp_id, annual_leave_id, "2026-04-15", "2026-04-17", 3.0,
            "พักผ่อนประจำปีกับครอบครัวที่ต่างจังหวัด", "approved", manager_id,
            "2026-04-10 10:00:00", datetime.now().isoformat(), datetime.now().isoformat()
        ))

    # 8. Insert into attendance_records (ลงเวลาเข้างานย้อนหลัง 5 วันทำการ)
    print("⏰ Inserting attendance records...")
    today = date.today()
    for i in range(1, 7):
        d = today - timedelta(days=i)
        # ข้ามเสาร์-อาทิตย์
        if d.weekday() >= 5:
            continue
        
        clock_in = datetime(d.year, d.month, d.day, 8, 20 + i) # 8:21 - 8:26
        clock_out = datetime(d.year, d.month, d.day, 17, 30 + i * 2) # 17:32 - 17:42
        
        cursor.execute("""
            INSERT INTO attendance_records (
                id, employee_id, date, clock_in, clock_out, status, overtime_hours, note, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), emp_id, d.isoformat(), clock_in.isoformat(), clock_out.isoformat(),
            "present", 0.0, None, datetime.now().isoformat(), datetime.now().isoformat()
        ))

    # 9. Insert into performance_reviews
    print("📊 Inserting performance review record...")
    cursor.execute("""
        INSERT INTO performance_reviews (
            id, employee_id, reviewer_id, review_period, overall_score, kpi_score,
            competency_score, strengths, improvements, goals, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()), emp_id, manager_id, "2025-H2", 4.7, 4.8, 4.6,
        "มีความเข้าใจในเทคโนโลยีระบบ RAG และ LLM อย่างลึกซึ้ง พัฒนาระบบได้อย่างรวดเร็วและเป็นมืออาชีพ มีความสามารถในการแก้ไขปัญหาที่ท้าทายได้ดี",
        "ศึกษาและเรียนรู้ระบบ Agile Project Management เพิ่มเติมเพื่อช่วยประสานงานในโครงการที่มีความทับซ้อนสูงได้ดียิ่งขึ้น",
        "นำทีมพัฒนาและติดตั้งระบบ RAG Enterprise Search เพื่ออำนวยความสะดวกให้ฝ่ายบริการลูกค้าให้เสร็จสิ้นใน Q3 2026",
        "approved", datetime.now().isoformat(), datetime.now().isoformat()
    ))

    # 10. Insert into employee_benefits
    cursor.execute("SELECT id FROM benefit_plans WHERE is_active = 1 LIMIT 2")
    plans = cursor.fetchall()
    print("🎁 Enrolling in employee benefit plans...")
    for p in plans:
        cursor.execute("""
            INSERT INTO employee_benefits (
                id, employee_id, benefit_plan_id, enrolled_date, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), emp_id, p["id"], "2023-02-01", "active", datetime.now().isoformat()
        ))

    conn.commit()
    print(f"🎉 Successfully inserted guyhnr123@gmail.com into HRM Database with Employee Code: {employee_code}!")
    conn.close()

if __name__ == "__main__":
    add_user_to_hrm()
