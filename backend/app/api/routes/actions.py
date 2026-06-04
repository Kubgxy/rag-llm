import json
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.schemas import ActionGenerateRequest, ActionGenerateResponse, ActionType, ActionUpdateRequest
from app.services import llm_service, document_processor, session_service
from app.database import get_db
from app.db_models import User, GeneratedAction
from app.services.auth_service import get_current_user
import uuid as uuid_mod

router = APIRouter(prefix="/actions", tags=["Actions"])

# 1. ทาโกะเติมบรรทัดประกาศฟังก์ชันที่หายไปให้ครับ
def _build_action_prompt(action_type: ActionType, language: str, user_goal: Optional[str], detail_level: str = "concise") -> str:
    if action_type == ActionType.MINDMAP:
        return document_processor.build_mindmap_prompt(language=language, user_goal=user_goal)

    lang_instruction = f"ข้อมูลทั้งหมดใน JSON ต้องเป็นภาษา: {'ไทย (Thai)' if language.lower() == 'th' else 'English'}"

    if action_type == ActionType.CHART:
        base = """คุณคือ Data Analyst ผู้เชี่ยวชาญด้าน Data Visualization
หน้าที่ของคุณคือวิเคราะห์ข้อมูลจากเอกสาร สกัดข้อมูลเชิงตัวเลข และออกแบบโครงสร้างกราف

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
        if detail_level == "detailed":
            base = """คุณคือผู้เชี่ยวชาญด้านการจัดทำสไลด์นำเสนอเชิงลึก (In-Depth Presentation Expert)
หน้าที่ของคุณคืออ่านและวิเคราะห์ "ข้อมูลจากเอกสาร" ทั้งหมดอย่างละเอียดถี่ถ้วน ครอบคลุมทุกหน้าและทุกหัวข้อ จากนั้นสกัดเนื้อหาหลักทั้งหมดออกมาเป็นหน้าสไลด์เชิงลึกเพื่อทำเป็น Presentation ที่สมบูรณ์แบบและเปี่ยมด้วยเนื้อหาที่แน่นเป็นพิเศษ

[คำเตือนขั้นสูงสุด / CRITICAL WARNING]:
1. ข้อมูลทั้งหมดต้องมาจากเอกสารเท่านั้น ห้ามมโน (No Hallucination) ห้ามใช้คำกว้างๆ หรือคำครอบจักรวาล (เช่น "บทนำ", "ลักษณะสำคัญ", "ประโยชน์", "ระบบอัจฉริยะ", "วัตถุประสงค์", "สรุป") เป็นชื่อหัวข้อสไลด์เด็ดขาด!
2. ต้องระบุเจาะจงชื่อโครงการ ชื่อระบบ ชื่อฝ่าย หรือชื่อเทคโนโลยีจริงที่ปรากฏในเอกสารขึ้นมาเป็นหัวข้อสไลด์ (slide_title) เช่น "โครงการ Smart Farm Monitoring" หรือ "ระบบบริหาร RAG-LLM"
3. ห้ามตกหล่นข้อมูลสำคัญ! หากเอกสารกล่าวถึงหลายเรื่อง หลายโครงการ หรือหลายหัวข้อย่อย คุณต้องสร้างสไลด์แยกกันสำหรับแต่ละเรื่อง/แต่ละโครงการโดยเฉพาะ เพื่ออธิบายรายละเอียดให้ลึกซึ้งและครบถ้วนที่สุด
4. **ห้ามสรุปข้อความจนสั้นเด็ดขาด!** แต่ละจุดย่อย (key_points) ต้องได้รับการอธิบายขยายความเชิงลึก มีหลักการ รายละเอียดเชิงลึก เหตุและผล หรือตัวเลขเชิงสถิติจริงประกอบ และห้ามมีเนื้อหาที่ต่ำกว่า 3 ข้อเด็ดขาดต่อสไลด์

[เงื่อนไขการทำงานสำหรับสไลด์ละเอียดพิเศษ]:
1. ตอบกลับเป็น Raw JSON Object เท่านั้น ห้ามมีข้อความเกริ่นนำหรือปิดท้ายใดๆ นอกเหนือจาก JSON
2. แต่ละหน้าสไลด์ต้องมี 'slide_description' เพื่อเขียนสรุปภาพรวมเชิงนโยบายอย่างกว้างขวางและเจาะลึก (ความยาว 55-65 คำ เสมอ!)
3. แต่ละหน้าสไลด์ต้องระบุ 'layout_type' เสมอ โดยเลือกจาก: ["hero", "grid-card", "timeline", "stat", "split-media"] ตามความสอดคล้องเชิงความหมายของเนื้อหาในหน้านั้นๆ (เช่น สไลด์เปิดหรือสไลด์หัวข้อหลักที่เน้นรูปภาพและคำบรรยายเดี่ยวให้เลือก 'hero' หรือ 'split-media', สไลด์นำเสนอหลายประเด็นที่มีหัวข้อย่อยเท่าๆ กันให้เลือก 'grid-card', สไลด์กระบวนการหรือขั้นตอนเชิงลำดับเวลาให้เลือก 'timeline', สไลด์สรุปตัวเลขสถิติหรือดัชนีชี้วัดหลักให้เลือก 'stat')
4. หน้าสไลด์ต้องมี 'key_points' 3-4 ข้อ และ**แต่ละข้อต้องมีความยาว 35-55 คำ ห้ามต่ำกว่านี้เด็ดขาด** (โดยต้องเขียนอธิบายรายละเอียดเป็นประโยคยาวๆ 2-3 ประโยคประกอบกัน ห้ามสรุปเป็นข้อสั้นๆ หรือคำเดี่ยวๆ เพื่อให้เต็มพื้นที่หน้าจอและจัดวางองค์ประกอบ UI ได้สมดุลสวยงาม)
5. บังคับเลือก 'icon_name' จากรายการนี้เท่านั้น: [database, server, shield-check, users, bar-chart, activity, cpu, cloud-lightning]
6. ต้องแบ่งหน้าสไลด์ (slides) แยกกันอย่างอิสระตามหัวข้อหรือโครงการจริง โดยแนะนำสร้าง 7-12 หน้าสไลด์ขึ้นไป

[โครงสร้าง JSON ที่บังคับ (พร้อมตัวอย่างดีเทลเชิงลึกหลากเลย์เอาต์)]:
{
  "title": "รายงานวิเคราะห์ข้อมูลและระบบไอทีขององค์กร",
  "audience": "ผู้บริหารระดับสูงและสถาปนิกด้านซอฟต์แวร์",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "โครงการสถาปัตยกรรม Smart Farm Monitoring ผ่านคลาวด์",
      "icon_name": "cpu",
      "layout_type": "hero",
      "slide_description": "ภาพรวมและโครงสร้างเชิงลึกของสถาปัตยกรรมระบบ Smart Farm Monitoring ซึ่งออกแบบขึ้นเพื่อเฝ้าระวังและเก็บสถิติด้านการเกษตรผ่านเทคโนโลยีคลาวด์ โดยระบบนี้มุ่งเน้นการประมวลผลข้อมูลเซ็นเซอร์ความชื้นและอุณหภูมิในระดับเรียลไทม์เพื่อมอบข้อมูลที่มีความแม่นยำสูงแก่ผู้ควบคุมฟาร์มทั่วประเทศในรูปแบบที่เข้าใจง่ายและสอดคล้องกับมาตรฐานอุตสาหกรรมยุคใหม่",
      "key_points": [
        "สถาปัตยกรรมนี้ใช้เซ็นเซอร์วัดความชื้นในดินและอุณหภูมิอากาศจำนวนมากกว่า 150 จุดทั่วแปลงเกษตร เพื่อส่งข้อมูลดิบเข้ามาประมวลผลที่ระบบคลาวด์ส่วนกลางทุกๆ 10 วินาที ทำให้ได้สถิติที่มีค่าความคลาดเคลื่อนต่ำกว่า 0.05% ซึ่งนำไปใช้ต่อยอดในอัลกอริทึมพยากรณ์อากาศได้ทันที",
        "ระบบการเชื่อมต่อถูกขับเคลื่อนผ่านโปรโตคอล MQTT บนเครือข่ายสถาปัตยกรรม LoRaWAN ที่มีคุณสมบัติเด่นในการประหยัดพลังงานระดับสูง ช่วยให้แบตเตอรี่ของอุปกรณ์เซ็นเซอร์ภาคสนามมีอายุการใช้งานยืนยาวสูงสุดถึง 5 ปีเต็มโดยไม่ต้องเปลี่ยนบ่อยครั้ง ส่งผลให้ลดค่าใช้จ่ายการซ่อมบำรุงรักษาไปได้มากถึง 45%",
        "ชุดประมวลผลข้อมูลหลักเลือกใช้เซิร์ฟเวอร์ Apache Kafka ร่วมกับฐานข้อมูลยืดหยุ่นสูง เพื่อรองรับการนำเข้าข้อมูลขนาดใหญ่พิเศษที่มีอัตราการเขียนข้อมูลแบบเรียลไทม์สูงถึง 5,000 รายการต่อวินาที ทำให้ทีมวิเคราะห์สามารถเรียกดูแดชบอร์ดสรุปผลการเก็บเกี่ยวได้ทันทีโดยไม่มีการหน่วงหรือสะดุดของระบบ"
      ]
    },
    {
      "slide_number": 2,
      "slide_title": "ขั้นตอนกระบวนการดึงข้อมูลของระบบ Smart Farm",
      "icon_name": "server",
      "layout_type": "timeline",
      "slide_description": "ขั้นตอนเชิงระบบในการสับเปลี่ยนและส่งผ่านสัญญาณข้อมูลเซ็นเซอร์ความร้อนและความชื้นดิบจากแปลงเกษตรเพื่อแปลงรูปเป็นอินไซด์ที่มีประโยชน์",
      "key_points": [
        "ขั้นตอนแรก: เซ็นเซอร์ภาคสนามเก็บตัวอย่างความชื้นและส่งสัญญาณไร้สายดิบผ่าน LoRaWAN Gateway ไปยังเครือข่ายขององค์กรอย่างปลอดภัย",
        "ขั้นตอนสอง: ระบบเกตเวย์รับข้อมูลดิบและทำการกรองสัญญาณรบกวนก่อนนำส่งเข้าคิวสตรีมมิ่งผ่าน Apache Kafka เพื่อรอการกระจายไปยังดาต้าสโตร์",
        "ขั้นตอนสาม: ดาต้าสโตร์ทำการบันทึกและประมวลผลผลลัพธ์พร้อมทั้งดึงสคริปต์ RAG มาตอบข้อซักถามขึ้นแสดงผลบนแดชบอร์ดของผู้ใช้งานทันที"
      ]
    }
  ]
}"""
        else:
            base = """คุณคือผู้เชี่ยวชาญด้านการจัดทำสไลด์นำเสนอ (Presentation Expert)
หน้าที่ของคุณคืออ่านและวิเคราะห์ "ข้อมูลจากเอกสาร" ทั้งหมดและสกัดเนื้อหาหลักสรุปภาพรวมออกมาเป็นหน้าสไลด์ที่กระชับ ครอบคลุม และเข้าใจง่ายเป็นพิเศษ

[คำเตือนขั้นสูงสุด / CRITICAL WARNING]:
1. ข้อมูลทั้งหมดต้องมาจากเอกสารเท่านั้น ห้ามมโน (No Hallucination)
2. สรุปความกระชับ ตรงประเด็น เหมาะสำหรับสไลด์ที่เน้นภาพรวมรวดเร็ว

[เงื่อนไขการทำงานสำหรับสไลด์สรุปกระชับ]:
1. ตอบกลับเป็น Raw JSON Object เท่านั้น ห้ามมีข้อความเกริ่นนำหรือปิดท้าย
2. แต่ละหน้าสไลด์มี 'slide_description' สรุปใจความสำคัญที่เข้าใจง่าย (ความยาว 15-25 คำ)
3. แต่ละหน้าสไลด์ต้องระบุ 'layout_type' เสมอ โดยเลือกจาก: ["hero", "grid-card", "timeline", "stat", "split-media"] ตามความสอดคล้องเชิงความหมายของเนื้อหา
4. แต่ละหน้าสไลด์มี 'key_points' 3 ข้อ และแต่ละข้อเขียนสรุปประเด็นหลักสั้นๆ ชัดเจน (ความยาว 10-20 คำต่อข้อ)
5. บังคับเลือก 'icon_name' จากรายการนี้เท่านั้น: [database, server, shield-check, users, bar-chart, activity, cpu, cloud-lightning]
6. แนะนำสร้างสไลด์จำนวน 5-8 หน้าให้ครอบคลุมประเด็นหลัก

[โครงสร้าง JSON ที่บังคับ (พร้อมตัวอย่างสรุปกระชับหลากเลย์เอาต์)]:
{
  "title": "สรุปผลโครงการ Smart Farm",
  "audience": "ผู้สนใจทั่วไป",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "สถาปัตยกรรมระบบ Smart Farm",
      "icon_name": "cpu",
      "layout_type": "hero",
      "slide_description": "สรุปโครงสร้างระบบเฝ้าระวังการเกษตรอัจฉริยะผ่านคลาวด์เพื่อช่วยเพิ่มประสิทธิภาพในการทำฟาร์มยุคใหม่",
      "key_points": [
        "ติดตั้งอุปกรณ์เซ็นเซอร์ทั่วแปลงเกษตรเพื่อวัดความชื้นและอุณหภูมิเรียลไทม์",
        "ส่งข้อมูลผ่านเครือข่ายประหยัดพลังงาน LoRaWAN ยืดอายุแบตเตอรี่ได้สูงสุด 5 ปี",
        "ใช้ระบบประมวลผลความเร็วสูงเพื่อวิเคราะห์สถิติขึ้นแดชบอร์ดทันที"
      ]
    },
    {
      "slide_number": 2,
      "slide_title": "ประสิทธิภาพด้านสิ่งแวดล้อมและการประหยัด",
      "icon_name": "bar-chart",
      "layout_type": "stat",
      "slide_description": "ตัวบ่งชี้ประสิทธิภาพของโครงการเกษตรอัจฉริยะในการลดต้นทุนและเพิ่มผลผลิตประเมินในรอบ 1 ปี",
      "key_points": [
        "ประสิทธิภาพลดการใช้น้ำลงได้มากถึง 30% จากระบบควบคุมอัจฉริยะ",
        "ประหยัดพลังงานไฟฟ้ารอบปีคิดเป็นมูลค่าลดลงกว่า 25% ด้วย LoRaWAN",
        "ผลผลิตผลิตเพิ่มขึ้น 15% จากการคาดคะเนโรคและศัตรูพืชล่วงหน้า"
      ]
    }
  ]
}"""

    elif action_type == ActionType.INFOGRAPHIC:
        base = """คุณคือ UI/UX Designer และ Data Storyteller สาย Professional
หน้าที่ของคุณคือสรุปข้อมูลจาก "เนื้อหาในเอกสารที่แนบมา (Context)" เพื่อออกแบบโครงสร้างอินโฟกราฟิกที่มีเนื้อหาแน่น กระชับ และตรงประเด็นที่สุด

[คำเตือนขั้นสูงสุด / CRITICAL WARNING]:
1. ข้อมูลทั้งหมดต้องมาจากเอกสารเท่านั้น ห้ามมโน (No Hallucination) ห้ามใช้คำกว้างๆ หรือคำครอบจักรวาล (เช่น "ลักษณะสำคัญ", "ประโยชน์", "ระบบอัจฉริยะ") ต้องระบุเจาะจงไปเลยว่าเอกสารพูดถึงเรื่องอะไร
2. หากเอกสารไม่มีตัวเลขสถิติ ให้สกัด "ข้อมูลที่สำคัญที่สุด" ออกมาเป็นคะแนน หรือตัวชี้วัดเชิงคุณภาพแทน ห้ามเว้นว่าง

[เงื่อนไขการทำงาน]:
1. ตอบกลับเป็น Raw JSON Object เท่านั้น
2. 'key_stats' ต้องมี 2-4 รายการ (สกัดตัวเลขหรือข้อมูลเด่น)
3. 'sections' ต้องมี 3-4 หัวข้อ เพื่อให้อินโฟกราฟิกดูสมบูรณ์
4. 'summary' ของแต่ละ section ต้องอธิบายเนื้อหาอย่างน้อย 15-25 คำ
5. 'highlights' ของแต่ละ section ต้องมี 3-4 ข้อ และแต่ละข้อต้องมีความยาว 10-20 คำ (เพื่อให้เต็มพื้นที่ UI)
6. บังคับเลือก 'icon_name' จากรายการนี้เท่านั้น: [database, server, shield-check, users, bar-chart, activity, cpu, cloud-lightning]

[โครงสร้าง JSON ที่บังคับ (แทนที่ <...> ด้วยเนื้อหาจริงที่เจาะลึกจากเอกสารเท่านั้น)]:
{
  "headline": "<ชื่อหัวข้อหลักที่เจาะจงเนื้อหาเอกสารจริง>",
  "subheadline": "<สรุปใจความสำคัญที่สุด 1 ประโยค (ประมาณ 15-20 คำ)>",
  "theme": "ocean",
  "visual_style": "modern-card",
  "key_stats": [
    { 
      "label": "<ชื่อข้อมูล/สถิติที่ 1>", 
      "value": "<ตัวเลขหรือคีย์เวิร์ด>", 
      "unit": "<หน่วย (ถ้ามี)>" 
    }
  ],
  "sections": [
    {
      "title": "<ชื่อหัวข้อประเด็นหลักที่ 1 (เจาะจงเนื้อหา)>",
      "summary": "<อธิบายภาพรวมของหัวข้อนี้อย่างละเอียด (15-25 คำ)>",
      "icon_name": "<icon_name>",
      "highlights": [
        "<ประเด็นย่อยที่ 1 ลงรายละเอียดจริง (10-20 คำ)>",
        "<ประเด็นย่อยที่ 2 ลงรายละเอียดจริง (10-20 คำ)>",
        "<ประเด็นย่อยที่ 3 ลงรายละเอียดจริง (10-20 คำ)>"
      ]
    }
  ],
  "conclusion": "<สรุปเนื้อหาทั้งหมดอีกครั้งในเชิงลึก (15-25 คำ)>"}"""
    else:
        raise ValueError(f"Unsupported action type: {action_type}")

    goal_text = f"\n[เป้าหมายเพิ่มเติมจากผู้ใช้]: {user_goal.strip()}" if user_goal and user_goal.strip() else ""
    
    # รวมโครงสร้าง Prompt ทั้งหมด
    final_prompt = f"{base}\n\n{lang_instruction}{goal_text}\n\n[เริ่มสร้าง JSON]:"
    return final_prompt


@router.post("/generate", response_model=ActionGenerateResponse)
async def generate_action(
    request: ActionGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    สร้างผลลัพธ์เฉพาะทางจากเอกสารใน session เดียวกัน (2-Step Pipeline)
    """
    session_uuid = uuid_mod.UUID(request.session_id)
    # ตรวจสอบสิทธิ์ความเป็นเจ้าของของเซสชัน
    session = await session_service.get_session(
        db, session_id=session_uuid, user_id=current_user.id
    )
    if session is None:
        raise HTTPException(status_code=404, detail="ไม่พบแชทเซสชันนี้")

    try:
        content_model_name = settings.DEFAULT_LLM_MODEL
        
        search_term = request.user_goal if request.user_goal else "สรุปเนื้อหาสาระสำคัญและข้อมูลเชิงลึกทั้งหมดจากเอกสารนี้"
        
        detail_emphasis = ""
        if request.action_type == ActionType.SLIDES and request.detail_level == "detailed":
            detail_emphasis = (
                "เน้นย้ำความยาวและเชิงลึกเป็นพิเศษ: จงสกัดรายละเอียดทางเทคนิค ข้อเท็จจริง ตัวเลขสถิติ ชื่อโครงการ/ระบบ ขั้นตอน "
                "และข้อมูลอธิบายเชิงลึกย่อยๆ ทั้งหมดอย่างละเอียดและมีความยาวเต็มอิ่ม (Exhaustive Technical Details) เพื่อเป็นข้อมูลดิบ"
                "ที่เพียงพอสำหรับการจัดสไลด์ที่มีคำอธิบาย 55-65 คำ และ bullet points ยาว 35-55 คำต่อสไลด์\n"
            )
        elif request.action_type == ActionType.SLIDES:
            detail_emphasis = (
                "เน้นสรุปภาพรวมและใจความสำคัญที่กระชับ ตรงประเด็น เหมาะสำหรับสไลด์สรุปแบบภาพรวมที่ย่นย่อ\n"
            )

        selected_files_str = f"เฉพาะไฟล์ที่เลือก: {', '.join(request.selected_files)}" if request.selected_files else "ทุกไฟล์ที่มีในระบบ"
        extract_prompt = (
            f"จงสรุปและสกัดเนื้อหาสาระสำคัญทั้งหมดจากเอกสาร {selected_files_str} อย่างละเอียดและครอบคลุมครบถ้วนที่สุด เพื่อนำไปทำ {request.action_type.value}\n"
            f"{detail_emphasis}"
            f"คำเตือนสำคัญ: ห้ามตกหล่นไฟล์ใดไฟล์หนึ่งเด็ดขาด หากผู้ใช้อัปโหลดมาหลายไฟล์ คุณต้องวิเคราะห์และสกัดเนื้อหาหลักของแต่ละไฟล์มาอย่างครบถ้วน โดยแบ่งสรุปแยกตามหัวข้อหรือแยกตามรายชื่อเอกสารอย่างชัดเจนในเนื้อหา\n"
            f"เป้าหมายเพิ่มเติมจากผู้ใช้: {search_term}"
        )
        
        # สไลด์ อินโฟกราฟิก และไมน์แมป ต้องการเห็นเนื้อหาเอกสารแบบกว้างขวางเพื่อสกัดข้อมูลให้ครบถ้วน
        if request.action_type in [ActionType.SLIDES, ActionType.INFOGRAPHIC, ActionType.MINDMAP]:
            action_top_k = 30 if request.detail_level == "detailed" else 20
        else:
            action_top_k = None
        
        print(f"🔄 [Step 1] กำลังให้ {content_model_name} สกัดเนื้อหาด้วย top_k={action_top_k} สำหรับ {selected_files_str}...")
        step1_result = await llm_service.query_with_context(
            query=extract_prompt,
            session_id=request.session_id,
            model_name=content_model_name,
            search_query=search_term,
            top_k=action_top_k,
            selected_files=request.selected_files
        )
        extracted_content = step1_result.get("answer") or ""
        citations = step1_result.get("citations")
        
        # Step 2: ให้ Coder Model นำเนื้อหาที่สรุปได้จัดฟอร์แมตเป็น JSON
        coder_model_name = settings.ACTION_LLM_MODEL
        json_schema_prompt = _build_action_prompt(
            request.action_type,
            request.language,
            request.user_goal,
            detail_level=request.detail_level or "concise"
        )
        
        # แจ้ง Coder ว่าไม่ต้องไปค้นหาแล้ว ให้เอาเนื้อหาจาก Step 1 ไปจัด JSON เลย
        final_prompt = (
            f"จากเนื้อหาที่สรุปมาให้ด้านล่างนี้:\n"
            f"---------------------\n"
            f"{extracted_content}\n"
            f"---------------------\n"
            f"{json_schema_prompt}"
        )
        
        print(f"🔄 [Step 2] กำลังให้ {coder_model_name} จัดโครงสร้าง JSON...")
        # ใน Step 2 ใช้ query_direct เพื่อประมวลผลตรงๆ ป้องกันการดึง Context ซ้ำซ้อนและลดการโหลดหน่วยความจำ GPU
        step2_result = await llm_service.query_direct(
            query=final_prompt,
            model_name=coder_model_name
        )

        answer = step2_result.get("answer") or ""
        clean_answer = answer.replace("```json", "").replace("```markdown", "").replace("```", "").strip()

        # ซ่อมแซม newlines ใน JSON string ป้องกัน error สำหรับสไลด์และอินโฟกราฟิก
        if request.action_type in [ActionType.SLIDES, ActionType.INFOGRAPHIC, ActionType.CHART]:
            try:
                from app.services.renderer import repair_json_newlines
                clean_answer = repair_json_newlines(clean_answer)
            except Exception as repair_err:
                print(f"⚠️ [JSON Repair Warning] เกิดข้อผิดพลาดในการซ่อมแซม JSON: {repair_err}")

        if request.action_type == ActionType.MINDMAP:
            parsed_mindmap = document_processor.parse_mindmap_markdown(clean_answer)
            clean_answer = json.dumps(parsed_mindmap, ensure_ascii=False)

        elif request.action_type in [ActionType.SLIDES, ActionType.INFOGRAPHIC]:
            # ในระบบใหม่แบบ Pure JSON Handover (Gamma.app Model)
            # เราจะบายพาสการเรนเดอร์ภาพนิ่ง Playwright บน Backend และส่ง Raw JSON กลับไปให้ Frontend ทำการวาดแบบ Responsive โดยตรง
            print(f"⚡ [Pure JSON Handover] บายพาสการเรนเดอร์ Playwright และส่ง JSON โครงสร้างตรงไปยัง Frontend")

        # ให้ LLM เจนชื่อสไลด์/Action หัวข้อสรุปจากข้อมูลภาษาไทย (ไม่เกิน 10 คำ)
        action_title = None
        try:
            title_prompt = (
                f"จงตั้งชื่อสรุปหัวข้อที่กระชับมาก ห้ามเกิน 10 คำ สำหรับข้อมูลต่อไปนี้ เพื่อใช้แสดงเป็นชื่อเรื่องของ {request.action_type.value}:\n"
                f"---------------------\n"
                f"{extracted_content[:1500]}\n"
                f"---------------------\n"
                f"กฎเหล็ก: ตอบเฉพาะตัวข้อความชื่อเรื่องภาษาไทยเท่านั้น ห้ามมีคำนำหน้า เช่น 'ชื่อหัวข้อ:', 'สรุป:', หรือข้อความอธิบายอื่นใดเด็ดขาด ห้ามมีเครื่องหมายอัญประกาศครอบ"
            )
            print(f"🏷️ [Title Generator] กำลังเจนชื่อ Action หัวข้อด้วย {content_model_name}...")
            title_result = await llm_service.query_direct(
                query=title_prompt,
                model_name=content_model_name
            )
            raw_title = title_result.get("answer") or ""
            # คลีนข้อความขยะ
            cleaned_title = raw_title.replace('"', '').replace("'", "").replace("“", "").replace("”", "").replace("ชื่อหัวข้อ:", "").replace("สรุป:", "").strip()
            if cleaned_title:
                # ตัดให้เหลือไม่เกิน 50 ตัวอักษรเพื่อความกระชับไม่เกิน 10 คำ
                if len(cleaned_title) > 50:
                    cleaned_title = cleaned_title[:47] + "..."
                action_title = cleaned_title
                print(f"✅ [Title Generator] เจนชื่อสำเร็จ: {action_title}")
        except Exception as title_err:
            print(f"⚠️ [Title Generator Warning] เกิดข้อผิดพลาดในการเจนชื่อหัวข้อ: {title_err}")

        # บันทึกข้อมูล Action ลง PostgreSQL
        db_action = GeneratedAction(
            session_id=session_uuid,
            user_id=current_user.id,
            action_type=request.action_type.value,
            title=action_title,
            prompt=final_prompt,
            answer=clean_answer,
            thinking=step2_result.get("thinking") or step1_result.get("thinking"),
            model_name=f"{content_model_name} + {coder_model_name}",
            citations=citations,
        )
        db.add(db_action)
        await db.commit()
        await db.refresh(db_action)

        return ActionGenerateResponse(
            id=str(db_action.id),
            title=db_action.title,
            action_type=db_action.action_type,
            prompt=db_action.prompt or "",
            answer=db_action.answer,
            thinking=db_action.thinking,
            model_name=db_action.model_name,
            citations=db_action.citations,
            created_at=db_action.created_at.timestamp() * 1000,
            editor_state=db_action.editor_state,
        )
    except Exception as e:
        print(f"❌ [Action Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการสร้าง Action: {str(e)}",
        )


@router.get("/session/{session_id}", response_model=List[ActionGenerateResponse])
async def get_session_actions(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ดึงผลลัพธ์ Action ทั้งหมดที่เคยสร้างไว้ใน session นี้จาก PostgreSQL
    """
    session_uuid = uuid_mod.UUID(session_id)
    # ตรวจสอบสิทธิ์ความเป็นเจ้าของของเซสชัน
    session = await session_service.get_session(
        db, session_id=session_uuid, user_id=current_user.id
    )
    if session is None:
        raise HTTPException(status_code=404, detail="ไม่พบแชทเซสชันนี้")

    try:
        result = await db.execute(
            select(GeneratedAction)
            .where(GeneratedAction.session_id == session_uuid)
            .order_by(GeneratedAction.created_at.desc())
        )
        actions = result.scalars().all()

        return [
            ActionGenerateResponse(
                id=str(a.id),
                title=a.title,
                action_type=a.action_type,
                prompt=a.prompt or "",
                answer=a.answer,
                thinking=a.thinking,
                model_name=a.model_name,
                citations=a.citations,
                created_at=a.created_at.timestamp() * 1000,
                editor_state=a.editor_state,
            )
            for a in actions
        ]
    except Exception as e:
        print(f"❌ [Action Retrieval Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการดึงรายการ Action: {str(e)}"
        )


@router.post("/update/{action_id}", response_model=ActionGenerateResponse)
async def update_action(
    action_id: str,
    request: ActionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    อัปเดตผลลัพธ์ Action (สไลด์/อินโฟ) ที่บันทึกไว้ใน PostgreSQL (รวมถึง editor_state และ answer ล่าสุด)
    """
    try:
        action_uuid = uuid_mod.UUID(action_id)
        
        result = await db.execute(
            select(GeneratedAction).where(GeneratedAction.id == action_uuid)
        )
        db_action = result.scalar_one_or_none()
        
        if not db_action:
            raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูล Action ID: {action_id}")
            
        if db_action.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์แก้ไข Action นี้")

        # อัปเดตข้อมูล
        if request.editor_state is not None:
            db_action.editor_state = request.editor_state
        if request.answer is not None:
            db_action.answer = request.answer

        await db.commit()
        await db.refresh(db_action)

        print(f"💾 [Actions Storage] Updated action {action_id} in PostgreSQL")
        
        return ActionGenerateResponse(
            id=str(db_action.id),
            title=db_action.title,
            action_type=db_action.action_type,
            prompt=db_action.prompt or "",
            answer=db_action.answer,
            thinking=db_action.thinking,
            model_name=db_action.model_name,
            citations=db_action.citations,
            created_at=db_action.created_at.timestamp() * 1000,
            editor_state=db_action.editor_state,
        )
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print(f"❌ [Action Update Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการอัปเดต Action: {str(e)}"
        )