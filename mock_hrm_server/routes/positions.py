from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import Position

router = APIRouter(prefix="/positions", tags=["Positions"])


@router.get("")
def list_positions(db: Session = Depends(get_db)):
    result = db.execute(select(Position).order_by(Position.level, Position.title))
    positions = result.scalars().all()

    return {
        "data": [{
            "id": p.id,
            "title": p.title,
            "title_en": p.title_en,
            "level": p.level,
            "level_name": _level_name(p.level),
            "description": p.description,
            "min_salary": p.min_salary,
            "max_salary": p.max_salary,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        } for p in positions],
        "total": len(positions),
    }


def _level_name(level: int) -> str:
    return {
        1: "Junior", 2: "Mid-Level", 3: "Senior",
        4: "Lead", 5: "Manager", 6: "Director",
    }.get(level, "Unknown")
