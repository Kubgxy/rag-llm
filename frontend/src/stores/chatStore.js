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
  { id: 'llama-3.1', name: 'LLaMA 3.1' },
  { id: 'gemma-2', name: 'Gemma 2' },
]

export const useChatStore = create(
  persist(
    (set, get) => ({
      // Single-model chat
      messages: [],
      isLoading: false,
      selectedModel: AVAILABLE_MODELS[0].id,

      // Arena chat
      arenaMessages: [],
      arenaModelA: AVAILABLE_MODELS[0].id,
      arenaModelB: AVAILABLE_MODELS[1].id,
      isArenaLoading: false,

      // Single chat actions
      setSelectedModel: (model) => set({ selectedModel: model }),

      addUserMessage: (content) =>
        set((state) => ({
          messages: [...state.messages, { role: 'user', content, timestamp: Date.now() }],
        })),

      addAssistantMessage: (content) =>
        set((state) => ({
          messages: [...state.messages, { role: 'assistant', content, timestamp: Date.now() }],
        })),

      setLoading: (val) => set({ isLoading: val }),

      clearMessages: () => set({ messages: [] }),

      // Arena actions
      setArenaModelA: (model) => set({ arenaModelA: model }),
      setArenaModelB: (model) => set({ arenaModelB: model }),

      addArenaUserMessage: (content) =>
        set((state) => ({
          arenaMessages: [
            ...state.arenaMessages,
            { role: 'user', content, timestamp: Date.now() },
          ],
        })),

      addArenaResponse: ({ responseA, responseB }) =>
        set((state) => ({
          arenaMessages: [
            ...state.arenaMessages,
            {
              role: 'arena-response',
              responseA,
              responseB,
              timestamp: Date.now(),
              votes: { a: null, b: null },
            },
          ],
        })),

      setArenaVote: (messageIndex, side, vote) =>
        set((state) => {
          const updated = [...state.arenaMessages]
          if (updated[messageIndex]?.votes) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              votes: { ...updated[messageIndex].votes, [side]: vote },
            }
          }
          return { arenaMessages: updated }
        }),

      setArenaLoading: (val) => set({ isArenaLoading: val }),

      clearArenaMessages: () => set({ arenaMessages: [] }),
    }),
    {
      name: 'rag-chat-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({
        messages: state.messages,
        selectedModel: state.selectedModel,
        arenaMessages: state.arenaMessages,
        arenaModelA: state.arenaModelA,
        arenaModelB: state.arenaModelB,
      }), // only persist these fields
    }
  )
)
