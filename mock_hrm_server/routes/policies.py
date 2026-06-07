from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import Policy

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("")
def list_policies(
    category: Optional[str] = None,
    is_active: bool = True,
    updated_since: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(Policy).where(Policy.is_active == is_active)

    if category:
        query = query.where(Policy.category == category)
    if updated_since:
        since = datetime.fromisoformat(updated_since)
        query = query.where(Policy.updated_at >= since)

    query = query.order_by(Policy.category, Policy.title)
    result = db.execute(query)
    policies = result.scalars().all()

    return {
        "data": [{
            "id": p.id,
            "title": p.title,
            "category": p.category,
            "content": p.content,
            "effective_date": str(p.effective_date),
            "version": p.version,
            "is_active": p.is_active,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        } for p in policies],
        "total": len(policies),
    }


@router.get("/{policy_id}")
def get_policy(policy_id: str, db: Session = Depends(get_db)):
    result = db.execute(select(Policy).where(Policy.id == policy_id))
    p = result.scalar_one_or_none()
    if not p:
        return {"error": "Policy not found"}, 404

    return {
        "data": {
            "id": p.id,
            "title": p.title,
            "category": p.category,
            "content": p.content,
            "effective_date": str(p.effective_date),
            "version": p.version,
            "is_active": p.is_active,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
    }
