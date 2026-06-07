# -*- coding: utf-8 -*-
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from llama_index.core import Document

def transform_employee(emp: Dict[str, Any]) -> str:
    """แปลงข้อมูลพนักงานเป็นข้อความภาษาไทยเพื่อทำ RAG"""
    status_th = {
        "active": "ทำงานอยู่",
        "inactive": "พ้นสภาพพนักงาน",
        "suspended": "พักงาน",
        "terminated": "เลิกจ้าง",
        "resigned": "ลาออก"
    }.get(emp.get("status", ""), emp.get("status", ""))

    emp_type_th = {
        "full_time": "พนักงานประจำ (Full-time)",
        "part_time": "พนักงานพาร์ทไทม์ (Part-time)",
        "contract": "พนักงานสัญญาจ้าง (Contract)",
        "intern": "นักศึกษาฝึกงาน (Intern)"
    }.get(emp.get("employment_type", ""), emp.get("employment_type", ""))

    dep_name = emp.get("department", {}).get("name", "ไม่ระบุแผนก") if emp.get("department") else "ไม่ระบุแผนก"
    pos_title = emp.get("position", {}).get("title", "ไม่ระบุตำแหน่ง") if emp.get("position") else "ไม่ระบุตำแหน่ง"
    pos_level = emp.get("position", {}).get("level", "ไม่ระบุระดับ") if emp.get("position") else "ไม่ระบุระดับ"

    text = (
        f"ข้อมูลพนักงาน: {emp.get('first_name', '')} {emp.get('last_name', '')}\n"
        f"- รหัสพนักงาน: {emp.get('employee_code', 'ไม่มีรหัส')}\n"
        f"- ชื่อภาษาอังกฤษ: {emp.get('first_name_en', '')} {emp.get('last_name_en', '')}\n"
        f"- อีเมล: {emp.get('email', 'ไม่มีอีเมล')}\n"
        f"- เบอร์โทรศัพท์: {emp.get('phone', 'ไม่มีเบอร์โทร')}\n"
        f"- เพศ: {emp.get('gender', 'ไม่ระบุ')}\n"
        f"- แผนก/ฝ่าย: {dep_name}\n"
        f"- ตำแหน่งงาน: {pos_title} (ระดับ {pos_level})\n"
        f"- วันเริ่มงาน: {emp.get('hire_date', 'ไม่ระบุ')}\n"
        f"- ประเภทการจ้างงาน: {emp_type_th}\n"
        f"- สถานะการทำงาน: {status_th}\n"
    )
    if emp.get("manager_id"):
        text += f"- รหัสผู้จัดการ/หัวหน้างานโดยตรง (Manager ID): {emp.get('manager_id')}\n"
    return text

def transform_leave(leave: Dict[str, Any], emp_name: str, emp_email: str) -> str:
    """แปลงข้อมูลการลาของพนักงานเป็นข้อความภาษาไทย"""
    status_th = {
        "pending": "รออนุมัติ",
        "approved": "อนุมัติแล้ว",
        "rejected": "ปฏิเสธ",
        "cancelled": "ยกเลิก"
    }.get(leave.get("status", ""), leave.get("status", ""))

    raw_leave_type = leave.get("leave_type")
    if isinstance(raw_leave_type, dict):
        leave_type = raw_leave_type.get("name", "ไม่ระบุประเภท")
    elif isinstance(raw_leave_type, str):
        leave_type = raw_leave_type
    else:
        leave_type = f"ประเภท ID: {leave.get('leave_type_id', 'ไม่ระบุ')}"

    return (
        f"ประวัติการลาพนักงาน: {emp_name} (อีเมล: {emp_email})\n"
        f"- ประเภทการลา: {leave_type}\n"
        f"- วันที่เริ่มต้น: {leave.get('start_date', 'ไม่ระบุ')}\n"
        f"- วันที่สิ้นสุด: {leave.get('end_date', 'ไม่ระบุ')}\n"
        f"- จำนวนวันลา: {leave.get('days', 0)} วัน\n"
        f"- สถานะการอนุมัติ: {status_th}\n"
        f"- เหตุผลการลา: {leave.get('reason', 'ไม่ระบุ')}\n"
    )

def transform_leave_balance(balance: Dict[str, Any], emp_name: str, emp_email: str) -> str:
    """แปลงข้อมูลโควตาวันลาคงเหลือของพนักงาน"""
    text = f"โควตาวันลาและวันลาคงเหลือของพนักงาน: {emp_name} (อีเมล: {emp_email})\n"
    for item in balance.get("balances", []):
        text += (
            f"- ประเภทการลา: {item.get('leave_type', 'ไม่ระบุ')}\n"
            f"  * ได้สิทธิ์ทั้งหมด: {item.get('total_days', 0)} วัน\n"
            f"  * ใช้ไปแล้ว: {item.get('used_days', 0)} วัน\n"
            f"  * คงเหลือ: {item.get('remaining_days', 0)} วัน\n"
        )
    return text

def transform_attendance(att: Dict[str, Any], emp_name: str, emp_email: str) -> str:
    """แปลงบันทึกการเข้าออกงานของพนักงาน"""
    status_th = {
        "present": "ปกติ (ตรงเวลา)",
        "late": "เข้างานสาย",
        "absent": "ขาดงาน",
        "leave": "ลาหยุด",
        "half_day": "ลาครึ่งวัน"
    }.get(att.get("status", ""), att.get("status", ""))

    check_in = att.get("check_in") or "ไม่ได้บันทึก"
    check_out = att.get("check_out") or "ไม่ได้บันทึก"

    return (
        f"บันทึกเวลาเข้า-ออกงานพนักงาน: {emp_name} (อีเมล: {emp_email})\n"
        f"- วันที่: {att.get('date', 'ไม่ระบุ')}\n"
        f"- เวลาเข้างาน: {check_in}\n"
        f"- เวลาออกงาน: {check_out}\n"
        f"- สถานะการลงเวลา: {status_th}\n"
        f"- ชั่วโมงล่วงเวลา (OT): {att.get('overtime_hours', 0)} ชั่วโมง\n"
    )

def transform_salary(salary_data: Dict[str, Any]) -> str:
    """แปลงข้อมูลเงินเดือนของพนักงานเป็นข้อความ (ข้อมูล Sensitive)"""
    emp_name = salary_data.get("employee_name", "ไม่ระบุชื่อ")
    emp_code = salary_data.get("employee_code", "ไม่ระบุรหัส")
    year = salary_data.get("year", datetime.now().year)

    text = f"ข้อมูลเงินเดือนและค่าตอบแทนปี {year} ของพนักงาน: {emp_name} (รหัสพนักงาน: {emp_code})\n"
    for r in salary_data.get("records", []):
        text += (
            f"- เดือน {r.get('month', 'ไม่ระบุ')}:\n"
            f"  * เงินเดือนพื้นฐาน (Base Salary): {r.get('base_salary', 0):,} บาท\n"
            f"  * ค่าเบี้ยเลี้ยง/ค่าเดินทาง (Allowances): {r.get('allowances', 0):,} บาท\n"
            f"  * ค่าล่วงเวลา (Overtime Pay): {r.get('overtime_pay', 0):,} บาท\n"
            f"  * โบนัส (Bonus): {r.get('bonus', 0):,} บาท\n"
            f"  * ค่าหัก/หัก ณ ที่จ่าย (Deductions): {r.get('deductions', 0):,} บาท\n"
            f"  * ภาษี (Tax): {r.get('tax', 0):,} บาท\n"
            f"  * ประกันสังคม (Social Security): {r.get('social_security', 0):,} บาท\n"
            f"  * เงินเดือนสุทธิ (Net Salary): {r.get('net_salary', 0):,} บาท\n"
            f"  * วันที่จ่ายเงิน: {r.get('payment_date', 'ไม่ระบุ')}\n"
            f"  * สถานะการจ่ายเงิน: {r.get('payment_status', 'ไม่ระบุ')}\n"
        )
    return text

def transform_performance(perf_data: Dict[str, Any]) -> str:
    """แปลงข้อมูลประเมินผลการปฏิบัติงานของพนักงาน (ข้อมูล Sensitive)"""
    emp_name = perf_data.get("employee_name", "ไม่ระบุชื่อ")
    text = f"บันทึกการประเมินผลการปฏิบัติงานของพนักงาน: {emp_name}\n"
    for r in perf_data.get("reviews", []):
        text += (
            f"- รอบการประเมิน (Period): {r.get('review_period', 'ไม่ระบุ')}\n"
            f"  * คะแนนรวม (Overall Score): {r.get('overall_score', 0)} / 100\n"
            f"  * คะแนน KPI (KPI Score): {r.get('kpi_score', 0)} / 100\n"
            f"  * คะแนนสมรรถนะ (Competency Score): {r.get('competency_score', 0)} / 100\n"
            f"  * จุดเด่น (Strengths): {r.get('strengths', 'ไม่ระบุ')}\n"
            f"  * จุดที่ควรพัฒนา (Improvements): {r.get('improvements', 'ไม่ระบุ')}\n"
            f"  * เป้าหมายรอบถัดไป (Goals): {r.get('goals', 'ไม่ระบุ')}\n"
            f"  * สถานะการประเมิน: {r.get('status', 'ไม่ระบุ')}\n"
        )
    return text

def transform_policy(policy: Dict[str, Any]) -> str:
    """แปลงนโยบายบริษัทเป็นข้อความ RAG"""
    return (
        f"นโยบายบริษัทและกฎระเบียบองค์กร\n"
        f"- หัวข้อเรื่อง: {policy.get('title', '')}\n"
        f"- หมวดหมู่: {policy.get('category', 'ทั่วไป')}\n"
        f"- รายละเอียดนโยบาย:\n{policy.get('content', '')}\n"
    )

def transform_announcement(announcement: Dict[str, Any]) -> str:
    """แปลงประกาศบริษัทเป็นข้อความ RAG"""
    return (
        f"ประกาศของบริษัท ข่าวสารองค์กร\n"
        f"- หัวข้อเรื่อง: {announcement.get('title', '')}\n"
        f"- หมวดหมู่: {announcement.get('category', 'ทั่วไป')}\n"
        f"- เนื้อหาประกาศ:\n{announcement.get('content', '')}\n"
    )

def transform_benefit(benefit: Dict[str, Any]) -> str:
    """แปลงข้อมูลสวัสดิการของบริษัทเป็นข้อความ RAG"""
    return (
        f"สวัสดิการพนักงานบริษัท\n"
        f"- สวัสดิการเรื่อง: {benefit.get('name', '')}\n"
        f"- หมวดหมู่: {benefit.get('category', '')}\n"
        f"- รายละเอียดสวัสดิการ:\n{benefit.get('description', '')}\n"
        f"- รายละเอียดวงเงินความคุ้มครอง: {benefit.get('coverage_details', '')}\n"
        f"- สัดส่วนบริษัทสมทบ: {benefit.get('employer_contribution', '')}\n"
        f"- สัดส่วนพนักงานสมทบ/จ่ายร่วม: {benefit.get('employee_contribution', '')}\n"
    )

def json_to_document(resource_type: str, data: Dict[str, Any], session_id: str = "hrm") -> Optional[Document]:
    """แปลงข้อมูล JSON จาก HRM API เป็น llama_index Document พร้อมระบุ Metadata"""
    text = ""
    resource_id = f"{resource_type}_"
    file_name = f"hrm_{resource_type}"
    metadata = {
        "session_id": session_id,
        "source_type": "api",
        "resource_type": resource_type,
    }

    if resource_type == "employees":
        text = transform_employee(data)
        resource_id += str(data.get("id"))
        metadata["employee_email"] = data.get("email")
        metadata["employee_code"] = data.get("employee_code")
        file_name += f"_{data.get('employee_code')}"
    elif resource_type == "leaves":
        emp_name = data.get("employee_name", "ไม่ระบุชื่อ")
        emp_email = data.get("employee_email", "ไม่ระบุอีเมล")
        text = transform_leave(data, emp_name, emp_email)
        resource_id += str(data.get("id"))
        metadata["employee_email"] = emp_email
        file_name += f"_{data.get('id')}"
    elif resource_type == "leave_balance":
        emp_name = data.get("employee_name", "ไม่ระบุชื่อ")
        emp_email = data.get("employee_email", "ไม่ระบุอีเมล")
        text = transform_leave_balance(data, emp_name, emp_email)
        resource_id += f"balance_{data.get('employee_id')}"
        metadata["employee_email"] = emp_email
        file_name += f"_balance_{data.get('employee_id')}"
    elif resource_type == "attendance":
        emp_name = data.get("employee_name", "ไม่ระบุชื่อ")
        emp_email = data.get("employee_email", "ไม่ระบุอีเมล")
        text = transform_attendance(data, emp_name, emp_email)
        resource_id += str(data.get("id"))
        metadata["employee_email"] = emp_email
        file_name += f"_{data.get('id')}"
    elif resource_type == "salary":
        text = transform_salary(data)
        emp_id = data.get("employee_id")
        resource_id += str(emp_id)
        metadata["employee_email"] = data.get("employee_email")
        metadata["employee_code"] = data.get("employee_code")
        file_name += f"_{data.get('employee_code')}"
    elif resource_type == "performance":
        text = transform_performance(data)
        emp_id = data.get("employee_id")
        resource_id += str(emp_id)
        metadata["employee_email"] = data.get("employee_email")
        file_name += f"_{data.get('employee_id')}"
    elif resource_type == "policies":
        text = transform_policy(data)
        resource_id += str(data.get("id"))
        file_name += f"_{data.get('id')}"
    elif resource_type == "announcements":
        text = transform_announcement(data)
        resource_id += str(data.get("id"))
        file_name += f"_{data.get('id')}"
    elif resource_type == "benefits":
        text = transform_benefit(data)
        resource_id += str(data.get("id"))
        file_name += f"_{data.get('id')}"
    else:
        return None

    if not text.strip():
        return None

    metadata["resource_id"] = resource_id
    metadata["file_name"] = file_name
    metadata["page_label"] = "api"

    return Document(
        text=text,
        metadata=metadata
    )
