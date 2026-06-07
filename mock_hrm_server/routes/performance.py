from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mock_hrm_server.database import get_db
from mock_hrm_server.models import PerformanceReview, Employee

API_KEY = "hrm-mock-api-key-2026"

router = APIRouter(prefix="/performance", tags=["Performance (Sensitive)"])


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key — performance data requires authentication")
    return True


@router.get("/{employee_id}")
def get_performance(
    employee_id: str,
    _auth: bool = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    emp_result = db.execute(select(Employee).where(Employee.id == employee_id))
    emp = emp_result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = db.execute(
        select(PerformanceReview)
        .where(PerformanceReview.employee_id == employee_id)
        .order_by(PerformanceReview.review_period.desc())
    )
    reviews = result.scalars().all()

    return {
        "data": {
            "employee_id": employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "reviews": [{
                "review_period": r.review_period,
                "overall_score": r.overall_score,
                "kpi_score": r.kpi_score,
                "competency_score": r.competency_score,
                "strengths": r.strengths,
                "improvements": r.improvements,
                "goals": r.goals,
                "status": r.status,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            } for r in reviews]
        }
    }
