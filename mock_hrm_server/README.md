# Mock HRM API Server

Mock FastAPI server ที่จำลอง HRM (Human Resource Management) API สำหรับทดสอบการเชื่อมต่อกับ RAG-LLM System Session

## วิธี Setup

```bash
cd mock_hrm_server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## วิธี Run

```bash
# Seed mock data (ต้องรันก่อนครั้งแรก)
python seed_data.py

# Start server
python main.py
```

Server จะรันที่ `http://localhost:8001`
Swagger UI: `http://localhost:8001/docs`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/hrm/employees | รายชื่อพนักงาน |
| GET | /api/hrm/employees/{id} | ข้อมูลพนักงานคนเดียว |
| GET | /api/hrm/departments | แผนก/ฝ่าย |
| GET | /api/hrm/leaves | วันลาทั้งหมด |
| GET | /api/hrm/leaves/balance/{emp_id} | วันลาคงเหลือ |
| GET | /api/hrm/attendance | บันทึกเข้า-ออก |
| GET | /api/hrm/salary/{emp_id} | เงินเดือน (ต้อง API key) |
| GET | /api/hrm/policies | นโยบาย HR |
| GET | /api/hrm/announcements | ประกาศ |
| GET | /api/hrm/benefits | สวัสดิการ |
| GET | /api/hrm/performance/{emp_id} | ประเมินผล (ต้อง API key) |
| POST | /api/hrm/webhook/register | ลงทะเบียน webhook |
| POST | /api/hrm/webhook/test | ทดสอบ trigger webhook |
| GET | /api/hrm/sync/changes | Incremental sync |

## Authentication

บาง endpoints ที่เป็นข้อมูล sensitive ต้องใช้ API key:

```
Header: X-API-Key: hrm-mock-api-key-2026
```
