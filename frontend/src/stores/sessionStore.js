import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSessionApi } from '../services/api.js'

/**
 * Session Store สำหรับจัดการ session_id (UUID จาก backend API)
 * ใช้ persist เพื่อเก็บ session_id ไว้ใน localStorage
 */
export const useSessionStore = create(
  persist(
    (set, get) => ({
      sessionId: null,
      chatTitle: 'New Chat',
      chatTitleLoading: false,
      arenaSessionId: null,
      isCreatingSession: false,

      // สร้าง session ใหม่ผ่าน API (ได้ UUID กลับ)
      createSession: async (title = null, sessionType = 'notebook') => {
        set({ isCreatingSession: true })
        const newSessionId = crypto.randomUUID()
        set({ sessionId: newSessionId, chatTitle: title || 'New Chat', isCreatingSession: false })
        return newSessionId
      },

      // ดึง session_id ปัจจุบัน (ถ้าไม่มีจะต้อง createSession ก่อน)
      getSessionId: () => {
        const { sessionId } = get()
        return sessionId
      },

      // ตั้ง sessionId ตรงๆ (สำหรับ hydrate จาก history)
      setSessionId: (id) => set({ sessionId: id }),

      // สร้าง arena session ให้แยกออก
      createArenaSession: async () => {
        const newId = crypto.randomUUID()
        set({ arenaSessionId: newId })
        return newId
      },

      getArenaSessionId: () => {
        const { arenaSessionId } = get()
        return arenaSessionId
      },

      // รีเซ็ต session (สร้างใหม่ผ่าน API)
      resetSession: async () => {
        const { createSession } = get()
        return await createSession()
      },

      // ตั้งชื่อแชท
      setChatTitle: (title) => set({ chatTitle: title, chatTitleLoading: false }),

      // ตั้ง loading state
      setChatTitleLoading: (loading) => set({ chatTitleLoading: loading }),
    }),
    {
      name: 'rag-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        chatTitle: state.chatTitle,
        arenaSessionId: state.arenaSessionId,
      }),
    }
  )
)
