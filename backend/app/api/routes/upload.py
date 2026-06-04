import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.schemas import UploadResponse
from app.services import document_processor
from app.services.auth_service import get_current_user
from app.database import get_db
from app.db_models import User, Document, ChatSession

router = APIRouter(prefix="/upload", tags=["Upload"])

MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB


@router.post("", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    อัพโหลดเอกสาร PDF และประมวลผลเป็น Vector Embeddings (บังคับใช้งาน JWT Token เสมอ)
    """
    print(f"\n{'🔵'*20} UPLOAD REQUEST {'🔵'*20}")
    print(f"📥 [API] ได้รับไฟล์: {file.filename}")
    print(f"📋 [API] Session ID: {session_id}")
    print(f"📦 [API] User: {current_user.username}")

    # 1. ตรวจสอบนามสกุลไฟล์
    ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.md', '.docx', '.pptx', '.csv', '.xlsx'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        print(f"❌ [API] นามสกุลไฟล์ไม่รองรับ: {file.filename}")
        raise HTTPException(
            status_code=400,
            detail=f"ไม่รองรับประเภทไฟล์นี้ รองรับเฉพาะ: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # 2. ตรวจสอบขนาดไฟล์ก่อนบันทึก (ถ้ามี metadata บอกขนาดไฟล์มา)
    if file.size and file.size > MAX_FILE_SIZE:
        print(f"❌ [API] ขนาดไฟล์เกินขีดจำกัด: {file.size} bytes")
        raise HTTPException(
            status_code=400,
            detail=f"ขนาดไฟล์ต้องไม่เกิน 30 MB (ไฟล์ของคุณมีขนาด: {file.size / (1024 * 1024):.2f} MB)"
        )

    # 3. ตรวจสอบความถูกต้องและสิทธิ์ในการเข้าถึง Session (Session Ownership)
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Session ID ไม่ถูกต้อง"
        )

    session = await db.get(ChatSession, session_uuid)
    if not session:
        # หากไม่พบเซสชันในระบบ (กรณีอัปโหลดไฟล์ในแชทที่พึ่งสร้างใหม่และยังไม่มีข้อความ) ให้สร้างใน DB ทันที
        from app.services import session_service
        session = await session_service.create_session(
            db,
            user_id=current_user.id,
            title="New Chat",
            session_id=session_uuid
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="คุณไม่มีสิทธิ์อัปโหลดเอกสารสำหรับ Session นี้"
        )

    # สร้างโฟลเดอร์ upload ถ้ายังไม่มี
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # กำหนดพาธไฟล์
    file_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}_{file.filename}")
    print(f"💾 [API] กำลังบันทึกไฟล์ไปที่: {file_path}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        
        # 2.1 ตรวจสอบขนาดไฟล์จริงหลังจากบันทึกลงดิสก์
        if file_size > MAX_FILE_SIZE:
            # หากเกินขนาดที่กำหนด ให้ลบไฟล์ออกจากเครื่องทันทีเพื่อไม่ให้เปลืองพื้นที่
            if os.path.exists(file_path):
                os.remove(file_path)
            print(f"❌ [API] ขนาดไฟล์จริงเกินขีดจำกัดหลังจากโหลดสำเร็จ: {file_size} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"ขนาดไฟล์ต้องไม่เกิน 30 MB (ขนาดไฟล์จริง: {file_size / (1024 * 1024):.2f} MB)"
            )

        print(f"✅ [API] บันทึกไฟล์สำเร็จ ({file_size} bytes)")

        # 4. บันทึกข้อมูลลงตาราง documents ใน SQL DB
        extension_map = {
            '.pdf': ('application/pdf', 'pdf'),
            '.txt': ('text/plain', 'txt'),
            '.md': ('text/markdown', 'md'),
            '.docx': ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'),
            '.pptx': ('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'),
            '.csv': ('text/csv', 'csv'),
            '.xlsx': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx')
        }
        mime_type, source_type = extension_map.get(ext, ("application/octet-stream", ext.strip('.')))
        
        db_doc = Document(
            session_id=session_uuid,
            file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type or mime_type,
            status="processing",
            source_type=source_type
        )
        db.add(db_doc)
        await db.commit()
        await db.refresh(db_doc)
        print(f"💾 [API] บันทึกตาราง documents สำเร็จ (ID: {db_doc.id})")

        # 5. ประมวลผลเอกสารใน Background Task (ใช้แบบบันทึก DB)
        print(f"🔄 [API] เพิ่ม background task สำหรับประมวลผล...")
        background_tasks.add_task(
            document_processor.process_document_db,
            str(db_doc.id),
            file_path,
            file.filename,
            session_id
        )

        response = UploadResponse(
            status="success",
            filename=file.filename,
            session_id=session_id,
            message="ไฟล์ถูกอัพโหลดเรียบร้อย กำลังประมวลผล..."
        )
        print(f"✅ [API] Response: {response}")
        print(f"{'='*80}\n")
        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Upload Error] {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการอัพโหลด: {str(e)}"
        )


@router.get("/status/{session_id}/{filename}")
async def get_document_status(
    session_id: str,
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    ตรวจสอบสถานะการประมวลผลเอกสาร (มีระบบสิทธิ์ผู้ใช้ปกป้อง)
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Session ID ไม่ถูกต้อง")

    # ตรวจสอบความถูกต้องและสิทธิ์การเข้าถึง Session
    session = await db.get(ChatSession, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="ไม่พบ Chat Session นี้ในระบบ")

    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์เข้าถึง Session นี้")

    # ดึงข้อมูลจากฐานข้อมูล SQL
    result = await db.execute(
        select(Document).where(
            Document.session_id == session_uuid,
            Document.file_name == filename
        )
    )
    db_doc = result.scalar_one_or_none()

    if db_doc:
        return {
            "status": db_doc.status,
            "summary": db_doc.summary or "",
            "mindmap": db_doc.mindmap or {"nodes": [], "edges": []}
        }

    # fallback เผื่อไม่มีในตาราง SQL
    status = document_processor.get_document_status(session_id, filename)
    return status
