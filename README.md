# NotebookLM Clone — Local RAG & Model Arena

แอปพลิเคชัน Frontend ที่ได้รับแรงบันดาลใจจาก **NotebookLM** สำหรับ **แชท AI ด้วยเอกสาร** ผ่านระบบ RAG (Retrieval-Augmented Generation) และ **สนามประลองโมเดล** สำหรับเปรียบเทียบ AI แบบตัวต่อตัว

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 📄 **อัปโหลด PDF** | ลาก-วางไฟล์ PDF พร้อมแสดงสถานะการประมวลผลแบบ Real-time |
| 🧠 **องค์ความรู้อัตโนมัติ** | สร้างสรุปเนื้อหาและ Mindmap จากเอกสารโดยอัตโนมัติ |
| 💬 **แชท AI** | แชทกับ AI โมเดลเดียว พร้อมรองรับ Markdown |
| ⚔️ **สนามประลองโมเดล** | เปรียบเทียบ 2 โมเดล AI แบบเคียงข้างกัน |
| 👍 **ระบบโหวต** | ให้คะแนน ดีกว่า/แย่กว่า สำหรับคำตอบในสนามประลอง |
| 🌙 **Dark/Light Mode** | สลับธีมได้ พร้อม Transition ที่นุ่มนวล |
| 📱 **Responsive** | รองรับ Mobile, Tablet และ Desktop |

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4 (dark mode ผ่าน class strategy)
- **Routing**: React Router DOM v7
- **State Management**: Zustand v5
- **Icons**: Lucide React
- **Markdown**: react-markdown
- **Mindmap**: @xyflow/react (ReactFlow)
- **HTTP Client**: Axios

---

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js ≥ 18
- npm ≥ 9

### ติดตั้ง

```bash
# Clone repository
git clone <your-repo-url>
cd rag-llm

# ติดตั้ง dependencies
npm install

# แก้ไข .env ให้ชี้ไปที่ Backend API (เช่น Ngrok URL)
# VITE_API_BASE_URL=https://xxxx.ngrok-free.app

# เริ่ม dev server
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

### Environment Variables

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | URL ของ Backend API (FastAPI) |

### Build สำหรับ Production

```bash
npm run build
npm run preview
```

---

## 📁 โครงสร้างโปรเจกต์

```
src/
├── components/
│   ├── layout/          # Navbar (แถบนำทาง)
│   ├── chat/            # ChatMessage, ChatInput, ModelSelector
│   ├── upload/          # UploadZone (ลาก-วาง PDF)
│   ├── knowledge/       # KnowledgeTabs, Summary, Mindmap
│   ├── arena/           # ArenaChat, VoteButton
│   └── ui/              # ระบบ Toast Notification
├── pages/
│   ├── Workspace.jsx    # หน้าหลัก (เอกสาร + แชท)
│   └── ModelArena.jsx   # หน้าเปรียบเทียบโมเดล
├── services/
│   └── api.js           # Axios API client (3 endpoints + polling)
├── stores/
│   ├── themeStore.js    # สถานะ Dark/Light mode
│   ├── documentStore.js # สถานะเอกสารและความรู้
│   └── chatStore.js     # สถานะแชทและสนามประลอง
├── hooks/
│   ├── useUpload.js     # Logic อัปโหลดไฟล์ + Polling สถานะ
│   └── useChat.js       # Logic แชท + แชทสนามประลอง
├── layouts/
│   └── MainLayout.jsx   # โครง App (Navbar + Toast)
├── App.jsx              # เส้นทาง Routes
├── main.jsx             # Entry point
└── index.css            # Tailwind + Custom styles
```

---

## 📖 เอกสารเพิ่มเติม

- [คู่มือสถาปัตยกรรม](./docs/architecture.md) — โครงสร้าง Component และ State Management
- [ข้อกำหนด API](./docs/api-specs.md) — สัญญา JSON Request/Response สำหรับทีม Backend

---

## 🔗 การเชื่อมต่อกับ Backend

โปรเจกต์นี้ออกแบบให้ทำงานร่วมกับ Backend ที่รันบน **Google Colab + Ollama + Ngrok**

1. รัน Backend notebook บน Colab  
2. คัดลอก Ngrok URL (เช่น `https://xxxx.ngrok-free.app`)  
3. ตั้งค่าใน `.env`:
   ```
   VITE_API_BASE_URL=https://xxxx.ngrok-free.app
   ```
4. รัน `npm run dev`

---

## 📝 License

MIT
