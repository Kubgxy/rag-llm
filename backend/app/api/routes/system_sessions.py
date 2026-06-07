# -*- coding: utf-8 -*-
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.db_models import SystemSession, SyncHistory
from app.schemas import SystemSessionResponse, SyncHistoryResponse
from app.services.auth_service import get_current_user
from app.db_models import User

router = APIRouter(prefix="/system-sessions", tags=["System Sessions"])

@router.get("", response_model=List[SystemSessionResponse])
async def list_system_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึงรายการ System Session ทั้งหมดที่เปิดใช้งาน"""
    result = await db.execute(
        select(SystemSession).where(SystemSession.is_active == True)
    )
    return result.scalars().all()

@router.get("/{session_id}", response_model=SystemSessionResponse)
async def get_system_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึงรายละเอียดของ System Session รายตัว"""
    result = await db.execute(
        select(SystemSession).where(SystemSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="ไม่พบ System Session นี้")
    return session

@router.get("/{session_id}/history", response_model=List[SyncHistoryResponse])
async def get_sync_history(
    session_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึงประวัติการซิงค์ข้อมูลของ System Session"""
    result = await db.execute(
        select(SystemSession).where(SystemSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="ไม่พบ System Session นี้")

    history_result = await db.execute(
        select(SyncHistory)
        .where(SyncHistory.system_session_id == session_id)
        .order_by(SyncHistory.started_at.desc())
        .limit(limit)
    )
    return history_result.scalars().all()
