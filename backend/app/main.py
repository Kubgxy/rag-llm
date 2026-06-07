import sys
# Enable UTF-8 console output for Windows to support emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import os
from app.config import settings
from app.api import api_router
from app.services import vector_store_service
from app.database import init_db, close_db

from app.services.sync_engine import sync_engine
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler
    - Startup: โหลด embedding model, สร้าง database tables, ตั้งค่า Sync Scheduler
    - Shutdown: ปิดการเชื่อมต่อ และหยุดตัวตั้งเวลา
    """
    # Startup
    print("🚀 กำลัง startup backend...")

    # สร้าง database tables
    try:
        await init_db()
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการสร้าง Database: {str(e)}")

    print(f"📦 โหลด Embedding Model: {settings.EMBEDDING_MODEL}")

    # Embedding จะถูกโหลดตอน VectorStoreService init แล้ว
    try:
        vector_store_service.embedding_model.get_text_embedding("ทดสอบ")
        print("✅ Embedding Model พร้อมใช้งาน")
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการโหลด Embedding: {str(e)}")

    # 1. เริ่มต้น System Session 'hrm' ในฐานข้อมูล
    try:
        await sync_engine.init_system_session()
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการเริ่มต้น System Session: {e}")

    # 1.5 Seed Org Policies สำหรับระบบความมั่นคงปลอดภัย (Guardrails)
    try:
        from app.services.guardrails_service import guardrails_service
        from app.database import async_session
        async with async_session() as db:
            await guardrails_service.seed_org_policies(db)
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการ Seed Org Policies: {e}")

    # 2. ตั้งค่า APScheduler เพื่อรัน Incremental Sync ทุกๆ 15 นาที
    scheduler = AsyncIOScheduler()
    scheduler.add_job(sync_engine.run_incremental_sync, "interval", minutes=15)
    scheduler.start()
    print("⏰ [Scheduler] เริ่มต้นการทำ Incremental Sync ทุกๆ 15 นาทีเรียบร้อย")

    # 3. รัน Webhook registration และรันซิงค์รอบแรกใน background task เพื่อไม่ให้ขัดขวางการเปิดเซิร์ฟเวอร์
    async def initial_tasks():
        await asyncio.sleep(5)  # รอให้ FastAPI server รันเสร็จพร้อมตอบสนองก่อน
        print("⚡ [Startup Tasks] กำลังลงทะเบียน Webhook และรันซิงค์รอบแรก...")
        await sync_engine.register_webhook_on_hrm()
        try:
            await sync_engine.run_incremental_sync()
        except Exception as e:
            print(f"⚠️ เกิดข้อผิดพลาดในการซิงค์ข้อมูลรอบแรก: {e}")

    asyncio.create_task(initial_tasks())

    yield

    # Shutdown
    print("🛑 กำลัง shutdown backend...")
    scheduler.shutdown()
    vector_store_service.close()
    await close_db()
    print("✅ Shutdown เรียบร้อย")


# สร้าง FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Normalize origins เพราะ browser ส่ง Origin แบบไม่มี trailing '/'
normalized_origins = [origin.rstrip("/") for origin in settings.CORS_ORIGINS]

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=normalized_origins if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount โฟลเดอร์อัพโหลดเพื่อให้ frontend ดึงไฟล์ pdf ไปเปิดดูได้
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/docs", StaticFiles(directory=settings.UPLOAD_DIR), name="docs")



# Request Logging Middleware สำหรับ Debug
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log ทุก HTTP request"""
    start_time = time.time()

    print(f"\n{'='*60}")
    print(f"🔵 [REQUEST] {request.method} {request.url.path}")
    print(f"   Client: {request.client.host if request.client else 'unknown'}")
    print(f"   Headers: {dict(request.headers)}")

    response = await call_next(request)

    process_time = time.time() - start_time
    print(f"✅ [RESPONSE] Status: {response.status_code} | Time: {process_time:.3f}s")
    print(f"{'='*60}\n")

    return response

# เพิ่ม routes
app.include_router(api_router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint สำหรับตรวจสอบสถานะ"""
    return {
        "status": "healthy",
        "embedding_model": settings.EMBEDDING_MODEL,
        "default_llm": settings.DEFAULT_LLM_MODEL
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
