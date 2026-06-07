import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mock_hrm_server.database import init_db
from mock_hrm_server.routes import (
    employees, departments, leaves, attendance, positions,
    salary, policies, announcements, performance, benefits,
    webhook, sync,
)

app = FastAPI(
    title="Mock HRM API Server",
    description="จำลอง HRM Database API สำหรับทดสอบ System Session ของ RAG-LLM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes under /api/hrm prefix
api_prefix = "/api/hrm"
app.include_router(employees.router, prefix=api_prefix)
app.include_router(departments.router, prefix=api_prefix)
app.include_router(leaves.router, prefix=api_prefix)
app.include_router(attendance.router, prefix=api_prefix)
app.include_router(positions.router, prefix=api_prefix)
app.include_router(salary.router, prefix=api_prefix)
app.include_router(policies.router, prefix=api_prefix)
app.include_router(announcements.router, prefix=api_prefix)
app.include_router(performance.router, prefix=api_prefix)
app.include_router(benefits.router, prefix=api_prefix)
app.include_router(webhook.router, prefix=api_prefix)
app.include_router(sync.router, prefix=api_prefix)


@app.on_event("startup")
def startup():
    init_db()
    print("🏢 Mock HRM API Server พร้อมใช้งาน")
    print("📖 Swagger UI: http://localhost:8001/docs")


@app.get("/")
def root():
    return {
        "app": "Mock HRM API Server",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "mock_hrm_server.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
    )
