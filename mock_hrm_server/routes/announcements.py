from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import Announcement

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("")
def list_announcements(
    category: str = None,
    pinned_only: bool = False,
    db: Session = Depends(get_db),
):
    query = select(Announcement)

    if category:
        query = query.where(Announcement.category == category)
    if pinned_only:
        query = query.where(Announcement.is_pinned == True)

    query = query.order_by(Announcement.is_pinned.desc(), Announcement.publish_date.desc())
    result = db.execute(query)
    announcements = result.scalars().all()

    return {
        "data": [{
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "category": a.category,
            "priority": a.priority,
            "is_pinned": a.is_pinned,
            "publish_date": str(a.publish_date),
            "expire_date": str(a.expire_date) if a.expire_date else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        } for a in announcements],
        "total": len(announcements),
    }
