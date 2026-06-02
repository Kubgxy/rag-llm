from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """FastAPI dependency สำหรับ inject database session"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """สร้าง tables ทั้งหมดถ้ายังไม่มี (ใช้ตอน startup)"""
    import app.db_models  # noqa: F401 — ensure models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ [Database] สร้าง tables เรียบร้อย")


async def close_db():
    """ปิด connection pool (ใช้ตอน shutdown)"""
    await engine.dispose()
    print("🔌 [Database] ปิด connection pool เรียบร้อย")
