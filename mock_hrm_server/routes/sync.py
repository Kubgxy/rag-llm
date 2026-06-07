from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import (
    Employee, LeaveRecord, AttendanceRecord, SalaryRecord,
    PerformanceReview, Policy, Announcement,
)

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.get("/changes")
def get_changes(
    since: str = Query(..., description="ISO datetime string — ดึงข้อมูลที่อัปเดตหลังเวลานี้"),
    resource_types: Optional[str] = Query(
        default=None,
        description="comma-separated: employees,leaves,attendance,policies,announcements"
    ),
    db: Session = Depends(get_db),
):
    """
    Incremental sync endpoint — ดึงเฉพาะข้อมูลที่มีการเปลี่ยนแปลงหลัง timestamp ที่กำหนด
    """
    since_dt = datetime.fromisoformat(since)
    types = resource_types.split(",") if resource_types else [
        "employees", "leaves", "attendance", "policies", "announcements"
    ]

    changes = {}

    if "employees" in types:
        result = db.execute(
            select(Employee).where(Employee.updated_at >= since_dt).limit(500)
        )
        emps = result.scalars().all()
        changes["employees"] = {
            "count": len(emps),
            "data": [{
                "id": e.id, "employee_code": e.employee_code,
                "first_name": e.first_name, "last_name": e.last_name,
                "email": e.email, "department_id": e.department_id,
                "position_id": e.position_id, "status": e.status,
                "updated_at": e.updated_at.isoformat(),
            } for e in emps]
        }

    if "leaves" in types:
        result = db.execute(
            select(LeaveRecord).where(LeaveRecord.updated_at >= since_dt).limit(500)
        )
        leaves = result.scalars().all()
        changes["leaves"] = {
            "count": len(leaves),
            "data": [{
                "id": r.id, "employee_id": r.employee_id,
                "leave_type_id": r.leave_type_id,
                "start_date": str(r.start_date), "end_date": str(r.end_date),
                "days": r.days, "status": r.status,
                "updated_at": r.updated_at.isoformat(),
            } for r in leaves]
        }

    if "attendance" in types:
        result = db.execute(
            select(AttendanceRecord).where(AttendanceRecord.updated_at >= since_dt).limit(500)
        )
        atts = result.scalars().all()
        changes["attendance"] = {
            "count": len(atts),
            "data": [{
                "id": a.id, "employee_id": a.employee_id,
                "date": str(a.date), "status": a.status,
                "overtime_hours": a.overtime_hours,
                "updated_at": a.updated_at.isoformat(),
            } for a in atts]
        }

    if "policies" in types:
        result = db.execute(
            select(Policy).where(Policy.updated_at >= since_dt).limit(100)
        )
        pols = result.scalars().all()
        changes["policies"] = {
            "count": len(pols),
            "data": [{
                "id": p.id, "title": p.title, "category": p.category,
                "content": p.content,
                "updated_at": p.updated_at.isoformat(),
            } for p in pols]
        }

    if "announcements" in types:
        result = db.execute(
            select(Announcement).where(Announcement.updated_at >= since_dt).limit(100)
        )
        anns = result.scalars().all()
        changes["announcements"] = {
            "count": len(anns),
            "data": [{
                "id": a.id, "title": a.title,
                "content": a.content, "category": a.category,
                "updated_at": a.updated_at.isoformat(),
            } for a in anns]
        }

    total_changes = sum(v["count"] for v in changes.values())
    return {
        "since": since,
        "total_changes": total_changes,
        "changes": changes,
    }


@router.get("/status")
def sync_status(db: Session = Depends(get_db)):
    """ข้อมูลสถานะสำหรับ sync client"""
    from sqlalchemy import func
    emp_count = db.execute(select(func.count()).select_from(Employee)).scalar() or 0
    leave_count = db.execute(select(func.count()).select_from(LeaveRecord)).scalar() or 0
    att_count = db.execute(select(func.count()).select_from(AttendanceRecord)).scalar() or 0
    policy_count = db.execute(select(func.count()).select_from(Policy)).scalar() or 0

    return {
        "status": "healthy",
        "record_counts": {
            "employees": emp_count,
            "leave_records": leave_count,
            "attendance_records": att_count,
            "policies": policy_count,
        },
        "server_time": datetime.utcnow().isoformat(),
    }
