import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatHistoryStore = create(
  persist(
    (set, get) => ({
      history: {}, // { sessionId: { title, messages, documents, summary, mindmapNodes, mindmapEdges, categoryId, updatedAt } }
      activeSessionId: null,

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      saveSession: (sessionId, messages, docData = null, customTitle = null) =>
        set((state) => {
          // Use custom title, or fallback to existing title, or derive from first message
          const title = customTitle
            || state.history[sessionId]?.title
            || messages[0]?.content?.slice(0, 50)
            || 'New Chat'

          return {
            history: {
              ...state.history,
              [sessionId]: {
                title,
                messages,
                documents: docData?.documents || state.history[sessionId]?.documents,
                summary: docData?.summary || state.history[sessionId]?.summary,
                mindmapNodes: docData?.mindmapNodes || state.history[sessionId]?.mindmapNodes,
                mindmapEdges: docData?.mindmapEdges || state.history[sessionId]?.mindmapEdges,
                categoryId: state.history[sessionId]?.categoryId || null, // Preserve category
                updatedAt: Date.now()
              }
            }
          }
        }),

      updateSessionTitle: (sessionId, newTitle) =>
        set((state) => {
          if (!state.history[sessionId]) return state
          return {
            history: {
              ...state.history,
              [sessionId]: {
                ...state.history[sessionId],
                title: newTitle,
                updatedAt: Date.now()
              }
            }
          }
        }),

      // NEW: Update session category
      updateSessionCategory: (sessionId, categoryId) =>
        set((state) => {
          if (!state.history[sessionId]) return state
          return {
            history: {
              ...state.history,
              [sessionId]: {
                ...state.history[sessionId],
                categoryId,
                updatedAt: Date.now()
              }
            }
          }
        }),

      deleteSession: (sessionId) =>
        set((state) => {
          const newHistory = { ...state.history }
          delete newHistory[sessionId]
          return { history: newHistory }
        }),
    }),
    {
      name: 'rag-chat-history',
    }
  )
)
