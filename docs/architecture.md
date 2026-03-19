# Architecture Guide

## Overview

The application follows a modern React architecture with clear separation of concerns:
- **Pages** handle layout composition
- **Components** are reusable UI building blocks
- **Stores** (Zustand) manage global state
- **Hooks** encapsulate business logic
- **Services** handle API communication

---

## Component Hierarchy

```
App
└── MainLayout (Navbar + ToastProvider + Outlet)
    ├── Workspace (Page)
    │   ├── UploadZone
    │   ├── KnowledgeTabs
    │   │   ├── Summary
    │   │   └── Mindmap (ReactFlow)
    │   ├── ModelSelector
    │   ├── ChatMessage[]
    │   └── ChatInput
    │
    └── ModelArena (Page)
        ├── Model A Dropdown
        ├── Model B Dropdown
        ├── ArenaChat
        │   └── VoteButton[]
        └── ChatInput
```

---

## State Management (Zustand)

Three independent stores, each serving a single concern:

### `themeStore`
| State | Type | Description |
|---|---|---|
| `theme` | `'light' \| 'dark'` | Current theme, persisted to `localStorage` |

| Action | Description |
|---|---|
| `toggleTheme()` | Flips theme and applies `.dark` class on `<html>` |

### `documentStore`
| State | Type | Description |
|---|---|---|
| `documents` | `Array<{name, uploadedAt}>` | List of uploaded files |
| `summary` | `string` | Auto-generated document summary |
| `mindmapNodes` | `Array<Node>` | ReactFlow node data |
| `mindmapEdges` | `Array<Edge>` | ReactFlow edge data |
| `isUploading` | `boolean` | Upload in progress |
| `uploadError` | `string \| null` | Last upload error |
| `activeTab` | `'summary' \| 'mindmap'` | Current knowledge tab |

### `chatStore`
| State | Type | Description |
|---|---|---|
| `messages` | `Array<Message>` | Single-model chat history |
| `selectedModel` | `string` | Active model ID |
| `isLoading` | `boolean` | Chat request in progress |
| `arenaMessages` | `Array<ArenaMessage>` | Arena chat history |
| `arenaModelA/B` | `string` | Selected arena models |
| `isArenaLoading` | `boolean` | Arena request in progress |

---

## Routing

| Path | Page | Description |
|---|---|---|
| `/` | `Workspace` | Main document upload + chat interface |
| `/arena` | `ModelArena` | Model comparison arena |

Both routes are wrapped by `MainLayout` which provides the persistent `Navbar` and `ToastProvider`.

---

## Custom Hooks

### `useUpload()`
Encapsulates drag & drop logic, file validation (PDF only, ≤50MB), and API upload calls. Updates `documentStore` on success/failure.

### `useChat()`
Manages single-model chat flow: adds user message → calls API → adds assistant response. Handles loading state and errors.

### `useArenaChat()`
Manages arena comparison flow: sends query to both models simultaneously → displays side-by-side responses. Includes vote tracking.

---

## Toast Notification System

The `ToastProvider` uses React Context to expose `addToast(message, type, duration)` to any component. Toasts auto-dismiss with CSS enter/exit animations.

Types: `success`, `error`, `info`

---

## Data Flow

```
User Upload → useUpload hook → api.uploadDocument()
  → documentStore.setUploadResult() → UI updates
  
User Chat → useChat hook → api.chatSingle()
  → chatStore.addAssistantMessage() → UI updates

Arena Chat → useArenaChat hook → api.chatCompare()
  → chatStore.addArenaResponse() → Split-screen UI updates
```
