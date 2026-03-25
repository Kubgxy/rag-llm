# RAG LLM Backend

Backend สำหรับระบบ RAG (Retrieval-Augmented Generation) ที่รองรับการอ่านและวิเคราะห์เอกสาร PDF ด้วย LLM

## ✨ Features

- 📄 **PDF Processing**: รองรับการอ่าน PDF ทั้งแบบข้อความและ OCR (ภาษาไทย + อังกฤษ)
- 🧠 **Vector Search**: ใช้ ChromaDB สำหรับเก็บและค้นหา embeddings แบบ Local
- 💬 **Multi-Session Chat**: รองรับการแชทหลาย session แยกกัน
- 🤖 **Multiple LLM Models**: รองรับหลายโมเดลผ่าน Ollama
- 📊 **Auto Summary & Mindmap**: สร้างสรุปและ mindmap อัตโนมัติ

## 🏗️ โครงสร้างโปรเจค

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── upload.py      # API สำหรับอัพโหลดเอกสาร
│   │       └── chat.py         # API สำหรับแชท
│   ├── services/
│   │   ├── vector_store.py     # จัดการ ChromaDB + Embeddings
│   │   ├── llm_service.py      # จัดการ LLM
│   │   └── document_processor.py  # ประมวลผลเอกสาร
│   ├── schemas/
│   │   └── models.py           # Pydantic models
│   ├── utils/
│   │   └── ocr.py              # OCR utilities
│   ├── config.py               # Configuration
│   └── main.py                 # FastAPI app
├── requirements.txt
├── .env.example
└── README.md
```

## 📋 Requirements

### System Dependencies

1. **Tesseract OCR** (สำหรับอ่าน PDF ที่เป็นรูปภาพ)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr tesseract-ocr-tha poppler-utils

   # macOS
   brew install tesseract tesseract-lang poppler

   # Windows
   # ดาวน์โหลดจาก: https://github.com/UB-Mannheim/tesseract/wiki
   ```

2. **Ollama** (สำหรับรัน LLM locally)
   ```bash
   # Linux/macOS
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows
   # ดาวน์โหลดจาก: https://ollama.com/download
   ```

3. **ดาวน์โหลดโมเดล LLM**
   ```bash
   ollama pull scb10x/typhoon2.5-qwen3-4b
   ollama pull iapp/chinda-qwen3-4b
   ```

### Python Dependencies

```bash
pip install -r requirements.txt
```

## 🚀 การติดตั้งและรัน

### 1. Clone และเข้าโฟลเดอร์

```bash
cd backend
```

### 2. สร้าง Virtual Environment

```bash
python -m venv venv

# Activate
# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 3. ติดตั้ง Dependencies

```bash
pip install -r requirements.txt
```

### 4. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ตามต้องการ:

```env
DEBUG=True
HOST=0.0.0.0
PORT=8000
OLLAMA_HOST=http://localhost:11434
DEFAULT_LLM_MODEL=scb10x/typhoon2.5-qwen3-4b

# 🔥 สำคัญ: Qdrant Mode
# - "memory": เก็บข้อมูลใน RAM (แนะนำสำหรับ development, ไม่มีปัญหา lock file)
# - "disk": เก็บข้อมูลถาวรบน disk (สำหรับ production)
QDRANT_MODE=memory
```

> **💡 Tips**: ใช้ `QDRANT_MODE=memory` สำหรับ development เพื่อหลีกเลี่ยงปัญหา lock file และทำให้รวดเร็วขึ้น ข้อมูลจะถูกเคลียร์เมื่อ restart server

### 5. เริ่มรัน Ollama Server

```bash
ollama serve
```

### 6. รัน Backend

```bash
# วิธีที่ 1: ใช้ uvicorn โดยตรง
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# วิธีที่ 2: ใช้ python
python -m app.main

# วิธีที่ 3: ใช้ run script
python run.py
```

Backend จะรันที่: `http://localhost:8000`

## 📚 API Documentation

เมื่อรัน backend แล้ว สามารถเข้าดู API documentation ได้ที่:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

#### 1. Upload Document

```http
POST /upload
Content-Type: multipart/form-data

{
  "file": [PDF FILE],
  "session_id": "unique-session-id"
}
```

#### 2. Check Document Status

```http
GET /upload/status/{session_id}/{filename}
```

#### 3. Chat

```http
POST /chat/single
Content-Type: application/json

{
  "query": "คำถามที่ต้องการถาม",
  "model_name": "scb10x/typhoon2.5-qwen3-4b",
  "session_id": "unique-session-id"
}
```

#### 4. Health Check

```http
GET /health
```

## 🔧 Configuration

แก้ไขการตั้งค่าได้ที่ `app/config.py` หรือใช้ `.env` file:

- `EMBEDDING_MODEL`: โมเดล embedding (default: `BAAI/bge-m3`)
- `DEFAULT_LLM_MODEL`: โมเดล LLM หลัก
- `QDRANT_MODE`: โหมดการทำงานของ Qdrant
  - `memory`: เก็บข้อมูลใน RAM (แนะนำสำหรับ dev) ✅
  - `disk`: เก็บข้อมูลถาวร (สำหรับ production)
- `QDRANT_PATH`: path สำหรับเก็บ vector database (ใช้เมื่อ mode = disk)
- `SIMILARITY_TOP_K`: จำนวน documents ที่จะนำมาใช้ตอบคำถาม

## 🐛 Troubleshooting

### 1. Ollama ไม่ทำงาน

```bash
# ตรวจสอบว่า Ollama รันอยู่หรือไม่
curl http://localhost:11434/api/tags

# รีสตาร์ท Ollama
# Windows: ปิดแล้วเปิดใหม่ผ่าน Start Menu
# Linux/macOS:
pkill ollama
ollama serve
```

### 2. Tesseract ไม่พบ

ตรวจสอบว่าติดตั้งแล้วและอยู่ใน PATH:

```bash
tesseract --version
```

### 3. Out of Memory

ลด `LLM_NUM_CTX` ใน config หรือใช้โมเดลเล็กกว่า

### 4. Qdrant Lock File Error

**อาการ**: `Storage folder is already accessed by another instance`

**วิธีแก้ที่ดีที่สุด** (แก้ไขถาวร):
```bash
# ตั้งค่าใน .env ให้ใช้ memory mode
QDRANT_MODE=memory
```

**วิธีแก้แบบชั่วคราว** (สำหรับ disk mode):
```bash
# ลบ Qdrant folder ทั้งหมด (ข้อมูลจะหาย!)
rm -rf qdrant_local_data

# หรือเฉพาะ lock file
rm -rf qdrant_local_data/.lock
```

> **💡 หมายเหตุ**:
> - `memory` mode: ข้อมูลหายเมื่อ restart แต่ไม่มีปัญหา lock file
> - `disk` mode: ข้อมูลถาวรแต่อาจมีปัญหา lock file ถ้าปิดไม่เรียบร้อย
> - Backend จะพยายามลบ lock file เก่าอัตโนมัติก่อนเปิด (สำหรับ disk mode)

## 📝 License

MIT
