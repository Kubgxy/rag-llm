import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Float,
    ForeignKey, CheckConstraint, Index,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="user",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    employee_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hrm_role: Mapped[str] = mapped_column(String(20), nullable=False, default="employee")
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    # Relationships
    sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    arena_votes: Mapped[list["ArenaVote"]] = relationship(back_populates="user")
    actions: Mapped[list["GeneratedAction"]] = relationship(back_populates="user")

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'user', 'viewer')", name="ck_users_role"),
        CheckConstraint("hrm_role IN ('employee', 'hr_admin', 'admin')", name="ck_users_hrm_role"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(200))
    session_type: Mapped[str] = mapped_column(String(20), default="notebook")
    model_name: Mapped[str | None] = mapped_column(String(100))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    system_session_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("system_sessions.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="sessions")
    system_session: Mapped[Optional["SystemSession"]] = relationship()
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    actions: Mapped[list["GeneratedAction"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_sessions_user", "user_id", "created_at"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column( 
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    thinking: Mapped[str | None] = mapped_column(Text)
    model_name: Mapped[str | None] = mapped_column(String(100))
    citations: Mapped[dict | None] = mapped_column(JSONB)
    token_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="messages")

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
        Index("idx_messages_session", "session_id", "created_at"),
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    page_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    summary: Mapped[str | None] = mapped_column(Text)
    mindmap: Mapped[dict | None] = mapped_column(JSONB)
    source_type: Mapped[str] = mapped_column(String(20), default="pdf")
    source_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="documents")

    __table_args__ = (
        Index("idx_documents_session", "session_id"),
    )





class ArenaVote(Base):
    __tablename__ = "arena_votes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id")
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    model_a: Mapped[str] = mapped_column(String(100), nullable=False)
    model_b: Mapped[str] = mapped_column(String(100), nullable=False)
    winner: Mapped[str | None] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    # Relationships
    user: Mapped["User | None"] = relationship(back_populates="arena_votes")

    __table_args__ = (
        CheckConstraint("winner IN ('a', 'b', 'tie')", name="ck_votes_winner"),
    )


class GeneratedAction(Base):
    __tablename__ = "generated_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    prompt: Mapped[str | None] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    thinking: Mapped[str | None] = mapped_column(Text)
    model_name: Mapped[str | None] = mapped_column(String(200))
    citations: Mapped[dict | None] = mapped_column(JSONB)
    editor_state: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="actions")
    user: Mapped["User"] = relationship(back_populates="actions")

    __table_args__ = (
        CheckConstraint(
            "action_type IN ('mindmap', 'chart', 'slides', 'infographic')",
            name="ck_actions_type",
        ),
        Index("idx_actions_session", "session_id"),
        Index("idx_actions_user", "user_id"),
    )


class SystemSession(Base):
    """Shared read-only system-level session"""
    __tablename__ = "system_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)  # e.g., 'hrm'
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(100))
    data_source_type: Mapped[str] = mapped_column(String(50), default="api")  # e.g., 'api'
    data_source_config: Mapped[dict | None] = mapped_column(JSONB)  # base_url, API key, endpoints etc.
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    sync_status: Mapped[str] = mapped_column(String(20), default="idle")  # 'idle', 'syncing', 'error'
    last_synced_at: Mapped[datetime | None] = mapped_column(nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    # Relationships
    sync_histories: Mapped[list["SyncHistory"]] = relationship(back_populates="system_session", cascade="all, delete-orphan")


class SyncHistory(Base):
    """Logs for full and incremental sync runs"""
    __tablename__ = "sync_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_session_id: Mapped[str] = mapped_column(String(100), ForeignKey("system_sessions.id", ondelete="CASCADE"), nullable=False)
    sync_type: Mapped[str] = mapped_column(String(20))  # 'full', 'incremental', 'webhook'
    status: Mapped[str] = mapped_column(String(20))  # 'success', 'error', 'running'
    records_synced: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True, default=None)

    # Relationships
    system_session: Mapped["SystemSession"] = relationship(back_populates="sync_histories")


class OrgPolicy(Base):
    """Organization policies for Guardrails AI and semantic filtering"""
    __tablename__ = "org_policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'data_access', 'topic_restriction', 'pii_filter'
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    rules: Mapped[dict | None] = mapped_column(JSONB)  # specific criteria, blocked topics list, etc.
    applies_to_roles: Mapped[dict | None] = mapped_column(JSONB)  # roles e.g. ["employee"] stored as JSON
    applies_to_sessions: Mapped[dict | None] = mapped_column(JSONB)  # sessions e.g. ["hrm"] stored as JSON
    severity: Mapped[str] = mapped_column(String(20), default="block")  # 'block', 'warn', 'redact'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

