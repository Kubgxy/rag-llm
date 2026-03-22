import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.config import settings
from app.schemas import UploadResponse
from app.services import document_processor


router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """
    อัพโหลดเอกสาร PDF และประมวลผลเป็น Vector Embeddings

    Args:
        file: ไฟล์ PDF ที่ต้องการอัพโหลด
        session_id: Session ID สำหรับแยกแชท

    Returns:
        UploadResponse พร้อมสถานะการอัพโหลด
    """
    print(f"\n{'🔵'*20} UPLOAD REQUEST {'🔵'*20}")
    print(f"📥 [API] ได้รับไฟล์: {file.filename}")
    print(f"📋 [API] Session ID: {session_id}")
    print(f"📦 [API] Content Type: {file.content_type}")
    print(f"📏 [API] File Size: {file.size if hasattr(file, 'size') else 'unknown'}")

    # ตรวจสอบไฟล์
    if not file.filename.lower().endswith('.pdf'):
        print(f"❌ [API] ไฟล์ไม่ใช่ PDF: {file.filename}")
        raise HTTPException(
            status_code=400,
            detail="รองรับเฉพาะไฟล์ PDF เท่านั้น"
        )

    # สร้างโฟลเดอร์ upload ถ้ายังไม่มี
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"📁 [API] Upload directory: {settings.UPLOAD_DIR}")

    # บันทึกไฟล์
    file_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}_{file.filename}")
    print(f"💾 [API] กำลังบันทึกไฟล์ไปที่: {file_path}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        print(f"✅ [API] บันทึกไฟล์สำเร็จ ({file_size} bytes)")

        # ประมวลผลเอกสารใน Background
        print(f"🔄 [API] เพิ่ม background task สำหรับประมวลผล...")
        background_tasks.add_task(
            document_processor.process_document,
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

    except Exception as e:
        print(f"❌ [Upload Error] {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการอัพโหลด: {str(e)}"
        )


@router.get("/status/{session_id}/{filename}")
async def get_document_status(session_id: str, filename: str):
    """
    ตรวจสอบสถานะการประมวลผลเอกสาร

    Args:
        session_id: Session ID
        filename: ชื่อไฟล์

    Returns:
        สถานะการประมวลผล พร้อม summary และ mindmap
    """
    status = document_processor.get_document_status(session_id, filename)
    return status
