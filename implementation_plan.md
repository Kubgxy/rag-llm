# NotebookLM Clone with Local RAG & Model Arena — Frontend Implementation Plan

Build a complete React + Vite frontend with two main pages (Workspace & Model Arena), dark/light theme, responsive design, and a mock API service layer.

## Proposed Changes

### Project Scaffolding

#### [NEW] Vite + React project initialization

- Run `npx -y create-vite@latest ./ --template react` in `e:\My Project\rag-llm`
- Install dependencies: `react-router-dom`, `tailwindcss @tailwindcss/vite`, `lucide-react`, `react-markdown`, `@xyflow/react`, `axios`, `zustand`
- Configure Tailwind CSS v4 with dark mode via `@custom-variant dark (&:where(.dark *))` in `index.css`
- Create `.env` with `VITE_API_BASE_URL=http://localhost:8000`

---

### Folder Structure

```
src/
├── components/
│   ├── layout/          # Navbar, Layout
│   ├── chat/            # ChatMessage, ChatInput, ModelSelector
│   ├── upload/          # UploadZone
│   ├── knowledge/       # KnowledgeTabs, Summary, Mindmap
│   ├── arena/           # ArenaChat, VoteButton
│   └── ui/              # Toast
├── pages/
│   ├── Workspace.jsx
│   └── ModelArena.jsx
├── services/
│   └── api.js
├── stores/
│   ├── themeStore.js
│   ├── documentStore.js
│   └── chatStore.js
├── hooks/
│   ├── useChat.js
│   └── useUpload.js
├── layouts/
│   └── MainLayout.jsx
├── App.jsx
├── main.jsx
└── index.css
```

---

### State Management (Zustand)

#### [NEW] `src/stores/themeStore.js`
- `theme` state (`'light'` / `'dark'`), toggleTheme action
- Persists to localStorage, applies `.dark` class on `<html>`

#### [NEW] `src/stores/documentStore.js`
- States: `documents`, `summary`, `mindmapNodes`, `mindmapEdges`, `isUploading`, `uploadError`
- Actions: `setUploadResult`, `clearDocuments`, `setUploading`

#### [NEW] `src/stores/chatStore.js`
- States: `messages`, `isLoading`, `selectedModel`, `arenaMessages`, `arenaModels`
- Actions: `addMessage`, `setLoading`, `setSelectedModel`, `addArenaResponse`

---

### API Service Layer

#### [NEW] `src/services/api.js`
- Axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL`
- `uploadDocument(file)` → POST `/upload` (multipart/form-data)
- `chatSingle(query, modelName)` → POST `/chat/single`
- `chatCompare(query, models)` → POST `/chat/compare`

---

### Custom Hooks

#### [NEW] `src/hooks/useUpload.js`
- Wraps file upload logic, drag/drop handlers, calls documentStore

#### [NEW] `src/hooks/useChat.js`
- Wraps chat send logic, manages loading state, calls chatStore

---

### Layout & Navigation

#### [NEW] `src/components/layout/Navbar.jsx`
- Logo text "NotebookLM", nav links (Workspace, Model Arena)
- Dark/light toggle button using `Sun`/`Moon` icons from lucide-react
- Mobile hamburger menu with slide-out drawer

#### [NEW] `src/layouts/MainLayout.jsx`
- Wraps `<Navbar />` + `<Outlet />` from react-router-dom

---

### Page 1: Workspace

#### [NEW] `src/pages/Workspace.jsx`
- 2-column layout (left: documents, right: chat)
- On mobile: stacked vertically or tab-based

#### [NEW] `src/components/upload/UploadZone.jsx`
- Drag & drop area with dashed border
- File input for PDF, shows progress/loading spinner
- On success → triggers auto-knowledge population

#### [NEW] `src/components/knowledge/KnowledgeTabs.jsx`
- Tab switcher: "Summary" | "Mindmap"

#### [NEW] `src/components/knowledge/Summary.jsx`
- Renders summary text with react-markdown

#### [NEW] `src/components/knowledge/Mindmap.jsx`
- Uses `@xyflow/react` to render nodes/edges from documentStore

#### [NEW] `src/components/chat/ModelSelector.jsx`
- Dropdown to pick AI model (Typhoon 2.5, Chinda, etc.)

#### [NEW] `src/components/chat/ChatMessage.jsx`
- Single message bubble, renders content with react-markdown
- Different styling for user vs assistant

#### [NEW] `src/components/chat/ChatInput.jsx`
- Text input + send button, disables while loading

---

### Page 2: Model Arena

#### [NEW] `src/pages/ModelArena.jsx`
- Two model dropdowns at top
- Split-screen chat panel below
- Shared input at bottom

#### [NEW] `src/components/arena/ArenaChat.jsx`
- Side-by-side response panels for Model A and Model B
- Each panel shows messages with markdown rendering

#### [NEW] `src/components/arena/VoteButton.jsx`
- Thumbs up/down icons, visual feedback on click

---

### Toast Notification

#### [NEW] `src/components/ui/Toast.jsx`
- Lightweight toast system for error/success messages
- Auto-dismiss after timeout

---

### Documentation

#### [NEW] `README.md`
- Project overview, tech stack, installation, `.env` setup

#### [NEW] `docs/architecture.md`
- Component tree, state management, routing

#### [NEW] `docs/api-specs.md`
- Detailed request/response JSON specs for all 3 endpoints

---

## Verification Plan

### Automated Tests
- Run `npm run dev` and verify the dev server starts without errors
- Run `npm run build` to ensure the project compiles cleanly

### Browser Verification
- Open the app in the browser and visually verify:
  1. Navbar renders with logo, nav links, theme toggle
  2. Dark/light mode toggle works correctly
  3. Workspace page shows upload zone, knowledge tabs, and chat panel
  4. Model Arena page shows dual selectors and split-screen chat
  5. Responsive layout collapses correctly on mobile viewport
  6. File drag & drop zone highlights on drag-over
  7. Chat input disables when sending
