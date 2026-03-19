# NotebookLM Clone — Local RAG & Model Arena

A modern, full-featured **NotebookLM-inspired** frontend application featuring **document-powered AI chat** with RAG (Retrieval-Augmented Generation) and a **Model Arena** for head-to-head AI model comparison.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **PDF Upload** | Drag & drop PDF upload with processing status |
| 🧠 **Auto-Knowledge** | Automatic summary & interactive mindmap generation |
| 💬 **AI Chat** | Single-model RAG chat with markdown rendering |
| ⚔️ **Model Arena** | Compare 2 AI models side-by-side on the same query |
| 👍 **Vote System** | Thumbs up/down feedback on arena responses |
| 🌙 **Dark/Light Mode** | System-aware theme toggle with smooth transitions |
| 📱 **Responsive** | Mobile, tablet, and desktop layouts |

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4 (dark mode via class strategy)
- **Routing**: React Router DOM v7
- **State Management**: Zustand v5
- **Icons**: Lucide React
- **Markdown**: react-markdown
- **Mindmap**: @xyflow/react (ReactFlow)
- **HTTP Client**: Axios

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd rag-llm

# Install dependencies
npm install

# Create environment file (already provided as .env)
# Edit VITE_API_BASE_URL if your backend is on a different port

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar
│   ├── chat/            # ChatMessage, ChatInput, ModelSelector
│   ├── upload/          # UploadZone (drag & drop)
│   ├── knowledge/       # KnowledgeTabs, Summary, Mindmap
│   ├── arena/           # ArenaChat, VoteButton
│   └── ui/              # Toast notification system
├── pages/
│   ├── Workspace.jsx    # Main document + chat page
│   └── ModelArena.jsx   # Model comparison page
├── services/
│   └── api.js           # Axios API client
├── stores/
│   ├── themeStore.js    # Dark/light mode state
│   ├── documentStore.js # Document & knowledge state
│   └── chatStore.js     # Chat & arena state
├── hooks/
│   ├── useUpload.js     # File upload logic
│   └── useChat.js       # Chat & arena logic
├── layouts/
│   └── MainLayout.jsx   # App shell with Navbar + Toast
├── App.jsx              # Routes
├── main.jsx             # Entry point
└── index.css            # Tailwind + custom styles
```

---

## 📖 Documentation

- [Architecture Guide](./docs/architecture.md) — Component hierarchy & state management
- [API Specifications](./docs/api-specs.md) — Request/Response JSON contracts for backend team

---

## 📝 License

MIT
