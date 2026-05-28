# Switch Device System Guide (CPU/GPU)

เอกสารนี้อธิบายการทางานของระบบสลับอุปกรณ์ประมวลผล (Switch Device) แบบครบทั้ง Frontend + Backend
ครอบคลุม flow จริงในโค้ด, API contract, การตั้งค่า (config) รายส่วน, การทดสอบ, และ troubleshooting

## 1) ภาพรวมระบบ

ระบบ Switch Device ใช้สาหรับสลับ runtime ของ LLM ระหว่าง `cpu` และ `gpu` แบบ global

- ผลการสลับมีผลกับทุก session ใน backend process เดียวกัน
- เมื่อสลับแล้วจะล้าง LLM cache เพื่อบังคับให้ request ถัดไปสร้าง instance ใหม่บน runtime ใหม่
- มีการ sync runner กับ Ollama แบบ background (unload + warmup)
- มี auto-fallback จาก GPU -> CPU เมื่อเจอ memory/runtime error ที่เข้าเงื่อนไข

## 2) องค์ประกอบหลักของระบบ

### 2.1 Frontend

1. หน้า Settings สลับ runtime
	- ไฟล์: `frontend/src/pages/Settings.jsx`
	- โหลดสถานะ runtime ปัจจุบันผ่าน `fetchRuntime()`
	- เมื่อผู้ใช้กด CPU/GPU จะขึ้น confirm modal ก่อน
	- ตอนยืนยัน จะเรียก `updateRuntime(nextDevice, [selectedModel])`

2. Runtime store
	- ไฟล์: `frontend/src/stores/runtimeStore.js`
	- state หลัก: `device`, `isLoading`, `isInitialized`
	- action หลัก:
	  - `fetchRuntime()` -> GET `/runtime/status`
	  - `updateRuntime(device, modelNames)` -> PUT `/runtime/device`

3. API service
	- ไฟล์: `frontend/src/services/api.js`
	- endpoint ที่เกี่ยวข้อง:
	  - `getRuntimeStatus()`
	  - `setRuntimeDevice(device, modelNames = [])`

4. แหล่ง model ที่ส่งไป warmup
	- ไฟล์: `frontend/src/stores/chatStore.js`
	- `selectedModel` คือโมเดลที่หน้า Settings จะส่งเป็น `model_names` เพื่อ warmup แบบเฉพาะโมเดลที่ใช้งานอยู่

### 2.2 Backend

1. Runtime API
	- ไฟล์: `backend/app/api/routes/runtime.py`
	- `GET /runtime/status` -> คืน runtime ปัจจุบัน
	- `PUT /runtime/device` -> เปลี่ยน runtime global

2. Runtime state manager
	- ไฟล์: `backend/app/services/runtime_manager.py`
	- เก็บสถานะ runtime กลางด้วย lock (`RLock`) เพื่อ thread-safety
	- ค่าเริ่มต้นอ่านจาก `LLM_RUNTIME_DEVICE`

3. LLM service
	- ไฟล์: `backend/app/services/llm_service.py`
	- หน้าที่สาคัญ:
	  - cache LLM instance แยกตาม `model::runtime`
	  - `clear_cache()` เมื่อต้องสลับ runtime
	  - `sync_ollama_runners()` unload/warmup runner หลังสลับ
	  - `get_llm()` สร้าง LLM ใหม่ตาม runtime ปัจจุบัน
	  - `fallback_to_cpu_if_needed()` fallback อัตโนมัติเมื่อเจอ error กลุ่ม memory/runtime

4. จุดที่ใช้ fallback เพิ่มเติม
	- ไฟล์: `backend/app/services/document_processor.py`
	- ตอนสร้าง summary และ mindmap ถ้าเจอ error แบบ runtime/memory จะ fallback CPU แล้ว retry

## 3) ลาดับการทางานจริง (Manual Switch)

1. เปิดหน้า Settings
	- `Settings.jsx` เรียก `fetchRuntime()`
	- frontend ยิง `GET /runtime/status`

2. ผู้ใช้กดสลับ CPU/GPU
	- UI เปิด confirm modal
	- เมื่อกดยืนยัน เรียก `updateRuntime(nextDevice, [selectedModel])`

3. Frontend ส่ง request
	- `PUT /runtime/device`
	- payload อย่างน้อยมี `{ "device": "cpu" | "gpu" }`
	- ถ้ามี model ที่เลือกอยู่ จะส่ง `model_names` ไปด้วย

4. Backend เปลี่ยน runtime
	- `runtime_manager.set_runtime(device)`
	- ถ้าเปลี่ยนสาเร็จ:
	  - `llm_service.clear_cache()`
	  - schedule `llm_service.sync_ollama_runners(...)` แบบ background task

5. Background sync runner
	- unload runner เดิมของโมเดลเป้าหมาย
	- ถ้าปลายทางเป็น GPU จะ warmup ทันที

6. Request ถัดไป
	- ทุกการเรียก LLM จะอ่าน runtime ล่าสุดจาก `runtime_manager`
	- สร้าง instance ใหม่ตาม runtime นั้น

## 4) ลำดับการทางาน (Auto Fallback GPU -> CPU)

เมื่อระบบรันใน `gpu` แล้วเกิด error กลุ่ม memory/runtime (เช่น out of memory, cuda, health check connection refused):

1. `llm_service.fallback_to_cpu_if_needed(error)` คืนค่า True
2. runtime ถูกเปลี่ยนเป็น `cpu`
3. ล้าง cache ทันที
4. โค้ด caller retry อีก 1 ครั้งบน CPU

จุดที่รองรับ fallback แล้วในโค้ด:

- การตอบแชท RAG (`query_with_context`)
- การสร้าง summary
- การสร้าง mindmap

## 5) API Contract ของระบบ Switch Device

### 5.1 ตรวจ runtime ปัจจุบัน

```http
GET /runtime/status
```

Response:

```json
{
  "device": "gpu"
}
```

### 5.2 สลับ runtime (global)

```http
PUT /runtime/device
Content-Type: application/json
```

Request body (minimal):

```json
{
  "device": "cpu"
}
```

Request body (with warmup targets):

```json
{
  "device": "gpu",
  "model_names": [
	 "scb10x/typhoon2.5-qwen3-4b"
  ]
}
```

Response:

```json
{
  "device": "gpu"
}
```

Validation:

- `device` ต้องเป็น `cpu` หรือ `gpu` เท่านั้น
- ถ้าค่าไม่ถูกต้อง backend ตอบ HTTP 400

## 6) Configuration แยกตามส่วน

## 6.1 Backend (.env / app.config)

ไฟล์อ้างอิง:

- `backend/.env`
- `backend/app/config.py`

ตัวแปรที่เกี่ยวกับ switch device โดยตรง:

| Variable | ตัวอย่างค่า | ความหมาย | ใช้ตอน |
|---|---|---|---|
| `LLM_RUNTIME_DEVICE` | `gpu` | runtime เริ่มต้นตอน backend start | RuntimeManager init |
| `OLLAMA_NUM_GPU` | `-1` | กาหนดจานวน GPU ที่ Ollama ใช้ (`-1` = auto) | สร้าง LLM / warmup GPU |
| `LLM_NUM_CTX` | `4096` | context window หลัก | สร้าง LLM / warmup |
| `CPU_LLM_NUM_CTX` | `4096` | เพดาน context ตอน warmup CPU (`min` กับ LLM_NUM_CTX) | warmup CPU |
| `CPU_LLM_NUM_PREDICT` | `256` | token generation limit ตอน warmup CPU | warmup CPU |
| `LLM_REQUEST_TIMEOUT` | `600.0` | timeout request ไป LLM | ตอน query |
| `OLLAMA_HOST` | `http://localhost:11434` | URL Ollama server | ทุก call ไป Ollama |
| `DEFAULT_LLM_MODEL` | `iapp/chinda-qwen3-4b` | โมเดลหลัก (รวมใน known models) | warmup fallback / summary |
| `ALTERNATIVE_LLM_MODEL` | `scb10x/typhoon2.5-qwen3-4b` | โมเดลรอง (รวมใน known models) | warmup fallback |
| `ACTION_LLM_MODEL` | `qwen2.5-coder:7b` | โมเดลสำหรับ action (บังคับใช้งานเสมอ) | action generation |

หมายเหตุเชิง implementation:

- `CPU_LLM_NUM_CTX` และ `CPU_LLM_NUM_PREDICT` ถูกใช้ใน `_ollama_runtime_options()` (เฟส sync/warmup)
- ตอนสร้าง LLM instance จริงใน `get_llm()` จะใช้ `LLM_NUM_CTX` และบังคับ `num_gpu=0` เมื่อ runtime เป็น CPU

### 6.2 Frontend (.env + state)

ไฟล์อ้างอิง:

- `frontend/src/services/api.js`
- `frontend/src/stores/runtimeStore.js`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/stores/chatStore.js`

ค่าที่ต้อง config:

| Variable/State | ตัวอย่างค่า | ความหมาย |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | base URL ของ backend |
| Axios `timeout` | `600000` | กัน frontend timeout ก่อน backend เสร็จ (โดยเฉพาะ CPU mode) |
| `selectedModel` | `scb10x/...` | โมเดลที่หน้า Settings ส่งไป warmup ตอนสลับ runtime |

พฤติกรรม runtime บน frontend:

- สถานะ runtime จริงยึดจาก backend response
- ค่าเริ่มต้น `device: 'gpu'` ใน store เป็นค่า local ก่อน fetch เท่านั้น
- หลัง `fetchRuntime()` จะ sync ตามค่าจริงจาก server

## 7) Runbook การใช้งานจริง

1. เตรียม Ollama

```bash
ollama serve
ollama pull scb10x/typhoon2.5-qwen3-4b
ollama pull iapp/chinda-qwen3-4b
```

2. ตั้งค่า backend `.env`

- กาหนด `LLM_RUNTIME_DEVICE` ตามค่าเริ่มต้นที่ต้องการ
- กาหนด `OLLAMA_HOST` ให้ถูกกับเครื่องที่รัน Ollama

3. รัน backend และ frontend

4. ทดสอบจากหน้า Settings

- เปิดหน้า Settings
- ตรวจ Current Device
- กดสลับ CPU/GPU และยืนยัน
- รอ toast success และลองยิง chat ใหม่

5. ตรวจสอบผลทาง API (optional)

```bash
curl http://localhost:8000/runtime/status
```

ควรได้ค่า device ตรงกับที่สลับล่าสุด

## 8) Test Checklist (แนะนา)

1. Switch cpu -> gpu
	- API ตอบ 200
	- chat request ใหม่ใช้ GPU

2. Switch gpu -> cpu
	- API ตอบ 200
	- chat request ใหม่บังคับ `num_gpu=0`

3. Switch ไปค่าเดิมซ้า
	- backend ไม่ clear cache ซ้าโดยไม่จาเป็น
	- response ยังคืน device เดิม

4. ส่ง `device` ผิดค่า
	- ได้ HTTP 400

5. จาลอง GPU OOM
	- ระบบ fallback ไป CPU อัตโนมัติ
	- retry แล้วตอบได้

6. ส่ง `model_names` ว่าง
	- backend fallback ไป known models

## 9) Troubleshooting

1. สลับเป็น GPU แล้วช้า/ไม่ตอบ
	- ตรวจ `OLLAMA_HOST` ถูกต้อง
	- ตรวจว่า pull โมเดลไว้แล้ว
	- ตรวจ log warmup ว่าสาเร็จหรือไม่

2. สลับแล้วเหมือนไม่มีผล
	- ตรวจว่าเป็น backend process เดียวกันหรือไม่
	- ตรวจ `/runtime/status` ว่าค่าเปลี่ยนจริง
	- ทดสอบ request ใหม่ (instance เก่าจะถูกทิ้งหลัง clear cache)

3. เจอ timeout ที่ frontend
	- เพิ่ม Axios timeout
	- ลด `LLM_NUM_CTX` หรือใช้โมเดลเล็กลง

4. เครื่องไม่มี GPU
	- ตั้ง `LLM_RUNTIME_DEVICE=cpu`
	- หรือปล่อย fallback อัตโนมัติเมื่อ GPU ใช้งานไม่ได้

## 10) ข้อควรรู้สาหรับ production

1. Runtime state เป็น in-memory ต่อ process
	- ถ้ามีหลาย backend instance แต่ละ instance จะมี runtime state ของตัวเอง

2. หลัง restart server
	- runtime จะ reset ตาม `LLM_RUNTIME_DEVICE`

3. แนะนาให้มี observability
	- เก็บ log เมื่อมี switch และ fallback
	- dashboard แยก CPU/GPU latency เพื่อติดตามผล

---

## สรุปสั้น

ระบบ Switch Device นี้ออกแบบให้สลับ CPU/GPU ได้แบบ global, ปลอดภัยต่อ concurrent access, มี cache invalidation ชัดเจน, warmup runner แบบ background, และมี fallback อัตโนมัติเมื่อ GPU มีปัญหา
โดยส่วน config หลักอยู่ที่ backend `.env`/`config.py` และ frontend `VITE_API_BASE_URL` + runtime store/action
