import os
import pypdf
import pytesseract
from pdf2image import convert_from_path
from typing import Optional, Dict
from app.config import settings


def extract_text_by_page(file_path: str) -> Dict[int, str]:
    """
    สกัดข้อความจาก PDF โดยแยกตามหน้า
    คืนค่าเป็น Dictionary {เลขหน้า: ข้อความ}
    """
    pages_text = {}
    total_text = ""

    # พยายามอ่านด้วย PyPDF ก่อน
    try:
        reader = pypdf.PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            extracted = page.extract_text()
            if extracted and len(extracted.strip()) > 0:
                pages_text[i + 1] = extracted
                total_text += extracted + "\n"
        print(f"✅ [PyPDF] อ่านไฟล์ {os.path.basename(file_path)} ได้ {len(total_text)} ตัวอักษร ({len(pages_text)} หน้า)")
    except Exception as e:
        print(f"⚠️ [PyPDF] ไม่สามารถอ่านด้วย PyPDF: {str(e)}")

    # ถ้าได้ข้อความรวมน้อยเกินไป แสดงว่าเป็นรูปภาพ/แสกน ต้องใช้ OCR
    if len(total_text.strip()) < settings.MIN_TEXT_LENGTH:
        print(f"🔍 [OCR] กำลังใช้ Tesseract OCR สำหรับ {os.path.basename(file_path)}")
        pages_text.clear()
        try:
            images = convert_from_path(file_path, dpi=settings.PDF_DPI)
            for i, img in enumerate(images):
                page_text = pytesseract.image_to_string(img, lang=settings.TESSERACT_LANG)
                if page_text and len(page_text.strip()) > 0:
                    pages_text[i + 1] = page_text
                    print(f"  📄 หน้า {i+1}: สกัดได้ {len(page_text)} ตัวอักษร")
        except Exception as e:
            print(f"❌ [OCR] ไม่สามารถใช้ OCR ได้: {str(e)}")

    return pages_text


def extract_text_from_pdf(file_path: str) -> str:
    """
    สกัดข้อความรวมทั้งหมด (ใช้ดึง text ยาวๆ เหมือนเดิม)
    """
    pages_dict = extract_text_by_page(file_path)
    return "\n\n".join([text for page_num, text in sorted(pages_dict.items())])


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
