import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User
from app.schemas import (
    ChatSessionCreateRequest,
    ChatSessionUpdateRequest,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.services.auth_service import get_current_user
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", response_model=ChatSessionResponse)
async def create_session(
    request: ChatSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """สร้าง chat session ใหม่"""
    session = await session_service.create_session(
        db,
        user_id=current_user.id,
        title=request.title,
        session_type=request.session_type,
        model_name=request.model_name,
    )
    return session


@router.get("", response_model=List[ChatSessionResponse])
async def list_sessions(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึงรายการ sessions ของ user"""
    sessions = await session_service.get_user_sessions(
        db, user_id=current_user.id, include_archived=include_archived
    )
    return sessions


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึง session เดียวพร้อม messages"""
    session = await session_service.get_session(
        db, session_id=session_id, user_id=current_user.id, with_messages=True
    )
    if session is None:
        raise HTTPException(status_code=404, detail="ไม่พบ session")
    return session


@router.patch("/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: uuid.UUID,
    request: ChatSessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """อัปเดตชื่อหรือ archive status"""
    session = await session_service.update_session(
        db,
        session_id=session_id,
        user_id=current_user.id,
        title=request.title,
        is_archived=request.is_archived,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="ไม่พบ session")
    return session


@router.delete("/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ลบ session และข้อมูลทั้งหมด"""
    deleted = await session_service.delete_session(
        db, session_id=session_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="ไม่พบ session")
    return {"status": "deleted", "session_id": str(session_id)}


@router.get("/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ดึง messages ของ session"""
    # ตรวจสอบ ownership
    session = await session_service.get_session(
        db, session_id=session_id, user_id=current_user.id
    )
    if session is None:
        raise HTTPException(status_code=404, detail="ไม่พบ session")

    messages = await session_service.get_session_messages(
        db, session_id=session_id, limit=limit, offset=offset
    )
    return messages
