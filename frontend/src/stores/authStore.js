import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMeApi, refreshTokenApi } from '../services/api.js'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true, error: null })
      },

      setUser: (user) => set({ user }),

      setError: (error) => set({ error, isLoading: false }),

      clearError: () => set({ error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        // ล้างค่าข้อมูลของแผงแชท เอกสาร และประวัติของ account ปัจจุบันใน LocalStorage
        try {
          localStorage.removeItem('rag-chat-history')
          localStorage.removeItem('rag-session-storage')
          localStorage.removeItem('rag-document-storage')
        } catch (e) {
          console.error('❌ Failed to clear localStorage on logout:', e)
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        })

        // บังคับเปลี่ยนหน้าและโหลดหน้าใหม่เพื่อทำความสะอาดหน่วยความจำ (RAM State)
        window.location.href = '/auth'
      },

      // Hydrate auth state on app start
      hydrate: async () => {
        const { accessToken, refreshToken } = get()
        if (!accessToken) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const user = await getMeApi()
          set({ user, isAuthenticated: true })
        } catch {
          // Token expired or invalid — try refresh
          if (refreshToken) {
            try {
              const tokens = await refreshTokenApi(refreshToken)
              set({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                isAuthenticated: true,
              })
              // Retry profile fetch
              const user = await getMeApi()
              set({ user })
            } catch {
              // Refresh also failed — logout
              get().logout()
            }
          } else {
            get().logout()
          }
        }
      },
    }),
    {
      name: 'rag-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
