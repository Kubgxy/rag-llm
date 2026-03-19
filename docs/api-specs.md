# ข้อกำหนด API (API Specifications)

เอกสารนี้อธิบาย JSON Request/Response ที่ Frontend คาดหวังจาก Backend อย่างละเอียด  
เพื่อให้ทีม Backend (FastAPI + Ollama) ไปทำ API มารองรับได้ถูกต้อง

**Base URL**: ตั้งค่าผ่าน `VITE_API_BASE_URL` ใน `.env` (ค่าเริ่มต้น: `http://localhost:8000`)

> **หมายเหตุ**: Frontend ส่ง Header `ngrok-skip-browser-warning: true` ในทุก Request เพื่อข้ามหน้าเตือนของ Ngrok โดยอัตโนมัติ

---

## 1. อัปโหลดเอกสาร

รับไฟล์ PDF แล้วส่งกลับ `filename` ทันที จากนั้น Backend จะประมวลผลเบื้องหลัง (Background Task)

### Request

```
POST /upload
Content-Type: multipart/form-data
```

| Field | Type | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `file` | `File` (binary) | ✅ | ไฟล์ PDF ที่ต้องการอัปโหลด |

### Response — `200 OK`

```json
{
  "status": "success",
  "message": "อัปโหลดสำเร็จ กำลังเรียนรู้และทำสรุปเบื้องหลัง...",
  "filename": "document.pdf"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `status` | `string` | `"success"` เมื่ออัปโหลดผ่าน |
| `message` | `string` | ข้อความแจ้งสถานะ |
| `filename` | `string` | ชื่อไฟล์ที่บันทึกบน Server (ใช้สำหรับ Polling) |

---

## 2. ตรวจสอบสถานะเอกสาร (Polling)

Frontend จะยิง Request มาถามทุก 5 วินาทีว่า Backend ประมวลผลเสร็จหรือยัง

### Request

```
GET /document/status/{filename}
```

| Parameter | Type | คำอธิบาย |
|---|---|---|
| `filename` | `string` (path) | ชื่อไฟล์ที่ได้จาก `/upload` |

### Response — กำลังประมวลผล

```json
{
  "status": "processing",
  "summary": "",
  "mindmap": {}
}
```

### Response — ประมวลผลสำเร็จ

```json
{
  "status": "completed",
  "summary": "สรุปใจความสำคัญของเอกสาร:\n- ประเด็นที่ 1\n- ประเด็นที่ 2\n- ประเด็นที่ 3",
  "mindmap": {
    "nodes": [
      {
        "id": "1",
        "data": { "label": "หัวข้อหลัก" },
        "position": { "x": 250, "y": 0 }
      },
      {
        "id": "2",
        "data": { "label": "หัวข้อย่อย A" },
        "position": { "x": 100, "y": 120 }
      },
      {
        "id": "3",
        "data": { "label": "หัวข้อย่อย B" },
        "position": { "x": 400, "y": 120 }
      }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" },
      { "id": "e1-3", "source": "1", "target": "3" }
    ]
  }
}
```

### Response — เกิดข้อผิดพลาด

```json
{
  "status": "error",
  "message": "ไม่สามารถอ่านไฟล์ PDF ได้"
}
```

### Response — ไม่พบไฟล์

```json
{
  "status": "not_found"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `status` | `string` | `"processing"`, `"completed"`, `"error"`, หรือ `"not_found"` |
| `summary` | `string` | สรุปเนื้อหาเอกสาร (มีเมื่อ completed) |
| `mindmap` | `object` | ข้อมูล Mindmap ที่มี `nodes` และ `edges` |
| `mindmap.nodes[].id` | `string` | ID ของ Node |
| `mindmap.nodes[].data.label` | `string` | ข้อความที่แสดงบน Node |
| `mindmap.nodes[].position` | `{x, y}` | ตำแหน่ง (ถ้าไม่มี Frontend จะจัดเอง) |
| `mindmap.edges[].source` | `string` | Node ต้นทาง |
| `mindmap.edges[].target` | `string` | Node ปลายทาง |
| `message` | `string` | ข้อความข้อผิดพลาด (มีเมื่อ error) |

---

## 3. แชทโมเดลเดียว

ส่งคำถามไปยังโมเดล AI ตัวเดียว ใช้ RAG ตอบคำถามจากเอกสาร

### Request

```
POST /chat/single
Content-Type: application/json
```

```json
{
  "query": "เอกสารนี้เกี่ยวกับอะไร?",
  "model_name": "scb10x/typhoon2.5-qwen3-4b"
}
```

| Field | Type | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `query` | `string` | ✅ | คำถามของผู้ใช้ |
| `model_name` | `string` | ✅ | ID ของโมเดล (ดูรายชื่อด้านล่าง) |

### Response — สำเร็จ

```json
{
  "query": "เอกสารนี้เกี่ยวกับอะไร?",
  "answer": "จากเอกสาร พบว่าเนื้อหาสำคัญประกอบด้วย...\n\n1. **ประเด็นที่ 1** — ...\n2. **ประเด็นที่ 2** — ...",
  "model": "scb10x/typhoon2.5-qwen3-4b"
}
```

### Response — ผิดพลาด (Backend-level)

```json
{
  "status": "error",
  "message": "Model not found or failed to load"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `query` | `string` | คำถามเดิมที่ส่งไป |
| `answer` | `string` | คำตอบ Markdown จาก AI |
| `model` | `string` | ชื่อโมเดลที่ใช้ตอบ |
| `status` | `string` | `"error"` เมื่อเกิดข้อผิดพลาด |
| `message` | `string` | ข้อความข้อผิดพลาด |

---

## 4. เปรียบเทียบโมเดล (สนามประลอง)

ส่งคำถามเดียวกันไปยัง 2 โมเดลพร้อมกัน (Backend จะรันทีละตัวเพื่อประหยัด RAM)

### Request

```
POST /chat/compare
Content-Type: application/json
```

```json
{
  "query": "อธิบาย Methodology ที่ใช้ในเอกสาร",
  "models": ["scb10x/typhoon2.5-qwen3-4b", "iapp/chinda-qwen3-4b"]
}
```

| Field | Type | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `query` | `string` | ✅ | คำถามของผู้ใช้ |
| `models` | `string[]` | ✅ | Array ที่มี 2 model IDs |

### Response — สำเร็จ

```json
{
  "query": "อธิบาย Methodology ที่ใช้ในเอกสาร",
  "results": {
    "scb10x/typhoon2.5-qwen3-4b": "จากเอกสาร Methodology ประกอบด้วย...\n\n### ขั้นตอน\n1. เก็บรวบรวมข้อมูล\n2. วิเคราะห์\n3. สังเคราะห์",
    "iapp/chinda-qwen3-4b": "ตามเอกสาร Methodology แบ่งออกเป็น...\n\n- **Phase 1**: การประเมินเบื้องต้น\n- **Phase 2**: การวิเคราะห์เชิงลึก"
  }
}
```

### Response — ผิดพลาด (Backend-level)

```json
{
  "status": "error",
  "message": "Failed to load model"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `query` | `string` | คำถามเดิม |
| `results` | `object` | Object ที่ key เป็น model ID และ value เป็นคำตอบ Markdown |
| `results["model_id"]` | `string` | คำตอบ Markdown จากโมเดลนั้นๆ |

> ⚠️ **สำคัญ**: `results` เป็น **Object** (ไม่ใช่ Array) โดย key ตรงกับ model ID ที่ส่งไปใน `models`

---

## รายชื่อโมเดลที่รองรับ

โมเดลเหล่านี้ตั้งค่าไว้ใน Frontend และต้อง Pull ไว้บน Ollama ก่อนใช้งาน:

| Model ID | ชื่อแสดงผล | หมายเหตุ |
|---|---|---|
| `scb10x/typhoon2.5-qwen3-4b` | Typhoon 2.5 (4B) | โมเดลภาษาไทยจาก SCB 10X |
| `iapp/chinda-qwen3-4b` | Chinda (4B) | โมเดลภาษาไทยจาก iApp |
| `llama-3.1` | LLaMA 3.1 | สำรอง (ต้อง Pull ก่อน) |
| `gemma-2` | Gemma 2 | สำรอง (ต้อง Pull ก่อน) |

---

## การจัดการข้อผิดพลาด

Backend มี 2 รูปแบบการส่ง Error:

### 1. HTTP Error (4xx, 5xx)
```json
{
  "detail": "ข้อความข้อผิดพลาดที่อ่านได้"
}
```

### 2. Application-level Error (HTTP 200 แต่มี status === "error")
```json
{
  "status": "error",
  "message": "Model not found or failed to load"
}
```

Frontend จัดการทั้ง 2 กรณีโดยแสดง Toast Notification ภาษาไทย

| HTTP Status | คำอธิบาย |
|---|---|
| `200` | สำเร็จ หรือ Application-level Error |
| `400` | Request ไม่ถูกต้อง |
| `413` | ไฟล์ใหญ่เกินไป |
| `415` | ประเภทไฟล์ไม่รองรับ |
| `422` | Validation Error |
| `500` | Server Error |
| `503` | Model ไม่พร้อมให้บริการ |
