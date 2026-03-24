import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Session Store สำหรับจัดการ session_id ของแต่ละ session
 * ใช้ persist เพื่อเก็บ session_id ไว้ใน localStorage
 */

// สร้าง UUID แบบง่าย
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}

export const useSessionStore = create(
  persist(
    (set, get) => ({
      sessionId: null,
      chatTitle: 'New Chat', // NEW: chat title
      chatTitleLoading: false, // NEW: track if loading
      arenaSessionId: null, // NEW: separate session for compare mode

      // สร้าง session ใหม่
      createSession: () => {
        const newSessionId = generateSessionId()
        set({ sessionId: newSessionId, chatTitle: 'New Chat' })
        return newSessionId
      },

      // ดึง session_id ปัจจุบัน (ถ้าไม่มีก็สร้างใหม่)
      getSessionId: () => {
        const { sessionId, createSession } = get()
        if (!sessionId) {
          return createSession()
        }
        return sessionId
      },

      // NEW: สร้าง arena session ให้แยกออก
      getArenaSessionId: () => {
        const { arenaSessionId, createSession } = get()
        if (!arenaSessionId) {
          const newId = generateSessionId()
          set({ arenaSessionId: newId })
          return newId
        }
        return arenaSessionId
      },

      // รีเซ็ต session (เคลียร์ทุกอย่างเริ่มใหม่)
      resetSession: () => {
        const newSessionId = generateSessionId()
        set({ sessionId: newSessionId, chatTitle: 'New Chat' })
        return newSessionId
      },

      // NEW: ตั้งชื่อแชท
      setChatTitle: (title) => set({ chatTitle: title, chatTitleLoading: false }),

      // NEW: ตั้ง loading state
      setChatTitleLoading: (loading) => set({ chatTitleLoading: loading }),
    }),
    {
      name: 'rag-session-storage', // ชื่อ key ใน localStorage
      partialize: (state) => ({
        sessionId: state.sessionId,
        chatTitle: state.chatTitle,
        arenaSessionId: state.arenaSessionId
      }), // เก็บ sessionId + chatTitle + arenaSessionId
    }
  )
)
