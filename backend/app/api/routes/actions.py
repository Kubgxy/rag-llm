import json
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.config import settings
from app.schemas import ActionGenerateRequest, ActionGenerateResponse, ActionType
from app.services import llm_service, document_processor


router = APIRouter(prefix="/actions", tags=["Actions"])


def _build_action_prompt(action_type: ActionType, language: str, user_goal: Optional[str]) -> str:
    lang_instruction = "ตอบเป็นภาษาไทย" if language.lower() == "th" else "ตอบเป็นภาษาอังกฤษ"

    if action_type == ActionType.MINDMAP:
        return document_processor.build_mindmap_prompt(language=language, user_goal=user_goal)

    if action_type == ActionType.CHART:
        base = (
            "จากข้อมูลในเอกสาร จงสร้างข้อมูลสำหรับกราฟในรูปแบบ JSON เท่านั้น\n"
            "เงื่อนไข:\n"
            "1) ตอบเป็น JSON object เท่านั้น ไม่มีคำอธิบาย\n"
            "2) โครงสร้างต้องมี: title, chart_type, x_label, y_label, labels, datasets\n"
            "3) datasets เป็น array ของ object ที่มี name และ data (ตัวเลขเท่านั้น)\n"
            "4) ถ้าข้อมูลเชิงตัวเลขไม่พอ ให้สร้าง chart_type='qualitative-bar' และให้คะแนน 1-5 จากความเข้มข้นของประเด็น\n"
        )
    elif action_type == ActionType.SLIDES:
        base = (
            "จากข้อมูลในเอกสาร จงสร้างโครงสไลด์นำเสนอในรูปแบบ JSON เท่านั้น\n"
            "เงื่อนไข:\n"
            "1) ตอบเป็น JSON object เท่านั้น\n"
            "2) โครงสร้างต้องมี: title, audience, slides\n"
            "3) slides เป็น array โดยแต่ละรายการมี: slide_title, key_points (array), speaker_notes\n"
            "4) จำนวนสไลด์ 6-8 หน้า\n"
        )
    elif action_type == ActionType.INFOGRAPHIC:
        base = (
            "จากข้อมูลในเอกสาร จงสร้างโครงอินโฟกราฟิกในรูปแบบ JSON เท่านั้น\n"
            "เงื่อนไข:\n"
            "1) ตอบเป็น JSON object เท่านั้น\n"
            "2) โครงสร้างต้องมี: headline, subheadline, theme, visual_style, sections, key_stats, call_to_action\n"
            "3) sections เป็น array (3-6 รายการ) ของ object: title, summary, icon_hint, highlights\n"
            "4) highlights ต้องเป็น array ของ bullet สั้นๆ 2-4 ข้อ\n"
            "5) key_stats เป็น array (3-6 รายการ) ของ object: label, value, unit\n"
            "6) theme ให้เป็นคำสั้นๆ เช่น ocean, emerald, amber, slate\n"
            "7) visual_style ให้เป็นคำสั้นๆ เช่น modern-card, data-story, minimal-bold\n"
        )
    else:
        raise ValueError(f"Unsupported action type: {action_type}")

    goal_text = f"\nเป้าหมายเพิ่มเติมจากผู้ใช้: {user_goal.strip()}" if user_goal and user_goal.strip() else ""
    return f"{base}\n{lang_instruction}{goal_text}"


@router.post("/generate", response_model=ActionGenerateResponse)
async def generate_action(request: ActionGenerateRequest):
    """
    สร้างผลลัพธ์เฉพาะทางจากเอกสารใน session เดียวกัน
    - mindmap (JSON)
    - chart (JSON)
    - slides (JSON)
    - infographic (JSON)
    """
    try:
        model_name = request.model_name or settings.ACTION_LLM_MODEL
        prompt = _build_action_prompt(request.action_type, request.language, request.user_goal)

        result = await llm_service.query_with_context(
            query=prompt,
            session_id=request.session_id,
            model_name=model_name,
        )

        answer = result.get("answer") or ""
        if request.action_type == ActionType.MINDMAP:
            parsed_mindmap = document_processor.parse_mindmap_markdown(answer)
            answer = json.dumps(parsed_mindmap, ensure_ascii=False)

        return ActionGenerateResponse(
            action_type=request.action_type,
            prompt=prompt,
                answer=answer,
            thinking=result.get("thinking"),
            model_name=model_name,
            citations=result.get("citations"),
        )
    except Exception as e:
        print(f"❌ [Action Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการสร้าง Action: {str(e)}",
        )
