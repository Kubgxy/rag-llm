from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import BenefitPlan

router = APIRouter(prefix="/benefits", tags=["Benefits"])


@router.get("")
def list_benefits(db: Session = Depends(get_db)):
    result = db.execute(select(BenefitPlan).where(BenefitPlan.is_active == True))
    plans = result.scalars().all()

    return {
        "data": [{
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "coverage_details": p.coverage_details,
            "employer_contribution": p.employer_contribution,
            "employee_contribution": p.employee_contribution,
            "is_active": p.is_active,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        } for p in plans],
        "total": len(plans),
    }
