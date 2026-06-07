from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import Department, Employee

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("")
def list_departments(db: Session = Depends(get_db)):
    result = db.execute(select(Department).order_by(Department.name))
    departments = result.scalars().all()

    data = []
    for dept in departments:
        count_result = db.execute(
            select(func.count()).where(Employee.department_id == dept.id)
        )
        employee_count = count_result.scalar() or 0

        data.append({
            "id": dept.id,
            "name": dept.name,
            "name_en": dept.name_en,
            "description": dept.description,
            "head_employee_id": dept.head_employee_id,
            "location": dept.location,
            "budget": dept.budget,
            "employee_count": employee_count,
            "updated_at": dept.updated_at.isoformat() if dept.updated_at else None,
        })

    return {"data": data, "total": len(data)}


@router.get("/{department_id}")
def get_department(department_id: str, db: Session = Depends(get_db)):
    result = db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if not dept:
        return {"error": "Department not found"}, 404

    count_result = db.execute(
        select(func.count()).where(Employee.department_id == dept.id)
    )
    employee_count = count_result.scalar() or 0

    return {
        "data": {
            "id": dept.id,
            "name": dept.name,
            "name_en": dept.name_en,
            "description": dept.description,
            "head_employee_id": dept.head_employee_id,
            "location": dept.location,
            "budget": dept.budget,
            "employee_count": employee_count,
            "updated_at": dept.updated_at.isoformat() if dept.updated_at else None,
        }
    }
