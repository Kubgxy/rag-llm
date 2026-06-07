import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.db_models import User
from app.config import settings

class RBACService:
    """Service สำหรับจัดการ Role-Based Access Control และเชื่อมโยงผู้ใช้กับ HRM API"""

    def __init__(self):
        # ดึง URL จาก config หากไม่มีให้ใช้ default
        self.hrm_base_url = "http://127.0.0.1:8001/api/hrm"

    async def get_or_sync_employee_id(self, db: AsyncSession, user: User) -> tuple[str | None, str]:
        """
        ดึงหรือซิงค์ employee_id และ hrm_role ของผู้ใช้กับ HRM API ด้วย email
        
        Returns:
            tuple[employee_id, hrm_role]
        """
        # 1. หากผู้ใช้มีข้อมูล employee_id และ hrm_role อยู่แล้วในระบบ
        if user.employee_id and user.hrm_role:
            return user.employee_id, user.hrm_role

        # 2. หากยังไม่มีข้อมูล ให้ค้นหาจาก HRM API ด้วย email
        try:
            print(f"🔍 [RBAC] Syncing user '{user.email}' with HRM Server...")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.hrm_base_url}/employees",
                    params={"search": user.email}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    employees = result.get("data", [])
                    
                    # ค้นหาคนที่มี email ตรงกันเป๊ะๆ
                    matching_emp = None
                    for emp in employees:
                        if emp.get("email", "").lower() == user.email.lower():
                            matching_emp = emp
                            break
                    
                    if matching_emp:
                        emp_id = matching_emp.get("id")
                        dept_name = matching_emp.get("department", {}).get("name", "") if matching_emp.get("department") else ""
                        
                        # กำหนด hrm_role: หากแผนกเป็น HR ให้สิทธิ์ hr_admin นอกนั้นเป็น employee
                        # (สำหรับผู้ใช้ที่มี email ระดับแอดมินหรือใน seed data ของ RAG อาจถูกระบุเป็นอย่างอื่นได้)
                        hrm_role = "employee"
                        if (
                            "hr" in dept_name.lower() or 
                            "human resources" in dept_name.lower() or 
                            "ทรัพยากรบุคคล" in dept_name or 
                            user.role == "admin"
                        ):
                            hrm_role = "hr_admin"
                        
                        # อัปเดตข้อมูลลงฐานข้อมูล
                        print(f"   Mapped user {user.email} to Employee ID: {emp_id}, Role: {hrm_role}")
                        await db.execute(
                            update(User)
                            .where(User.id == user.id)
                            .values(employee_id=emp_id, hrm_role=hrm_role)
                        )
                        await db.commit()
                        
                        # อัปเดต attribute ใน memory object ของ sqlalchemy ด้วย
                        user.employee_id = emp_id
                        user.hrm_role = hrm_role
                        return emp_id, hrm_role
                    else:
                        print(f"⚠️ [RBAC] No employee found with email {user.email} in HRM Server.")
                else:
                    print(f"❌ [RBAC] Failed to query HRM employees API. Status: {response.status_code}")
        except Exception as e:
            print(f"❌ [RBAC Error] Error syncing employee data: {str(e)}")

        # Fallback หรือหากไม่พบข้อมูลใน HRM
        # ให้ hrm_role ตาม RAG role หรือ fallback เป็น employee
        fallback_role = "employee"
        if user.role == "admin":
            fallback_role = "admin"
        return None, fallback_role

    def is_hr_or_admin(self, hrm_role: str) -> bool:
        """ตรวจสอบว่าเป็น HR หรือ Admin หรือไม่"""
        return hrm_role in ["hr_admin", "admin"]

rbac_service = RBACService()
