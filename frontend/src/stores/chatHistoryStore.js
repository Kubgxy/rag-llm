import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatHistoryStore = create(
  persist(
    (set, get) => ({
      history: {}, // { sessionId: { title, messages, documents, importedWebSources, summary, mindmapNodes, mindmapEdges, categoryId, updatedAt } }
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
                importedWebSources: docData?.importedWebSources || state.history[sessionId]?.importedWebSources,
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

      fetchHistoryFromBackend: async () => {
        try {
          const { listSessionsApi } = await import('../services/api.js')
          const sessions = await listSessionsApi()
          
          set((state) => {
            const newHistory = { ...state.history }
            
            for (const session of sessions) {
              const pdfDocs = []
              const webSources = []
              let summary = null
              let mindmapNodes = []
              let mindmapEdges = []

              if (session.documents && Array.isArray(session.documents)) {
                for (const doc of session.documents) {
                  if (doc.source_type === 'web') {
                    webSources.push({
                      title: doc.file_name,
                      url: doc.source_url,
                      snippet: doc.summary || '',
                      source: doc.file_name,
                    })
                  } else {
                    pdfDocs.push({
                      name: doc.file_name,
                      size: doc.file_size || 0,
                      uploadedAt: doc.created_at,
                    })
                  }
                  if (!summary && doc.summary) {
                    summary = doc.summary
                  }
                  if (mindmapNodes.length === 0 && doc.mindmap && Array.isArray(doc.mindmap.nodes)) {
                    mindmapNodes = doc.mindmap.nodes
                    mindmapEdges = doc.mindmap.edges || []
                  }
                }
              }

              // Preserve client-only properties like categoryId
              const existingSession = state.history[session.id] || {}

              newHistory[session.id] = {
                title: session.title || existingSession.title || 'New Chat',
                messages: (session.messages || []).map(msg => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  thinking: msg.thinking || null,
                  timestamp: new Date(msg.created_at).getTime(),
                  metadata: {
                    model: msg.model_name,
                    thinkingExpanded: false,
                    citations: msg.citations || [],
                  }
                })),
                documents: pdfDocs,
                importedWebSources: webSources,
                summary: summary || existingSession.summary || null,
                mindmapNodes: mindmapNodes.length > 0 ? mindmapNodes : (existingSession.mindmapNodes || []),
                mindmapEdges: mindmapEdges.length > 0 ? mindmapEdges : (existingSession.mindmapEdges || []),
                categoryId: existingSession.categoryId || null,
                updatedAt: new Date(session.updated_at).getTime(),
              }
            }

            return { history: newHistory }
          })
        } catch (error) {
          console.error('❌ Failed to fetch session history from backend:', error)
        }
      },
    }),
    {
      name: 'rag-chat-history',
    }
  )
)
