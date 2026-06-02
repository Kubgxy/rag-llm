from fastapi import APIRouter
from app.api.routes import upload, chat, runtime, actions, web_search, auth, sessions

api_router = APIRouter()

# รวม routes
api_router.include_router(auth.router)
api_router.include_router(sessions.router)
api_router.include_router(upload.router)
api_router.include_router(chat.router)
api_router.include_router(runtime.router)
api_router.include_router(actions.router)
api_router.include_router(web_search.router)
