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
import subprocess
from app.config import settings
from app.api import api_router
from app.services import vector_store_service
from app.database import init_db, close_db

def ensure_playwright_installed():
    """จะรันดาวน์โหลดเบราว์เซอร์อัตโนมัติ เฉพาะตอนทำงานในโหมด Development (รันในเครื่อง) เท่านั้น"""
    if not settings.DEBUG:
        print("🌍 [Production Mode] ข้ามการติดตั้ง Playwright อัตโนมัติ (คาดว่าติดตั้งมาจาก Docker/CI แล้ว)")
        return

    try:
        print("🔍 [Dev Mode] กำลังตรวจสอบ Playwright Chromium...")
        import subprocess
        subprocess.run(["playwright", "install", "chromium"], check=True)
        print("✅ Playwright Chromium พร้อมใช้งาน")
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการตรวจสอบ/ติดตั้ง Playwright: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler
    - Startup: โหลด embedding model, สร้าง database tables
    - Shutdown: ปิดการเชื่อมต่อ
    """
    # Startup
    print("🚀 กำลัง startup backend...")

    # สร้าง database tables
    try:
        await init_db()
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการสร้าง Database: {str(e)}")

    ensure_playwright_installed()

    print(f"📦 โหลด Embedding Model: {settings.EMBEDDING_MODEL}")

    # Embedding จะถูกโหลดตอน VectorStoreService init แล้ว
    # แค่ทดสอบว่าใช้งานได้
    try:
        vector_store_service.embedding_model.get_text_embedding("ทดสอบ")
        print("✅ Embedding Model พร้อมใช้งาน")
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการโหลด Embedding: {str(e)}")

    yield

    # Shutdown
    print("🛑 กำลัง shutdown backend...")
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
