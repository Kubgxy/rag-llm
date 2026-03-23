from fastapi import APIRouter, HTTPException
import asyncio
from app.schemas import ChatRequest, ChatResponse, ChatTitleRequest
from app.services import llm_service


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/single", response_model=ChatResponse)
async def chat_single(request: ChatRequest):
    """
    ถามคำถามกับ LLM โดยใช้ context จาก Vector Store

    Args:
        request: ChatRequest ที่มี query, model_name, session_id

    Returns:
        ChatResponse พร้อมคำตอบจาก LLM (อาจมี thinking blocks)
    """
    try:
        print(f"💬 [API] ได้รับคำถาม: {request.query}")
        print(f"   Session: {request.session_id}, Model: {request.model_name}")

        # ถามคำถาม (returns dict with thinking & answer)
        result = await llm_service.query_with_context(
            query=request.query,
            session_id=request.session_id,
            model_name=request.model_name
        )

        return ChatResponse(
            query=request.query,
            thinking=result.get("thinking"),
            answer=result.get("answer"),
            model_name=request.model_name
        )

    except Exception as e:
        print(f"❌ [Chat Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการตอบคำถาม: {str(e)}"
        )


@router.post("/suggest-title")
async def suggest_title(request: ChatTitleRequest):
    """
    สร้างชื่อแชทที่กระชับจากประโยคแรกของผู้ใช้

    Args:
        request: ChatTitleRequest ที่มี query และ optional model_name

    Returns:
        JSON with 'title' key (max 30 chars)
    """
    try:
        print(f"📝 [API] กำลังสร้างชื่อแชทจาก: {request.query[:50]}...")

        # สร้าง prompt เพื่อให้ LLM generalize
        title_prompt = (
            f"ให้ท่านสร้างชื่อเรื่องให้กับโครงการ/คำถาม ต่อไปนี้ "
            f"ให้เป็นข้อความสั้นๆ 1-3 คำภาษาไทย เพียงชื่อเท่านั้น ไม่ต้องอธิบาย:\n\n"
            f"คำถาม: {request.query}\n\n"
            f"ชื่อเรื่อง: "
        )

        # ใช้ LLM ที่ specified หรือค่าเริ่มต้น
        model_name = request.model_name or "typhoon-2.5"
        llm = llm_service.get_llm(model_name)

        # Generate title (ไม่ใช้ session - แค่ plain generation)
        llm = llm_service.get_llm(model_name)

        # Use complete method (synchronous wrapped in thread)
        response = await asyncio.to_thread(
            llm.complete,
            title_prompt
        )

        title_text = str(response).strip()[:30]  # Max 30 chars
        print(f"✅ [Title] สร้างชื่อสำเร็จ: {title_text}")

        return {"title": title_text}

    except Exception as e:
        print(f"❌ [Title Error] {str(e)}")
        # Return fallback title
        fallback_title = request.query[:30].strip()
        return {"title": fallback_title}
