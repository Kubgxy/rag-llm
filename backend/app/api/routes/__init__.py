from fastapi import APIRouter
from app.api.routes import upload, chat, runtime

api_router = APIRouter()

# รวม routes
api_router.include_router(upload.router)
api_router.include_router(chat.router)
api_router.include_router(runtime.router)
