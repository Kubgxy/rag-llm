from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import User
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
)
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """สร้างบัญชีผู้ใช้ใหม่"""
    user = await register_user(db, request.username, request.email, request.password)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """เข้าสู่ระบบ แล้วได้รับ JWT tokens"""
    user = await authenticate_user(db, request.username, request.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """ขอ access token ใหม่จาก refresh token"""
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="ต้องใช้ refresh token")
    user_id = payload["sub"]
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้อง login)"""
    return current_user
