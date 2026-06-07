from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mock_hrm_server.database import get_db
from mock_hrm_server.models import AttendanceRecord, Employee

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("")
def list_attendance(
    employee_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    updated_since: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = select(AttendanceRecord).options(selectinload(AttendanceRecord.employee))

    if employee_id:
        query = query.where(AttendanceRecord.employee_id == employee_id)
    if date_from:
        query = query.where(AttendanceRecord.date >= datetime.fromisoformat(date_from).date())
    if date_to:
        query = query.where(AttendanceRecord.date <= datetime.fromisoformat(date_to).date())
    if status:
        query = query.where(AttendanceRecord.status == status)
    if updated_since:
        since = datetime.fromisoformat(updated_since)
        query = query.where(AttendanceRecord.updated_at >= since)

    query = query.order_by(AttendanceRecord.date.desc()).limit(limit).offset(offset)
    result = db.execute(query)
    records = result.scalars().all()

    return {
        "data": [{
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            "date": str(r.date),
            "clock_in": r.clock_in.isoformat() if r.clock_in else None,
            "clock_out": r.clock_out.isoformat() if r.clock_out else None,
            "status": r.status,
            "overtime_hours": r.overtime_hours,
            "note": r.note,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        } for r in records],
        "total": len(records),
    }
