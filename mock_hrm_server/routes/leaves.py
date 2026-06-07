from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mock_hrm_server.database import get_db
from mock_hrm_server.models import LeaveRecord, LeaveBalance, LeaveType, Employee

router = APIRouter(prefix="/leaves", tags=["Leaves"])


@router.get("")
def list_leaves(
    employee_id: Optional[str] = None,
    leave_type_id: Optional[str] = None,
    status: Optional[str] = None,
    updated_since: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = select(LeaveRecord).options(
        selectinload(LeaveRecord.employee),
        selectinload(LeaveRecord.leave_type),
    )

    if employee_id:
        query = query.where(LeaveRecord.employee_id == employee_id)
    if leave_type_id:
        query = query.where(LeaveRecord.leave_type_id == leave_type_id)
    if status:
        query = query.where(LeaveRecord.status == status)
    if updated_since:
        since = datetime.fromisoformat(updated_since)
        query = query.where(LeaveRecord.updated_at >= since)

    query = query.order_by(LeaveRecord.start_date.desc()).limit(limit).offset(offset)
    result = db.execute(query)
    records = result.scalars().all()

    return {
        "data": [_serialize_leave(r) for r in records],
        "total": len(records),
    }


@router.get("/types")
def list_leave_types(db: Session = Depends(get_db)):
    result = db.execute(select(LeaveType))
    types = result.scalars().all()
    return {
        "data": [{
            "id": lt.id,
            "name": lt.name,
            "name_en": lt.name_en,
            "description": lt.description,
            "max_days_per_year": lt.max_days_per_year,
            "is_paid": lt.is_paid,
            "requires_approval": lt.requires_approval,
        } for lt in types]
    }


@router.get("/balance/{employee_id}")
def get_leave_balance(employee_id: str, year: int = 2026, db: Session = Depends(get_db)):
    result = db.execute(
        select(LeaveBalance)
        .where(LeaveBalance.employee_id == employee_id, LeaveBalance.year == year)
        .options(selectinload(LeaveBalance.leave_type))
    )
    balances = result.scalars().all()

    # Get employee name
    emp_result = db.execute(select(Employee).where(Employee.id == employee_id))
    emp = emp_result.scalar_one_or_none()
    if not emp:
        return {"error": "Employee not found"}, 404

    return {
        "data": {
            "employee_id": employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "year": year,
            "balances": [{
                "leave_type": b.leave_type.name if b.leave_type else "Unknown",
                "leave_type_en": b.leave_type.name_en if b.leave_type else "Unknown",
                "total_days": b.total_days,
                "used_days": b.used_days,
                "remaining_days": b.remaining_days,
            } for b in balances]
        }
    }


def _serialize_leave(r: LeaveRecord) -> dict:
    return {
        "id": r.id,
        "employee_id": r.employee_id,
        "employee_name": f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
        "leave_type": r.leave_type.name if r.leave_type else None,
        "start_date": str(r.start_date),
        "end_date": str(r.end_date),
        "days": r.days,
        "reason": r.reason,
        "status": r.status,
        "approved_by": r.approved_by,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
