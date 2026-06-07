from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mock_hrm_server.database import get_db
from mock_hrm_server.models import SalaryRecord, Employee

API_KEY = "hrm-mock-api-key-2026"

router = APIRouter(prefix="/salary", tags=["Salary (Sensitive)"])


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key — salary data requires authentication")
    return True


@router.get("/{employee_id}")
def get_salary(
    employee_id: str,
    year: int = 2026,
    _auth: bool = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    # Get employee info
    emp_result = db.execute(select(Employee).where(Employee.id == employee_id))
    emp = emp_result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = db.execute(
        select(SalaryRecord)
        .where(SalaryRecord.employee_id == employee_id, SalaryRecord.year == year)
        .order_by(SalaryRecord.month.desc())
    )
    records = result.scalars().all()

    return {
        "data": {
            "employee_id": employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "employee_code": emp.employee_code,
            "year": year,
            "records": [{
                "month": r.month,
                "year": r.year,
                "base_salary": r.base_salary,
                "allowances": r.allowances,
                "overtime_pay": r.overtime_pay,
                "bonus": r.bonus,
                "deductions": r.deductions,
                "tax": r.tax,
                "social_security": r.social_security,
                "net_salary": r.net_salary,
                "payment_date": str(r.payment_date) if r.payment_date else None,
                "payment_status": r.payment_status,
            } for r in records]
        }
    }
