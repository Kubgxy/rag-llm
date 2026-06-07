from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mock_hrm_server.database import get_db
from mock_hrm_server.models import Employee, Department, Position

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("")
def list_employees(
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    updated_since: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = select(Employee).options(
        selectinload(Employee.department),
        selectinload(Employee.position),
    )

    if department_id:
        query = query.where(Employee.department_id == department_id)
    if status:
        query = query.where(Employee.status == status)
    if search:
        query = query.where(
            (Employee.first_name.contains(search)) |
            (Employee.last_name.contains(search)) |
            (Employee.email.contains(search)) |
            (Employee.employee_code.contains(search))
        )
    if updated_since:
        since = datetime.fromisoformat(updated_since)
        query = query.where(Employee.updated_at >= since)

    query = query.order_by(Employee.employee_code).limit(limit).offset(offset)
    result = db.execute(query)
    employees = result.scalars().all()

    return {
        "data": [_serialize_employee(e) for e in employees],
        "total": len(employees),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{employee_id}")
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    result = db.execute(
        select(Employee).where(Employee.id == employee_id)
        .options(selectinload(Employee.department), selectinload(Employee.position))
    )
    emp = result.scalar_one_or_none()
    if not emp:
        return {"error": "Employee not found"}, 404
    return {"data": _serialize_employee(emp)}


def _serialize_employee(emp: Employee) -> dict:
    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "first_name_en": emp.first_name_en,
        "last_name_en": emp.last_name_en,
        "email": emp.email,
        "phone": emp.phone,
        "gender": emp.gender,
        "department": {
            "id": emp.department.id,
            "name": emp.department.name,
            "name_en": emp.department.name_en,
        } if emp.department else None,
        "position": {
            "id": emp.position.id,
            "title": emp.position.title,
            "title_en": emp.position.title_en,
            "level": emp.position.level,
        } if emp.position else None,
        "hire_date": str(emp.hire_date) if emp.hire_date else None,
        "employment_type": emp.employment_type,
        "status": emp.status,
        "manager_id": emp.manager_id,
        "updated_at": emp.updated_at.isoformat() if emp.updated_at else None,
    }
