# แผนงาน: ระบบสร้างสไลด์และอินโฟกราฟิกด้วย AI (แรงบันดาลใจจาก Gamma.app)

แผนงานนี้สรุปขั้นตอนการพัฒนาและวางโครงสร้างระบบสร้างสไลด์นำเสนอและอินโฟกราฟิกแบบไดนามิก (ไม่ซ้ำซากจำเจ) ภายในโครงการ RAG-LLM โดยใช้เทคนิคการจัดหน้าเว็บที่ปรับเปลี่ยนได้ตามขนาดหน้าจอ (Responsive Web Layouts), ดีไซน์โทเค็นแบบกำหนดเอง (Design Tokens), ระบบวิเคราะห์ข้อความเป็นบล็อกข้อมูลเชิงความหมาย (Semantic Block-Parsing), และการสับเปลี่ยนดีไซน์ในแต่ละหน้าสไลด์ (Visual Diversification) ตามแนวทางของ Gamma.app

---

## 1. ประเภทโครงการและบริบท (Project Type & Context)
- **ประเภทโครงการ:** WEB (React 19 + Vite 6 + Tailwind CSS v4 + Zustand + FastAPI)
- **เป้าหมายการเชื่อมต่อ:** RAG-LLM (NotebookLM Clone) - ทำการสร้างสไลด์/อินโฟกราฟิกแบบไดนามิกโดยตรงจากข้อมูลสรุปเอกสารที่ได้จากระบบ RAG

---

## 2. เกณฑ์ความสำเร็จ (Success Criteria)
- **ปราศจากการกำหนดตำแหน่งสัมบูรณ์ (Zero Absolute Positioning):** การจัดหน้าสไลด์ทั้งหมดต้องมีความยืดหยุ่น (Fluid), ปรับตามหน้าจอได้ 100% (Responsive) และขับเคลื่อนด้วยขนาดข้อมูลจริง (Content-driven)
- **ความหลากหลายของดีไซน์สไลด์ (Style Diversification):** ปราศจากสไลด์รูปแบบซ้ำกันต่อเนื่องกัน; รูปแบบเลย์เอาต์ (Layout templates) จะถูกสับเปลี่ยนแบบสุ่มตามลักษณะความหมายเชิงลึกของเนื้อหาจริง
- **ระบบสลับธีมแบบไดนามิก (Dynamic Theming System):** สามารถเปลี่ยนภาพลักษณ์ของสไลด์ (Swiss Minimalist, Retro Geometric, Editorial Classic, Tech Brutalist) ได้ทันทีอย่างราบรื่นโดยใช้ CSS Variables
- **สุนทรียศาสตร์ที่ยอดเยี่ยม (Aesthetic Excellence):** ปฏิบัติตามหลักการออกแบบของ `frontend-specialist` อย่างเคร่งครัด (ห้ามใช้สีม่วงเป็นค่าเริ่มต้น, กำหนดความโค้งมนขอบแบบสุดโต่งเฉพาะธีม เช่น ขอบฉาก 0px หรือขอบโค้งมน 24px, เว้นระยะห่างของพื้นที่ว่างอย่างหรูหรา)

---

## 3. เทคโนโลยีที่เลือกใช้และเหตุผล (Technology Stack & Rationale)
- **Frontend Framework:** React 19 + Vite 6 (สอดคล้องกับสแต็กดั้งเดิมของ RAG-LLM)
- **การจัดสไตล์และโทเค็น:** Tailwind CSS v4 (รองรับการตั้งค่าผ่าน CSS Variables ในตัว และรองรับ Container Queries เพื่อย่อขยายองค์ประกอบย่อยตามขนาดกล่องสไลด์)
- **การจัดการสถานะ (State Management):** Zustand v5 (สำหรับใช้ควบคุมสถานะการเปิดเล่น/แก้ไขหน้าสไลด์)
- **ตัวประมวลผลฝั่งหลัง (Backend Parser):** FastAPI + Python (ทำหน้าที่แปลง Markdown หรือบริบทของ RAG ให้กลายเป็นโครงสร้าง JSON ของบล็อกสไลด์แต่ละประเภท)

---

## 4. โครงสร้างไฟล์ที่เสนอ (Proposed File Structure)
เราจะเพิ่มคอมโพเนนต์และไฟล์ภายใต้โมดูล `presentation` ดังนี้:

```
frontend/src/
├── components/
│   └── presentation/
│       ├── SlideDeck.tsx            # หน้าหลักสำหรับควบคุมและนำเสนอสไลด์ (Deck Viewer)
│       ├── SlideContainer.tsx       # กล่องสไลด์แต่ละหน้า ปรับอัตราส่วนภาพแบบ Fluid (Aspect-ratio)
│       ├── ThemeSelector.tsx        # ส่วนสลับธีมและปรับโทนดีไซน์แบบไดนามิก
│       └── blocks/                  # คอมโพเนนต์บล็อกข้อมูลตามความหมายที่วิเคราะห์ได้จาก AI
│           ├── HeroBlock.tsx        # เลย์เอาต์เน้นความสะดุดตาของข้อความและหัวข้อ (Typographic)
│           ├── GridCardBlock.tsx    # การจัดเรียงการ์ดแบบอสมมาตร (Asymmetric columns)
│           ├── TimelineBlock.tsx    # บล็อกแสดงขั้นตอนการดำเนินงานเชิงลำดับเวลา (Flow)
│           ├── StatBlock.tsx        # บล็อกนำเสนอตัวเลขสถิติขนาดใหญ่พร้อมคำอธิบายขนาดเล็ก
│           └── SplitMediaBlock.tsx  # บล็อกแบ่งครึ่งเลย์เอาต์ ข้อความคู่ภาพแบบวางซ้อนเลเยอร์
backend/app/
└── services/
    └── presentation_parser.py       # บริการฝั่งหลัง แปลงข้อสรุป RAG เป็นบล็อก JSON ของสไลด์
```

---

## 5. รายละเอียดแต่ละขั้นตอน (Task Breakdown)

### เฟสที่ 1: รากฐานระบบ (ตัวประมวลผลฝั่งหลัง & ระบบสลับธีม)

#### [NEW] [presentation_parser.py](file:///c:/Work/rag-llm/backend/app/services/presentation_parser.py)
- **คำอธิบาย:** พัฒนาบริการฝั่งหลังที่จะรับข้อความสรุปรูปแบบ Markdown จากระบบ RAG แล้วทำการแยกวิเคราะห์เปลี่ยนโครงสร้างให้เป็นบล็อกข้อมูล JSON (ระบุลักษณะเลย์เอาต์สไลด์และประเภทของบล็อกย่อย แทนการคืนค่า HTML หรือรายการ Bullet Point แบบดิบ)
- **ผู้รับผิดชอบ:** `backend-specialist`
- **ทักษะที่ใช้:** `api-patterns`
- **INPUT:** ข้อความสรุป Markdown ดิบ
- **OUTPUT:** ข้อมูลโครงสร้าง JSON ประกอบด้วยรายการสไลด์ทั้งหมด โดยแต่ละหน้าจะมีค่า `layoutType` และอาร์เรย์ของโครงสร้าง `blocks` ย่อย
- **การทวนสอบ (VERIFY):** เขียน Unit tests ตรวจสอบว่ารายการเชิงลำดับขั้นตอนถูกแปลงเป็น `TimelineBlock` หรือรายการคุณสมบัติถูกแปลงเป็น `GridCardBlock` และไฮไลต์สำคัญเป็น `StatBlock` ได้อย่างถูกต้อง

#### [NEW] [themes.css](file:///c:/Work/rag-llm/frontend/src/components/presentation/themes.css)
- **คำอธิบาย:** กำหนดค่าคีย์ดีไซน์โทเค็น (CSS Theme Tokens) ที่สามารถปรับเปลี่ยนได้ตามความต้องการ เช่น คู่แบบอักษร (Font Pairings), ระยะห่างหน้ากระดาษ (Margins), ขอบมุมสไตล์เรขาคณิต (Borders), สีพื้นหลัง และสีเน้น
- **ผู้รับผิดชอบ:** `frontend-specialist`
- **ทักษะที่ใช้:** `frontend-design`
- **INPUT:** โทเค็นดีไซน์สำหรับ 4 ธีมหลัก (Swiss Minimalist, Retro Geometric, Editorial Classic, และ Tech Brutalist)
- **OUTPUT:** ประกาศตัวแปร CSS Variables ในระดับโกลบอลเพื่อพร้อมสลับสไตล์บนระดับ Container
- **การทวนสอบ (VERIFY):** ทดสอบการสับเปลี่ยนคลาสธีมที่คอนเทนเนอร์หลักและตรวจดูว่า CSS variables ถูกเปลี่ยนรูปแบบและสไตล์สไลด์ทั้งหมดปรับตามทันทีโดยไม่มีการ Re-render ส่วนคอมโพเนนต์

---

### เฟสที่ 2: ระบบจัดการแสดงผลสไลด์ฝั่งหน้าบ้าน (Core Presentation Engine)

#### [NEW] [SlideContainer.tsx](file:///c:/Work/rag-llm/frontend/src/components/presentation/SlideContainer.tsx)
- **คำอธิบาย:** พัฒนากล่องแสดงผลสำหรับแต่ละหน้าสไลด์ รองรับการย่อขยายขนาดแบบลื่นไหล (Fluid sizing) การจัดคอลัมน์แบบปรับตัว (Responsive columns) และใช้ Container Queries เพื่อกำหนดขนาดสไลด์ที่สัดส่วน 16:9 ให้ลงตัวที่สุดในทุกมิติ
- **ผู้รับผิดชอบ:** `frontend-specialist`
- **ทักษะที่ใช้:** `tailwind-patterns`
- **INPUT:** ข้อมูล JSON โครงสร้างสไลด์เดี่ยว
- **OUTPUT:** คอมโพเนนต์สไลด์ที่มีการขยายตัวแบบไดนามิกพร้อมเอฟเฟกต์ทรานซิชัน (CSS transitions)
- **การทวนสอบ (VERIFY):** ทดสอบการเปิดดูผ่าน Chrome DevTools ในขนาดความละเอียดต่างๆ เพื่อให้แน่ใจว่าไม่มีข้อความหรือกล่ององค์ประกอบใดๆ ล้นทะลักออกจากกรอบ และมีพฤติกรรมการปัดพับแถว (Auto-wrap) อย่างสวยงาม

#### [NEW] [blocks/](file:///c:/Work/rag-llm/frontend/src/components/presentation/blocks/)
- **คำอธิบาย:** พัฒนาคอมโพเนนต์ย่อยสำหรับบล็อกความหมายชนิดต่างๆ (Hero, GridCard, Timeline, Stat, SplitMedia)
- **ผู้รับผิดชอบ:** `frontend-specialist`
- **ทักษะที่ใช้:** `nextjs-react-expert`
- **INPUT:** ข้อมูล JSON เฉพาะบล็อกย่อย
- **OUTPUT:** ชุด React components ที่ประณีต มีการเคลื่อนไหวแบบ Micro-animations และมีระดับความลึกในการวางสไลด์
- **การทวนสอบ (VERIFY):** ตรวจสอบคุณภาพโค้ดตามเช็กลิสต์เพื่อให้สอดคล้องกับหลักจิตวิทยา UX อย่างสมบูรณ์ (อาศัยกฎ Isolation Effect/Von Restorff, Miller's Law) และมีการรองรับเกณฑ์ความเปรียบต่างสีสำหรับการอ่านข้อมูลอย่างชัดเจน

---

### เฟสที่ 3: ระบบควบคุมและบูรณาการการนำเสนอ (Integration & Interactive Controls)

#### [NEW] [SlideDeck.tsx](file:///c:/Work/rag-llm/frontend/src/components/presentation/SlideDeck.tsx)
- **คำอธิบาย:** รวมหน้าแสดงผลสไลด์นำเสนอตัวเต็ม ประกอบด้วยแถบควบคุมเมนูเสริม, ปุ่มนำเสนอเต็มจอ (Full-screen API), ระบบสลับสไลด์ผ่านคีย์บอร์ดหรือทัชสกรีน (Keyboard/Swipe Navigation) และแถบควบคุมด้านข้างสำหรับปรับเปลี่ยนการเลือกธีมสีและสไตล์เรขาคณิต
- **ผู้รับผิดชอบ:** `frontend-specialist`
- **ทักษะที่ใช้:** `frontend-design`
- **INPUT:** ข้อมูลออบเจกต์โครงสร้างสไลด์ทั้งเด็ค
- **OUTPUT:** หน้าจอนำเสนอ (Presenter mode layout) สไตล์พรีเมียม
- **การทวนสอบ (VERIFY):** ทดสอบตรวจดูความเร็วและเอฟเฟกต์การเคลื่อนไหว (Visual-effects and animation checks) ต้องมั่นใจว่าใช้ GPU-accelerated transition (`transform`, `opacity`) เพื่อความลื่นไหลระดับ 60fps และรองรับ prefers-reduced-motion

---

## 6. ขั้นตอน X: รายการตรวจสอบการทวนสอบ (Phase X: Verification Checklist)

### การตรวจสอบอัตโนมัติ (Automated Audits)
- เรียกใช้สคริปต์สแกนช่องโหว่ความปลอดภัย: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- เรียกใช้สคริปต์ตรวจสอบความสามารถเข้าถึงและจิตวิทยาการออกแบบ UX: `python .agent/skills/frontend-design/scripts/ux_audit.py .`

### การตรวจสอบด้วยตัวเอง (Manual Verification)
- [ ] ข้อความไม่ล้นหรือซ้อนทับกันในทุกระดับขนาดหน้าจอ (Breakpoints)
- [ ] เมื่อกดสลับธีมสีและดีไซน์เรขาคณิต ตัวแปรสไตล์จะเปลี่ยนสีและกรอบขอบทันทีในทุกหน้าสไลด์
- [ ] สไลด์ในแต่ละหน้ามีความหลากหลายทางสายตา (Visual rhythm) ปราศจากสไลด์ประเภทโครงสร้างเดียวกันเรียงลำดับซ้ำกัน
- [ ] ยืนยันว่าไม่มีการนำเฉดสีม่วง/คราม (Purple/Indigo) มาใช้เป็นค่าเริ่มต้นโดยเด็ดขาดตามกฎ Purple Ban
