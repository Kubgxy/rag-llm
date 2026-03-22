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

      // สร้าง session ใหม่
      createSession: () => {
        const newSessionId = generateSessionId()
        set({ sessionId: newSessionId })
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

      // รีเซ็ต session (เคลียร์ทุกอย่างเริ่มใหม่)
      resetSession: () => {
        const newSessionId = generateSessionId()
        set({ sessionId: newSessionId })
        return newSessionId
      },
    }),
    {
      name: 'rag-session-storage', // ชื่อ key ใน localStorage
      partialize: (state) => ({ sessionId: state.sessionId }), // เก็บแค่ sessionId
    }
  )
)
