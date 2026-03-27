import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const AVAILABLE_MODELS = [
  {
    id: 'scb10x/typhoon2.5-qwen3-4b',
    name: 'Typhoon 2.5 (4B)'
  },
  {
    id: 'iapp/chinda-qwen3-4b',
    name: 'Chinda (4B)'
  },
]

export const useChatStore = create(
  persist(
    (set, get) => ({
      // Single-model chat
      messages: [],
      isLoading: false,
      selectedModel: AVAILABLE_MODELS[0].id,

      // Arena chat - store per session
      arenaMessagesBySession: {}, // { [sessionId]: messages[] }
      arenaModelA: AVAILABLE_MODELS[0].id,
      arenaModelB: AVAILABLE_MODELS[1].id,
      isArenaLoading: false,

      // Helper to get current arena messages for a session
      getArenaMessages: (sessionId) => {
        const state = get()
        return state.arenaMessagesBySession[sessionId] || []
      },

      // Single chat actions
      setSelectedModel: (model) => set({ selectedModel: model }),

      addUserMessage: (content) =>
        set((state) => ({
          messages: [...state.messages, {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: 'user',
            content,
            timestamp: Date.now()
          }],
        })),

      addAssistantMessage: (data) => {
        // data can be either string (old format) or object with id, role, content, thinking, timestamp, metadata
        const messageData = typeof data === 'string'
          ? {
              id: `msg-${Date.now()}-${Math.random()}`,
              role: 'assistant',
              content: data,
              timestamp: Date.now(),
              thinking: null,
              metadata: { thinkingExpanded: false }
            }
          : {
              id: data.id || `msg-${Date.now()}-${Math.random()}`,
              role: 'assistant',
              content: data.content,
              thinking: data.thinking || null,
              timestamp: data.timestamp || Date.now(),
              metadata: data.metadata || { thinkingExpanded: false }
            }

        return set((state) => ({
          messages: [...state.messages, messageData],
        }))
      },

      toggleThinkingExpanded: (messageId) =>
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === messageId && msg.metadata
              ? {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    thinkingExpanded: !msg.metadata.thinkingExpanded
                  }
                }
              : msg
          )
        })),

      setLoading: (val) => set({ isLoading: val }),

      clearMessages: () => set({ messages: [] }),

      // Arena actions
      setArenaModelA: (model) => set({ arenaModelA: model }),
      setArenaModelB: (model) => set({ arenaModelB: model }),

      addArenaUserMessage: (sessionId, content) =>
        set((state) => {
          const currentMessages = state.arenaMessagesBySession[sessionId] || []
          return {
            arenaMessagesBySession: {
              ...state.arenaMessagesBySession,
              [sessionId]: [
                ...currentMessages,
                { role: 'user', content, timestamp: Date.now() },
              ],
            },
          }
        }),

      addArenaResponse: (sessionId, { responseA, responseB }) =>
        set((state) => {
          const currentMessages = state.arenaMessagesBySession[sessionId] || []
          return {
            arenaMessagesBySession: {
              ...state.arenaMessagesBySession,
              [sessionId]: [
                ...currentMessages,
                {
                  role: 'arena-response',
                  responseA,
                  responseB,
                  timestamp: Date.now(),
                  votes: { a: null, b: null },
                },
              ],
            },
          }
        }),

      setArenaVote: (sessionId, messageIndex, side, vote) =>
        set((state) => {
          const currentMessages = [...(state.arenaMessagesBySession[sessionId] || [])]
          if (currentMessages[messageIndex]?.votes) {
            currentMessages[messageIndex] = {
              ...currentMessages[messageIndex],
              votes: { ...currentMessages[messageIndex].votes, [side]: vote },
            }
          }
          return {
            arenaMessagesBySession: {
              ...state.arenaMessagesBySession,
              [sessionId]: currentMessages,
            },
          }
        }),

      setArenaLoading: (val) => set({ isArenaLoading: val }),

      clearArenaMessages: (sessionId) =>
        set((state) => {
          const newMessages = { ...state.arenaMessagesBySession }
          delete newMessages[sessionId]
          return { arenaMessagesBySession: newMessages }
        }),
    }),
    {
      name: 'rag-chat-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({
        messages: state.messages, // now includes id, thinking, metadata
        selectedModel: state.selectedModel,
        arenaMessagesBySession: state.arenaMessagesBySession,
        arenaModelA: state.arenaModelA,
        arenaModelB: state.arenaModelB,
      }), // only persist these fields
    }
  )
)
