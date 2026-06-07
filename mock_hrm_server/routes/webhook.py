import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from mock_hrm_server.database import get_db
from mock_hrm_server.models import WebhookRegistration

router = APIRouter(prefix="/webhook", tags=["Webhooks"])


class WebhookRegisterRequest(BaseModel):
    url: str
    events: list[str]  # ["employee.updated", "leave.created", "leave.updated"]
    secret: Optional[str] = None


class WebhookTestRequest(BaseModel):
    event: str = "employee.updated"
    payload: Optional[dict] = None


@router.post("/register")
def register_webhook(request: WebhookRegisterRequest, db: Session = Depends(get_db)):
    wh = WebhookRegistration(
        url=request.url,
        events=",".join(request.events),
        secret=request.secret,
        is_active=True,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    return {
        "status": "registered",
        "webhook_id": wh.id,
        "url": wh.url,
        "events": request.events,
    }


@router.get("/list")
def list_webhooks(db: Session = Depends(get_db)):
    result = db.execute(select(WebhookRegistration).where(WebhookRegistration.is_active == True))
    webhooks = result.scalars().all()
    return {
        "data": [{
            "id": w.id,
            "url": w.url,
            "events": w.events.split(","),
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        } for w in webhooks]
    }


@router.post("/test")
async def trigger_test_webhook(request: WebhookTestRequest, db: Session = Depends(get_db)):
    """ทดสอบส่ง webhook ไปยัง registered URLs"""
    result = db.execute(select(WebhookRegistration).where(WebhookRegistration.is_active == True))
    webhooks = result.scalars().all()

    if not webhooks:
        raise HTTPException(status_code=404, detail="No registered webhooks found")

    payload = request.payload or {
        "event": request.event,
        "data": {
            "message": "Test webhook from Mock HRM Server",
            "resource_type": request.event.split(".")[0] if "." in request.event else "test",
            "action": request.event.split(".")[1] if "." in request.event else "test",
        }
    }

    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for wh in webhooks:
            events = wh.events.split(",")
            if request.event not in events and "*" not in events:
                continue

            try:
                resp = await client.post(
                    wh.url,
                    json=payload,
                    headers={"X-Webhook-Secret": wh.secret or ""},
                )
                results.append({
                    "webhook_id": wh.id,
                    "url": wh.url,
                    "status": resp.status_code,
                    "success": 200 <= resp.status_code < 300,
                })
            except Exception as e:
                results.append({
                    "webhook_id": wh.id,
                    "url": wh.url,
                    "status": 0,
                    "success": False,
                    "error": str(e),
                })

    return {"event": request.event, "results": results}


@router.delete("/{webhook_id}")
def delete_webhook(webhook_id: str, db: Session = Depends(get_db)):
    result = db.execute(select(WebhookRegistration).where(WebhookRegistration.id == webhook_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    wh.is_active = False
    db.commit()
    return {"status": "deactivated", "webhook_id": webhook_id}
