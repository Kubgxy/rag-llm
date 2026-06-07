import { create } from 'zustand'
import { listSystemSessionsApi, getSystemSessionHistoryApi } from '../services/api.js'

/**
 * Store สำหรับจัดการสถานะและข้อมูลของ System Sessions (Shared Sessions)
 * เช่น ระบบ HRM, ประวัติการซิงค์ข้อมูล
 */
export const useSystemSessionStore = create((set, get) => ({
  systemSessions: [],
  syncHistory: {}, // { [sessionId]: Array of SyncHistory }
  isLoading: false,
  error: null,

  // ดึงรายการ System Sessions ที่เปิดใช้งานทั้งหมด
  fetchSystemSessions: async () => {
    set({ isLoading: true, error: null })
    try {
      const sessions = await listSystemSessionsApi()
      set({ systemSessions: sessions, isLoading: false })
    } catch (err) {
      console.error('❌ Failed to fetch system sessions:', err)
      set({ error: err.message || 'Failed to fetch system sessions', isLoading: false })
    }
  },

  // ดึงประวัติการซิงค์ข้อมูลของ System Session ที่ระบุ
  fetchSyncHistory: async (sessionId, limit = 20) => {
    try {
      const history = await getSystemSessionHistoryApi(sessionId, limit)
      set((state) => ({
        syncHistory: {
          ...state.syncHistory,
          [sessionId]: history
        }
      }))
    } catch (err) {
      console.error(`❌ Failed to fetch sync history for ${sessionId}:`, err)
    }
  },

  // ค้นหารายละเอียด System Session จาก cache ใน store
  getSystemSessionFromCache: (sessionId) => {
    const { systemSessions } = get()
    return systemSessions.find((s) => s.id === sessionId) || null
  }
}))
