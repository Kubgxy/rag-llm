import uuid
from typing import Optional, List
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db_models import ChatSession, ChatMessage


async def create_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: Optional[str] = None,
    session_type: str = "notebook",
    model_name: Optional[str] = None,
    session_id: Optional[uuid.UUID] = None,
    system_session_id: Optional[str] = None,
) -> ChatSession:
    """สร้าง chat session ใหม่"""
    session = ChatSession(
        id=session_id or uuid.uuid4(),
        user_id=user_id,
        title=title,
        session_type=session_type,
        model_name=model_name,
        system_session_id=system_session_id,
    )
    session.messages = []  # ป้องกัน lazy load error ก่อน commit
    db.add(session)
    await db.commit()
    
    # โหลด session ขึ้นมาใหม่แบบ eager load ทันทีเพื่อความปลอดภัยในการ serialize
    print(f"✅ [Session] สร้าง session ใหม่: {session.id}")
    new_session = await get_session(db, session.id, user_id, with_messages=True)
    if new_session is None:
        return session
    return new_session


async def get_user_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False,
) -> List[ChatSession]:
    """ดึงรายการ sessions ของ user เรียงตามล่าสุด (eager load messages และ documents)"""
    query = select(ChatSession).where(ChatSession.user_id == user_id)
    if not include_archived:
        query = query.where(ChatSession.is_archived == False)
    query = query.options(
        selectinload(ChatSession.messages),
        selectinload(ChatSession.documents)
    )
    query = query.order_by(ChatSession.updated_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    with_messages: bool = False,
) -> Optional[ChatSession]:
    """ดึง session เดียว (ตรวจสอบ ownership ด้วย)"""
    query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    )
    if with_messages:
        query = query.options(
            selectinload(ChatSession.messages),
            selectinload(ChatSession.documents)
        )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    title: Optional[str] = None,
    is_archived: Optional[bool] = None,
) -> Optional[ChatSession]:
    """อัปเดตชื่อหรือ archive status ของ session"""
    session = await get_session(db, session_id, user_id)
    if session is None:
        return None

    if title is not None:
        session.title = title
    if is_archived is not None:
        session.is_archived = is_archived

    await db.commit()
    
    # ดึงขึ้นมาแบบ eager load อีกครั้งเพื่อความปลอดภัยในการ serialize และเลี่ยง lazy-load error
    new_session = await get_session(db, session_id, user_id, with_messages=True)
    return new_session


async def delete_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """ลบ session + cascade ข้อมูลทั้งหมด"""
    session = await get_session(db, session_id, user_id)
    if session is None:
        return False

    # ลบ embeddings ใน pgvector และ cache ในระบบ RAG
    from app.services.vector_store import vector_store_service
    vector_store_service.delete_session_embeddings(str(session_id))

    await db.delete(session)
    await db.commit()
    print(f"🗑️ [Session] ลบ session: {session_id}")
    return True


async def save_message(
    db: AsyncSession,
    session_id: uuid.UUID,
    role: str,
    content: str,
    thinking: Optional[str] = None,
    model_name: Optional[str] = None,
    citations: Optional[list] = None,
) -> ChatMessage:
    """บันทึก chat message ลง DB"""
    # ประมาณ token count (rough estimate: 1 token ≈ 4 chars for Thai/English)
    token_count = len(content) // 4

    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        thinking=thinking,
        model_name=model_name,
        citations=citations,
        token_count=token_count,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # อัปเดต updated_at ของ session
    await db.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(updated_at=func.now())
    )
    await db.commit()

    return message


async def get_conversation_memory(
    db: AsyncSession,
    session_id: uuid.UUID,
    max_messages: int = None,
    max_tokens: int = None,
) -> str:
    """
    ดึง N ข้อความล่าสุดเพื่อให้ LLM จดจำบริบทการสนทนา
    Strategy: Sliding Window + Token Budget
    
    1. ดึง max_messages ข้อความล่าสุด (role='user'/'assistant')
    2. คำนวณ token count
    3. ตัดข้อความเก่าออกถ้ารวมเกิน max_tokens
    4. Return formatted string
    """
    if max_messages is None:
        max_messages = settings.CONVERSATION_MEMORY_LIMIT
    if max_tokens is None:
        max_tokens = settings.CONVERSATION_MEMORY_MAX_TOKENS

    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.role.in_(["user", "assistant"]),
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(max_messages)
    )
    messages = list(reversed(result.scalars().all()))

    if not messages:
        return ""

    # Token budget: ตัดข้อความเก่าถ้ารวมเกิน max_tokens
    selected = []
    total_tokens = 0
    for msg in reversed(messages):
        msg_tokens = msg.token_count or (len(msg.content) // 4)
        if total_tokens + msg_tokens > max_tokens and selected:
            break
        selected.insert(0, msg)
        total_tokens += msg_tokens

    # Format เป็น string สำหรับ inject เข้า LLM prompt
    lines = []
    for msg in selected:
        prefix = "ผู้ใช้" if msg.role == "user" else "AI"
        lines.append(f"{prefix}: {msg.content}")

    context = "\n".join(lines)
    print(f"🧠 [Memory] ดึง {len(selected)}/{len(messages)} ข้อความ (~{total_tokens} tokens) สำหรับ session {session_id}")
    return context


async def get_session_messages(
    db: AsyncSession,
    session_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
) -> List[ChatMessage]:
    """ดึง messages ของ session (สำหรับ API response)"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())
