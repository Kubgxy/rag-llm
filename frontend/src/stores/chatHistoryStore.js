import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatHistoryStore = create(
  persist(
    (set, get) => ({
      history: {}, // { sessionId: { title, messages, documents, summary, mindmapNodes, mindmapEdges, updatedAt } }
      activeSessionId: null,

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      saveSession: (sessionId, messages, docData = null) => 
        set((state) => {
          const title = messages[0]?.content?.slice(0, 30) || 'New Chat'
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
