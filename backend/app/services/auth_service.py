import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.db_models import User

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token หมดอายุ")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency: ดึง user ปัจจุบันจาก JWT token"""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ต้อง login ก่อน")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ต้องใช้ access token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ไม่ถูกต้อง")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ไม่พบผู้ใช้หรือบัญชีถูกปิดใช้งาน")

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency: ดึง user ถ้ามี token (ไม่บังคับ login)"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def register_user(db: AsyncSession, username: str, email: str, password: str) -> User:
    """สร้าง user ใหม่"""
    # ตรวจ username/email ซ้ำ
    result = await db.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.username == username:
            raise HTTPException(status_code=400, detail="Username นี้ถูกใช้แล้ว")
        raise HTTPException(status_code=400, detail="Email นี้ถูกใช้แล้ว")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        display_name=username,
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    print(f"✅ [Auth] สร้างผู้ใช้ใหม่: {username}")
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    """ตรวจสอบ username/password แล้ว return User"""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username หรือ password ไม่ถูกต้อง")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีถูกปิดใช้งาน")

    return user
