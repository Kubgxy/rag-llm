import uuid as uuid_mod
from fastapi import APIRouter, HTTPException, Request, Depends
import asyncio
import re
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import ChatRequest, ChatResponse, ChatTitleRequest, CompareRequest, CompareResponse
from app.services import llm_service, runtime_manager
from app.services import session_service
from app.database import get_db
from app.db_models import User
from app.services.auth_service import get_current_user
from app.services.guardrails_service import guardrails_service


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/single", response_model=ChatResponse)
async def chat_single(
    request: ChatRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ถามคำถามกับ LLM โดยใช้ context จาก Vector Store + conversation memory

    Args:
        request: ChatRequest ที่มี query, model_name, session_id

    Returns:
        ChatResponse พร้อมคำตอบจาก LLM (อาจมี thinking blocks)
    """
    session_uuid = uuid_mod.UUID(request.session_id)
    # ตรวจสอบสิทธิ์ความเป็นเจ้าของของเซสชัน
    session = await session_service.get_session(
        db, session_id=session_uuid, user_id=current_user.id
    )
    if session is None:
        # หากไม่พบเซสชันในระบบ (กรณีพึ่งสร้างห้องแชทใหม่ในหน้าบ้าน) ให้สร้างใน DB ทันที
        session = await session_service.create_session(
            db,
            user_id=current_user.id,
            title="New Chat",
            model_name=request.model_name,
            session_id=session_uuid
        )

    # ลงทะเบียน request สำหรับ tracking
    request_id = runtime_manager.register_request()
    
    try:
        print(f"💬 [API] ได้รับคำถาม: {request.query}")
        print(f"   Session: {request.session_id}, Model: {request.model_name}, RequestID: {request_id[:8]}")

        # ตรวจสอบว่า client ยังเชื่อมต่ออยู่หรือไม่
        if await http_request.is_disconnected():
            print(f"⚠️ [Chat] Client disconnected before processing (RequestID: {request_id[:8]})")
            raise HTTPException(status_code=499, detail="Client closed request")

        session_uuid = uuid_mod.UUID(request.session_id)

        # 1. ดึง conversation memory (ดึงเฉพาะประวัติก่อนหน้านี้ ก่อนจะเซฟข้อความปัจจุบัน)
        memory_context = await session_service.get_conversation_memory(db, session_id=session_uuid)

        # 2. บันทึก user message ลง DB
        await session_service.save_message(
            db, session_id=session_uuid, role="user",
            content=request.query, model_name=request.model_name,
        )

        # 2.5 Security check (Input Guardrails + RBAC)
        system_session_id = session.system_session_id if session else None
        
        guard_res = await guardrails_service.check_input_guardrails(
            db=db,
            user=current_user,
            system_session_id=system_session_id,
            query=request.query
        )
        
        if not guard_res["allowed"]:
            blocked_reason = guard_res["reason"]
            
            # บันทึก assistant message แจ้งเตือนปฏิเสธลง DB
            await session_service.save_message(
                db, session_id=session_uuid, role="assistant",
                content=blocked_reason,
                thinking="[Blocked by Guardrails]",
                model_name=request.model_name,
                citations=[]
            )
            
            return ChatResponse(
                query=request.query,
                thinking="[Blocked by Guardrails]",
                answer=blocked_reason,
                model_name=request.model_name,
                citations=[]
            )

        # 3. ถามคำถาม (พร้อม memory context และ filter_employee_email)
        filter_employee_email = guard_res["filter_employee_email"]
        
        result = await llm_service.query_with_context(
            query=request.query,
            session_id=request.session_id,
            model_name=request.model_name,
            memory_context=memory_context,
            filter_employee_email=filter_employee_email,
        )

        # 3.5 Output Guardrails (PII Masking)
        raw_answer = result.get("answer", "")
        redacted_answer = await guardrails_service.redact_pii(db, raw_answer)
        result["answer"] = redacted_answer

        # 4. บันทึก assistant response ลง DB
        await session_service.save_message(
            db, session_id=session_uuid, role="assistant",
            content=result.get("answer", ""),
            thinking=result.get("thinking"),
            model_name=request.model_name,
            citations=result.get("citations"),
        )

        return ChatResponse(
            query=request.query,
            thinking=result.get("thinking"),
            answer=result.get("answer"),
            model_name=request.model_name,
            citations=result.get("citations")
        )

    except asyncio.CancelledError:
        print(f"⚠️ [Chat] Request cancelled (RequestID: {request_id[:8]})")
        raise HTTPException(status_code=499, detail="Request cancelled")
    except Exception as e:
        print(f"❌ [Chat Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการตอบคำถาม: {str(e)}"
        )
    finally:
        # ยกเลิกการลงทะเบียน request
        runtime_manager.unregister_request(request_id)
        print(f"✅ [Chat] Request completed (RequestID: {request_id[:8]})")


@router.post("/suggest-title")
async def suggest_title(
    request: ChatTitleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    สร้างชื่อแชทที่กระชับจากประโยคแรกของผู้ใช้

    Args:
        request: ChatTitleRequest ที่มี query และ optional model_name

    Returns:
        JSON with 'title' key (max 30 chars)
    """
    if request.session_id:
        session_uuid = uuid_mod.UUID(request.session_id)
        session = await session_service.get_session(
            db, session_id=session_uuid, user_id=current_user.id
        )
        if session is None:
            raise HTTPException(status_code=404, detail="ไม่พบแชทเซสชันนี้")

    try:
        print(f"📝 [API] กำลังสร้างชื่อแชทจาก: {request.query[:50]}...")

        # สร้าง prompt เพื่อให้ LLM generalize
        title_prompt = (
            f"ให้สร้างชื่อเรื่องที่กระชับ 1-3 คำ ภาษาไทยเท่านั้น สำหรับคำถาม/หัวข้อต่อนี้:\n"
            f"\"{request.query}\"\n"
            f"ตอบเพียงชื่อเรื่องเท่านั้น ไม่มีตัวเลข ไม่มีคำอธิบาย:"
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

        title_text = str(response).strip()
        # Clean up: remove think tags, newlines, extra spaces, and take first 25 chars
        title_text = re.sub(r'<think>.*?</think>', '', title_text, flags=re.DOTALL).strip()
        title_text = ' '.join(title_text.split())[:25].strip()
        print(f"✅ [Title] สร้างชื่อสำเร็จ: {title_text}")

        if request.session_id:
            await session_service.update_session(
                db,
                session_id=session_uuid,
                user_id=current_user.id,
                title=title_text
            )

        return {"title": title_text}

    except Exception as e:
        print(f"❌ [Title Error] {str(e)}")
        # Return fallback title
        fallback_title = request.query[:30].strip()
        if request.session_id:
            try:
                await session_service.update_session(
                    db,
                    session_id=session_uuid,
                    user_id=current_user.id,
                    title=fallback_title
                )
            except Exception as update_err:
                print(f"⚠️ [Title Update Fallback Error] {str(update_err)}")
        return {"title": fallback_title}


@router.post("/compare", response_model=CompareResponse)
async def chat_compare(
    request: CompareRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ถามคำถามเดียวกันกับ 2 โมเดลแล้วเปรียบเทียบ

    Args:
        request: CompareRequest ที่มี query, model_a, model_b, session_id

    Returns:
        CompareResponse พร้อมคำตอบจากทั้ง 2 โมเดล
    """
    session_uuid = uuid_mod.UUID(request.session_id)
    # ตรวจสอบสิทธิ์ความเป็นเจ้าของของเซสชัน
    session = await session_service.get_session(
        db, session_id=session_uuid, user_id=current_user.id
    )
    if session is None:
        # หากไม่พบเซสชันในระบบ (กรณีพึ่งสร้างห้องแชทใหม่ในหน้าบ้าน) ให้สร้างใน DB ทันที
        session = await session_service.create_session(
            db,
            user_id=current_user.id,
            title="New Chat",
            session_type="arena",
            model_name=request.model_a,
            session_id=session_uuid
        )

    # ลงทะเบียน request สำหรับ tracking
    request_id = runtime_manager.register_request()
    
    try:
        if request.model_a == request.model_b:
            raise ValueError("โปรดเลือกโมเดลที่ต่างกัน")

        print(f"⚔️  [Compare] ถามทั้ง {request.model_a} และ {request.model_b}")
        print(f"   Query: {request.query}, RequestID: {request_id[:8]}")

        # ตรวจสอบว่า client ยังเชื่อมต่ออยู่หรือไม่
        if await http_request.is_disconnected():
            print(f"⚠️ [Compare] Client disconnected before processing")
            raise HTTPException(status_code=499, detail="Client closed request")

        session_uuid = uuid_mod.UUID(request.session_id)

        # ดึง conversation memory
        memory_context = await session_service.get_conversation_memory(db, session_id=session_uuid)

        # 2.5 Security check (Input Guardrails + RBAC)
        system_session_id = session.system_session_id if session else None
        
        guard_res = await guardrails_service.check_input_guardrails(
            db=db,
            user=current_user,
            system_session_id=system_session_id,
            query=request.query
        )
        
        if not guard_res["allowed"]:
            blocked_reason = guard_res["reason"]
            return CompareResponse(
                query=request.query,
                response_a=ChatResponse(
                    query=request.query,
                    thinking="[Blocked by Guardrails]",
                    answer=blocked_reason,
                    model_name=request.model_a,
                    citations=[]
                ),
                response_b=ChatResponse(
                    query=request.query,
                    thinking="[Blocked by Guardrails]",
                    answer=blocked_reason,
                    model_name=request.model_b,
                    citations=[]
                )
            )

        filter_employee_email = guard_res["filter_employee_email"]

        # Query ทั้ง 2 โมเดลพร้อมกัน
        result_a, result_b = await asyncio.gather(
            llm_service.query_with_context(
                query=request.query,
                session_id=request.session_id,
                model_name=request.model_a,
                memory_context=memory_context,
                filter_employee_email=filter_employee_email,
            ),
            llm_service.query_with_context(
                query=request.query,
                session_id=request.session_id,
                model_name=request.model_b,
                memory_context=memory_context,
                filter_employee_email=filter_employee_email,
            )
        )

        # 3.5 Output Guardrails (PII Masking)
        redacted_a = await guardrails_service.redact_pii(db, result_a.get("answer", ""))
        redacted_b = await guardrails_service.redact_pii(db, result_b.get("answer", ""))
        result_a["answer"] = redacted_a
        result_b["answer"] = redacted_b

        print(f"📊 [Result A] answer length: {len(result_a.get('answer', ''))}, content: '{result_a.get('answer', '')[:50]}'...")
        print(f"📊 [Result B] answer length: {len(result_b.get('answer', ''))}, content: '{result_b.get('answer', '')[:50]}'...")

        return CompareResponse(
            query=request.query,
            response_a=ChatResponse(
                query=request.query,
                thinking=result_a.get("thinking"),
                answer=result_a.get("answer"),
                model_name=request.model_a,
                citations=result_a.get("citations")
            ),
            response_b=ChatResponse(
                query=request.query,
                thinking=result_b.get("thinking"),
                answer=result_b.get("answer"),
                model_name=request.model_b,
                citations=result_b.get("citations")
            )
        )

    except asyncio.CancelledError:
        print(f"⚠️ [Compare] Request cancelled (RequestID: {request_id[:8]})")
        raise HTTPException(status_code=499, detail="Request cancelled")
    except ValueError as e:
        print(f"⚠️  [Compare Error] {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ [Compare Error] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการเปรียบเทียบ: {str(e)}"
        )
    finally:
        runtime_manager.unregister_request(request_id)
        print(f"✅ [Compare] Request completed (RequestID: {request_id[:8]})")
