from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import os
from app.config import settings
from app.api import api_router
from app.services import vector_store_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler
    - Startup: โหลด embedding model
    - Shutdown: ปิดการเชื่อมต่อ
    """
    # Startup
    print("🚀 กำลัง startup backend...")
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
    print("✅ Shutdown เรียบร้อย")


# สร้าง FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
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
