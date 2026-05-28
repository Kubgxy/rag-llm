import json
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.config import settings
from app.schemas import ActionGenerateRequest, ActionGenerateResponse, ActionType
from app.services import llm_service, document_processor

router = APIRouter(prefix="/actions", tags=["Actions"])

# 1. ทาโกะเติมบรรทัดประกาศฟังก์ชันที่หายไปให้ครับ
def _build_action_prompt(action_type: ActionType, language: str, user_goal: Optional[str]) -> str:
    if action_type == ActionType.MINDMAP:
        return document_processor.build_mindmap_prompt(language=language, user_goal=user_goal)

    lang_instruction = f"ข้อมูลทั้งหมดใน JSON ต้องเป็นภาษา: {'ไทย (Thai)' if language.lower() == 'th' else 'English'}"

    if action_type == ActionType.CHART:
        base = """คุณคือ Data Analyst ผู้เชี่ยวชาญด้าน Data Visualization
หน้าที่ของคุณคือวิเคราะห์ข้อมูลจากเอกสาร สกัดข้อมูลเชิงตัวเลข และออกแบบโครงสร้างกราฟ

[เงื่อนไขเหล็ก]:
1. ตอบกลับเป็น Raw JSON Object เท่านั้น ห้ามมีข้อความอธิบายใดๆ ทั้งสิ้น
2. เลือก chart_type ให้เหมาะสมกับชุดข้อมูล: 'bar', 'line', 'pie', หรือ 'doughnut'
3. หากข้อมูลในเอกสารไม่มีตัวเลขชัดเจน ให้สังเคราะห์ข้อมูลเชิงคุณภาพเป็นคะแนน (1-5) แทน และบังคับใช้ chart_type='qualitative-bar'

[โครงสร้าง JSON ที่บังคับ]:
{
  "title": "ชื่อกราฟ (สั้นและเข้าใจง่าย)",
  "chart_type": "bar",
  "x_label": "คำอธิบายแกน X",
  "y_label": "คำอธิบายแกน Y",
  "labels": ["หมวดหมู่ 1", "หมวดหมู่ 2", "หมวดหมู่ 3"],
  "datasets": [
    {
      "name": "ชื่อชุดข้อมูล (Legend)",
      "data": [10.5, 20, 15]
    }
  ]
}"""

    elif action_type == ActionType.SLIDES:
        base = """คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลและการออกแบบการนำเสนอ (Executive Pitch AI)
หน้าที่ของคุณคืออ่านวิเคราะห์ "ข้อมูลจากเอกสาร (Context information)" ทั้งหมดอย่างละเอียด สกัดประเด็นเชิงลึก และสรุปเนื้อหาจริงเหล่านั้นออกมาเป็นหน้าสไลด์ที่ครอบคลุมเนื้อหาสำคัญของเอกสารอย่างครบถ้วนที่สุด ห้ามละทิ้งรายละเอียดเนื้อหาหลัก

[เงื่อนไขเหล็ก]:
1. ทุกข้อมูลใน JSON (title, audience, slide_title, key_points, speaker_notes) ต้องสรุปจากเนื้อหาจริงในเอกสารเท่านั้น ห้ามเอาคำแนะนำหรือตัวอย่างใน Prompt ไปตอบเด็ดขาด!
2. หากเอกสารพูดถึงเรื่องอะไร (เช่น เรื่องเทคโนโลยี, การเงิน, การแพทย์, กฎหมาย) ให้สร้างสไลด์นำเสนอเรื่องนั้นๆ ห้ามทำสไลด์แนววิธีวิเคราะห์เอกสารหรือการสร้างงานนำเสนอเด็ดขาด!
3. ตอบกลับเป็น Raw JSON Object เท่านั้น ห้ามมีข้อความเกริ่นนำหรือปิดท้ายใดๆ นอกเหนือจาก JSON
4. สร้างสไลด์จำนวน 4-8 หน้า ตามความเหมาะสมของความยาวเอกสาร เพื่อเก็บประเด็นสำคัญของเอกสารจริง
5. ข้อความใน 'key_points' ต้องเป็น Bullet points อธิบายเนื้อหาในส่วนนั้นๆ ของเอกสารอย่างละเอียด (ประโยคละประมาณ 15-30 คำ) มีข้อมูลจริงประกอบ ห้ามย่อสั้นจนไม่มีเนื้อสาระ
6. 'speaker_notes' ต้องเขียนคำบรรยายพูดเชิงลึกที่ลงรายละเอียดเนื้อหาของสไลด์หน้านั้นๆ จริง
7. บังคับเลือก 'icon_name' จากรายการนี้เท่านั้น: [database, server, shield-check, users, bar-chart, activity, cpu, cloud-lightning]

[โครงสร้าง JSON ที่บังคับ (ห้ามคัดลอกข้อความ placeholder ด้านล่าง ให้แทนที่ด้วยเนื้อหาหัวข้อจริงจากเอกสารทั้งหมด)]:
{
  "title": "[REPLACE_WITH_ACTUAL_DOCUMENT_TITLE_เช่น_รายงานการเงินไตรมาส_1_หรือ_ประวัติศาสตร์ไทย]",
  "audience": "[REPLACE_WITH_ACTUAL_AUDIENCE_เช่น_ผู้ถือหุ้น_นักเรียน_ประชาชนทั่วไป]",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "[REPLACE_WITH_ACTUAL_SLIDE_TITLE_เช่น_ภาพรวมผลประกอบการประจำปี]",
      "icon_name": "database",
      "key_points": [
        "[REPLACE_WITH_ACTUAL_FACT_1_จากเอกสารจริง (เขียนอธิบาย 15-30 คำ)]",
        "[REPLACE_WITH_ACTUAL_FACT_2_จากเอกสารจริง (เขียนอธิบาย 15-30 คำ)]"
      ],
      "speaker_notes": "[REPLACE_WITH_ACTUAL_SPEAKER_NOTES_จากเอกสารจริง]"
    }
  ]
}"""

    elif action_type == ActionType.INFOGRAPHIC:
        base = """คุณคือ UI/UX Designer และ Data Storyteller สาย Professional & Comprehensive Visualizer
หน้าที่ของคุณคือออกแบบโครงสร้างเนื้อหาอินโฟกราฟิกจากเอกสาร โดยคุณต้องอ่าน "ข้อมูลจากเอกสาร (Context information)" ทั้งหมด สกัดข้อมูลเชิงคุณภาพ สถิติ และประเด็นสำคัญมานำเสนออย่างลึกซึ้งและละเอียดที่สุด

[เงื่อนไขเหล็ก]:
1. ทุกข้อมูลใน JSON (headline, subheadline, key_stats, sections, highlights, call_to_action) ต้องสรุปจากเนื้อหาจริงของเอกสารเรื่องนั้นๆ เท่านั้น ห้ามเอาตัวอย่างคำแนะนำใน Prompt ไปตอบเด็ดขาด!
2. หากเอกสารเป็นเรื่องเกี่ยวกับอะไร ให้สร้างอินโฟกราฟิกสรุปข้อมูลของเรื่องนั้นจริงๆ ห้ามพูดถึงโครงสร้างอินโฟกราฟิกหรือการสกัดเอกสารทั่วไปเด็ดขาด
3. ตอบกลับเป็น Raw JSON Object เท่านั้น ห้ามมีข้อความอื่นเจือปน
4. 'key_stats' สกัดเฉพาะตัวเลขหรือสถิติจริงที่มีตัวตนอยู่ในเอกสาร (3-6 รายการ) ห้ามเดาหรือสรุปตัวเลขลอยๆ
5. 'sections' ต้องมี 3-6 รายการ โดย 'highlights' ของแต่ละส่วนต้องลงลึกข้อมูลเนื้อหาจริงอย่างละเอียด (มี 3-4 ข้อต่อเซกชัน และมีความยาวแต่ละข้อประมาณ 10-25 คำ) ห้ามย่อเป็นเพียงคำสั้นๆ
6. บังคับเลือก 'icon_name' สำหรับเซกชันต่างๆ จากรายการนี้เท่านั้น: [database, server, shield-check, users, bar-chart, activity, cpu, cloud-lightning]

[โครงสร้าง JSON ที่บังคับ (ห้ามคัดลอกข้อความ placeholder ด้านล่าง ให้แทนที่ด้วยเนื้อหาหัวข้อจริงจากเอกสารทั้งหมด)]:
{
  "headline": "[REPLACE_WITH_ACTUAL_INFOGRAPHIC_HEADLINE_เช่น_สรุปภาพรวมแผนพัฒนาพลังงาน]",
  "subheadline": "[REPLACE_WITH_ACTUAL_INFOGRAPHIC_SUBHEADLINE_เช่น_วิเคราะห์ทิศทางและแนวโน้มปี_2570]",
  "theme": "ocean",
  "visual_style": "modern-card",
  "key_stats": [
    { 
      "label": "[REPLACE_WITH_ACTUAL_STAT_LABEL_เช่น_อัตราการใช้พลังงานทดแทน]", 
      "value": "[REPLACE_WITH_ACTUAL_STAT_VALUE_เช่น_45]", 
      "unit": "[REPLACE_WITH_ACTUAL_STAT_UNIT_เช่น_%]" 
    }
  ],
  "sections": [
    {
      "title": "[REPLACE_WITH_ACTUAL_SECTION_TITLE_เช่น_เป้าหมายการลดคาร์บอน]",
      "summary": "[REPLACE_WITH_ACTUAL_SECTION_SUMMARY_เช่น_ภาพรวมของการลดปริมาณคาร์บอนในภาคอุตสาหกรรม]",
      "icon_name": "database",
      "highlights": [
        "[REPLACE_WITH_ACTUAL_HIGHLIGHT_1_จากเอกสารจริง (เขียน 10-25 คำ)]",
        "[REPLACE_WITH_ACTUAL_HIGHLIGHT_2_จากเอกสารจริง (เขียน 10-25 คำ)]"
      ]
    }
  ],
  "call_to_action": "[REPLACE_WITH_ACTUAL_CTA_เช่น_ร่วมสนับสนุนนโยบายเพื่ออนาคตสีเขียว]"
}"""
    else:
        raise ValueError(f"Unsupported action type: {action_type}")

    goal_text = f"\n[เป้าหมายเพิ่มเติมจากผู้ใช้]: {user_goal.strip()}" if user_goal and user_goal.strip() else ""
    
    # รวมโครงสร้าง Prompt ทั้งหมด
    final_prompt = f"{base}\n\n{lang_instruction}{goal_text}\n\n[เริ่มสร้าง JSON]:"
    return final_prompt


@router.post("/generate", response_model=ActionGenerateResponse)
async def generate_action(request: ActionGenerateRequest):
    """
    สร้างผลลัพธ์เฉพาะทางจากเอกสารใน session เดียวกัน
    """
    try:
        model_name = settings.ACTION_LLM_MODEL
        prompt = _build_action_prompt(request.action_type, request.language, request.user_goal)

        result = await llm_service.query_with_context(
            query=prompt,
            session_id=request.session_id,
            model_name=model_name,
        )

        answer = result.get("answer") or ""
        
        # 2. ทาโกะเพิ่ม .replace("```markdown", "") เพื่อความปลอดภัยของปุ่ม Mindmap ครับ
        clean_answer = answer.replace("```json", "").replace("```markdown", "").replace("```", "").strip()

        if request.action_type == ActionType.MINDMAP:
            parsed_mindmap = document_processor.parse_mindmap_markdown(clean_answer)
            clean_answer = json.dumps(parsed_mindmap, ensure_ascii=False)

        elif request.action_type in [ActionType.SLIDES, ActionType.INFOGRAPHIC]:
            try:
                from app.services.renderer import render_action_to_image, PLAYWRIGHT_AVAILABLE
                if PLAYWRIGHT_AVAILABLE:
                    print(f"📸 [Renderer] เรนเดอร์ {request.action_type.value} ไปยังภาพ Base64...")
                    base64_img = await render_action_to_image(request.action_type.value, clean_answer)
                    clean_answer = base64_img
                    print(f"✅ [Renderer] เรนเดอร์สำเร็จ ความยาวภาพ: {len(base64_img)} ตัวอักษร")
                else:
                    print(f"⚠️ [Renderer Warning] Playwright ยังไม่ได้ติดตั้ง จะใช้เนื้อหาแบบ JSON แทน")
            except Exception as render_err:
                print(f"⚠️ [Renderer Error] เกิดข้อผิดพลาดในการเรนเดอร์ภาพ: {render_err} ระบบจะใช้งาน JSON แทน")

        return ActionGenerateResponse(
            action_type=request.action_type,
            prompt=prompt,
            answer=clean_answer,
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