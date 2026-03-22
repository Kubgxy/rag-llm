# คู่มือสถาปัตยกรรม (Architecture Guide)

## ภาพรวม

แอปพลิเคชันออกแบบตามหลัก Modern React Architecture โดยแยกความรับผิดชอบชัดเจน:
- **Pages** — จัดวาง Layout ของแต่ละหน้า
- **Components** — ชิ้นส่วน UI ที่นำกลับมาใช้ซ้ำได้
- **Stores** (Zustand) — จัดการ State ส่วนกลาง
- **Hooks** — ห่อหุ้ม Business Logic
- **Services** — ติดต่อ API Backend

---

## ลำดับชั้นของ Component

```
App
└── MainLayout (Navbar + ToastProvider + Outlet)
    ├── Workspace (หน้าหลัก)
    │   ├── UploadZone (ลาก-วาง PDF + Polling สถานะ)
    │   ├── KnowledgeTabs
    │   │   ├── Summary (สรุปเนื้อหา)
    │   │   └── Mindmap (ReactFlow)
    │   ├── ModelSelector (เลือกโมเดล AI)
    │   ├── ChatMessage[] (ข้อความแชท)
    │   └── ChatInput (ช่องพิมพ์)
    │
    └── ModelArena (สนามประลอง)
        ├── Dropdown โมเดล A
        ├── Dropdown โมเดล B
        ├── ArenaChat (แสดงคำตอบ 2 ฝั่ง)
        │   └── VoteButton[] (ปุ่มโหวต)
        └── ChatInput (ช่องพิมพ์ร่วม)
```

---

## State Management (Zustand)

ใช้ 3 Store แยกกัน แต่ละตัวรับผิดชอบงานเดียว:

### `themeStore`
| State | Type | คำอธิบาย |
|---|---|---|
| `theme` | `'light' \| 'dark'` | ธีมปัจจุบัน (บันทึกลง localStorage) |

| Action | คำอธิบาย |
|---|---|
| `toggleTheme()` | สลับธีมและเพิ่ม/ลบ class `.dark` บน `<html>` |

### `documentStore`
| State | Type | คำอธิบาย |
|---|---|---|
| `documents` | `Array<{name, uploadedAt}>` | รายชื่อไฟล์ที่อัปโหลดแล้ว |
| `summary` | `string` | สรุปเนื้อหาเอกสาร (จาก AI) |
| `mindmapNodes` | `Array<Node>` | ข้อมูล Node สำหรับ ReactFlow |
| `mindmapEdges` | `Array<Edge>` | ข้อมูลเส้นเชื่อมสำหรับ ReactFlow |
| `isUploading` | `boolean` | กำลังอัปโหลด/ประมวลผลอยู่ |
| `uploadError` | `string \| null` | ข้อผิดพลาดล่าสุด |
| `activeTab` | `'summary' \| 'mindmap'` | แท็บที่เลือกอยู่ |

### `chatStore`
| State | Type | คำอธิบาย |
|---|---|---|
| `messages` | `Array<Message>` | ประวัติแชทโมเดลเดี่ยว |
| `selectedModel` | `string` | ID โมเดลที่เลือก |
| `isLoading` | `boolean` | กำลังรอคำตอบจาก AI |
| `arenaMessages` | `Array<ArenaMessage>` | ประวัติแชทสนามประลอง |
| `arenaModelA/B` | `string` | โมเดลที่เลือกในสนามประลอง |
| `isArenaLoading` | `boolean` | กำลังรอคำตอบสนามประลอง |

---

## เส้นทาง (Routing)

| Path | Page | คำอธิบาย |
|---|---|---|
| `/` | `Workspace` | หน้าหลัก (อัปโหลดเอกสาร + แชท) |
| `/arena` | `ModelArena` | หน้าเปรียบเทียบโมเดล |

ทั้ง 2 เส้นทางครอบด้วย `MainLayout` ที่มี `Navbar` และ `ToastProvider` ตลอด

---

## Custom Hooks

### `useUpload()`
จัดการ Logic ลาก-วางไฟล์, ตรวจสอบไฟล์ (PDF เท่านั้น, ≤50MB), ส่งไฟล์ไป API แล้ว **Polling สถานะทุก 5 วินาที** จนกว่า Backend จะประมวลผลเสร็จ

### `useChat()`
จัดการ Logic แชทโมเดลเดี่ยว: เพิ่มข้อความผู้ใช้ → เรียก API → เพิ่มคำตอบ AI  
รองรับกรณี Backend ส่ง `{ status: "error" }` กลับมา

### `useArenaChat()`
จัดการ Logic แชทสนามประลอง: ส่งคำถามไป 2 โมเดลพร้อมกัน → แสดงคำตอบเคียงข้างกัน  
อ่านคำตอบจาก `data.results[modelId]` (Object format)

---

## ระบบ Toast Notification

`ToastProvider` ใช้ React Context เปิดให้ทุก Component เรียก `addToast(message, type, duration)` ได้  
Toast จะหายไปอัตโนมัติพร้อม CSS Animation

ประเภท: `success`, `error`, `info`

---

## การไหลของข้อมูล (Data Flow)

```
อัปโหลดไฟล์ → useUpload hook → api.uploadDocument()
  → Backend ตอบ { filename } ทันที
  → useUpload เริ่ม Polling (ทุก 5 วินาที) → api.checkDocumentStatus()
  → เมื่อ status === "completed" → documentStore.setUploadResult() → UI อัปเดต

แชทปกติ → useChat hook → api.chatSingle()
  → chatStore.addAssistantMessage() → UI อัปเดต

แชทสนามประลอง → useArenaChat hook → api.chatCompare()
  → อ่าน data.results[modelA] & data.results[modelB]
  → chatStore.addArenaResponse() → UI แสดงแบบ Split-screen
```
