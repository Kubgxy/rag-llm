# -*- coding: utf-8 -*-
from fastapi import APIRouter, Header, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.services.sync_engine import sync_engine, HRM_WEBHOOK_SECRET

router = APIRouter(prefix="/webhook", tags=["Webhook (Receiver)"])

class WebhookPayload(BaseModel):
    event: str  # e.g., "employee.updated", "leave.created"
    data: Dict[str, Any]

async def process_webhook_bg(event: str, data: Dict[str, Any]):
    """Background task สำหรับประมวลผล webhook เพื่อป้องกัน API block"""
    # ดึง Resource ID จาก payload (อาจจะอยู่ใน data['id'] หรือ data['employee_id'])
    resource_id = data.get("id") or data.get("employee_id") or data.get("resource_id")
    
    if not resource_id:
        print(f"⚠️ [Webhook Route] ไม่สามารถประมวลผลได้เนื่องจากไม่พบ resource_id ใน payload: {data}")
        return
        
    await sync_engine.handle_webhook_event(event, str(resource_id), data)

@router.post("/hrm")
async def receive_hrm_webhook(
    payload: WebhookPayload,
    background_tasks: BackgroundTasks,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret")
):
    """
    Webhook Receiver สำหรับรับ Event การเปลี่ยนแปลงข้อมูลจาก Mock HRM Server
    และอัปเดตข้อมูลเวกเตอร์ของพนักงานหรือนโยบายองค์กรแบบ Realtime
    """
    # ตรวจสอบ Webhook Secret Token เพื่อความปลอดภัยตามเงื่อนไข (Layer 1 Security)
    if x_webhook_secret != HRM_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden — Invalid Webhook Secret Token"
        )
    
    print(f"📥 [Webhook Route] ได้รับ Event: {payload.event}")
    
    # รันการซิงค์และอัปเดตเวกเตอร์สโตร์ใน Background เพื่อไม่ให้บล็อกการส่งข้อมูลกลับของเซิร์ฟเวอร์
    background_tasks.add_task(process_webhook_bg, payload.event, payload.data)
    
    return {
        "status": "received",
        "event": payload.event,
        "message": "Webhook payload received and queued for processing"
    }
