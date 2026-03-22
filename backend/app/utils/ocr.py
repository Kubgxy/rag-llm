import os
import pypdf
import pytesseract
from pdf2image import convert_from_path
from typing import Optional
from app.config import settings


def extract_text_from_pdf(file_path: str) -> str:
    """
    สกัดข้อความจาก PDF ด้วย PyPDF ก่อน
    ถ้าข้อความน้อยเกินไปจะใช้ OCR (Tesseract)

    Args:
        file_path: Path ของไฟล์ PDF

    Returns:
        ข้อความที่สกัดได้
    """
    text = ""

    # พยายามอ่านด้วย PyPDF ก่อน
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        print(f"✅ [PyPDF] อ่านไฟล์ {os.path.basename(file_path)} ได้ {len(text)} ตัวอักษร")
    except Exception as e:
        print(f"⚠️ [PyPDF] ไม่สามารถอ่านด้วย PyPDF: {str(e)}")

    # ถ้าข้อความน้อยเกินไป หรือไม่มีเลย ให้ใช้ OCR
    if len(text.strip()) < settings.MIN_TEXT_LENGTH:
        try:
            print(f"🔍 [OCR] กำลังใช้ Tesseract OCR สำหรับ {os.path.basename(file_path)}")
            text = extract_text_with_ocr(file_path)
        except Exception as e:
            print(f"❌ [OCR] ไม่สามารถใช้ OCR ได้: {str(e)}")

    return text.strip()


def extract_text_with_ocr(file_path: str) -> str:
    """
    ใช้ Tesseract OCR สกัดข้อความจากไฟล์ PDF ที่เป็นรูปภาพ

    Args:
        file_path: Path ของไฟล์ PDF

    Returns:
        ข้อความที่สกัดได้จาก OCR
    """
    text = ""

    # แปลง PDF เป็นรูปภาพ
    images = convert_from_path(file_path, dpi=settings.PDF_DPI)

    # ใช้ OCR กับแต่ละหน้า
    for i, img in enumerate(images):
        page_text = pytesseract.image_to_string(img, lang=settings.TESSERACT_LANG)
        text += page_text + "\n"
        print(f"  📄 หน้า {i+1}: สกัดได้ {len(page_text)} ตัวอักษร")

    return text
