from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse
from app.services import llm_service


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/single", response_model=ChatResponse)
async def chat_single(request: ChatRequest):
    """
    ถามคำถามกับ LLM โดยใช้ context จาก Vector Store

    Args:
        request: ChatRequest ที่มี query, model_name, session_id

    Returns:
        ChatResponse พร้อมคำตอบจาก LLM
    """
    try:
        print(f"💬 [API] ได้รับคำถาม: {request.query}")
        print(f"   Session: {request.session_id}, Model: {request.model_name}")

        # ถามคำถาม
        answer = await llm_service.query_with_context(
            query=request.query,
            session_id=request.session_id,
            model_name=request.model_name
        )

        return ChatResponse(
            query=request.query,
            answer=answer,
            model_name=request.model_name
        )

    except Exception as e:
        print(f"❌ [Chat Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการตอบคำถาม: {str(e)}"
        )
