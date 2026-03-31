import { create } from 'zustand'
import { getRuntimeStatus, setRuntimeDevice, getRestartStatus, restartBackend } from '../services/api.js'

export const useRuntimeStore = create((set, get) => ({
  device: 'gpu',
  isLoading: false,
  isInitialized: false,
  activeRequests: 0,
  
  // Restart/Switch progress state
  restartStatus: 'idle', // idle, switching, waiting_requests, shutting_down, restarting, ready
  restartMessage: '',
  restartProgress: 0,
  isPollingRestart: false,

  fetchRuntime: async () => {
    if (get().isLoading) return

    set({ isLoading: true })
    try {
      const data = await getRuntimeStatus()
      set({
        device: data.device === 'cpu' ? 'cpu' : 'gpu',
        activeRequests: data.active_requests || 0,
        isInitialized: true,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  updateRuntime: async (device, modelNames = [], options = {}) => {
    const { waitForPending = true, force = false } = options
    
    // แสดง progress ทันทีก่อน API call
    set({ 
      isLoading: true,
      restartStatus: 'switching',
      restartMessage: 'กำลังเริ่มสลับ Runtime...',
      restartProgress: 5,
    })
    
    try {
      // Simulate progress ระหว่างรอ API
      const progressInterval = setInterval(() => {
        const current = get().restartProgress
        if (current < 40) {
          set({ restartProgress: current + 5 })
        }
      }, 300)
      
      const data = await setRuntimeDevice(device, modelNames, waitForPending, force)
      
      clearInterval(progressInterval)
      
      set({
        device: data.device === 'cpu' ? 'cpu' : 'gpu',
        activeRequests: data.active_requests || 0,
        isInitialized: true,
        restartProgress: 50,
        restartMessage: 'กำลังโหลดโมเดลใหม่...',
        restartStatus: 'restarting',
      })
      
      // เริ่ม polling restart status
      get().startPollingRestartStatus()
      
      return data
    } catch (err) {
      set({ 
        isLoading: false,
        restartStatus: 'idle',
        restartProgress: 0,
        restartMessage: '',
      })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  // ===== Restart Progress Polling =====
  
  startPollingRestartStatus: () => {
    if (get().isPollingRestart) return
    
    set({ isPollingRestart: true })
    
    let pollCount = 0
    const maxPolls = 90 // 3 นาที (90 * 2 วินาที)
    
    const pollInterval = setInterval(async () => {
      pollCount++
      
      try {
        const data = await getRestartStatus()
        
        set({
          restartStatus: data.status,
          restartMessage: data.message,
          restartProgress: data.progress,
          activeRequests: data.active_requests,
        })
        
        // หยุด polling เมื่อ status เป็น idle หรือ ready
        if (data.status === 'idle' || data.status === 'ready') {
          clearInterval(pollInterval)
          set({ isPollingRestart: false })
          
          // แสดง ready สักครู่แล้วค่อย reset
          if (data.status === 'idle' && get().restartProgress >= 50) {
            set({ 
              restartStatus: 'ready',
              restartProgress: 100,
              restartMessage: 'สลับ Runtime สำเร็จ!'
            })
          }
        }
      } catch (err) {
        // Backend อาจ restart อยู่ ลองใหม่
        console.log('⏳ Waiting for backend...')
        
        // เพิ่ม progress เล็กน้อยระหว่างรอ
        const current = get().restartProgress
        if (current < 90) {
          set({ 
            restartProgress: current + 2,
            restartMessage: 'กำลังรอ Backend...'
          })
        }
      }
      
      // Timeout
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval)
        set({ 
          isPollingRestart: false,
          restartStatus: 'ready',
          restartProgress: 100,
          restartMessage: 'เสร็จสิ้น'
        })
      }
    }, 2000) // Poll ทุก 2 วินาที
  },

  resetRestartStatus: () => {
    set({
      restartStatus: 'idle',
      restartMessage: '',
      restartProgress: 0,
      isPollingRestart: false,
    })
  },

  // ===== Full Restart =====
  
  triggerRestart: async (device = null, modelNames = []) => {
    set({ 
      isLoading: true,
      restartStatus: 'shutting_down',
      restartMessage: 'กำลังเริ่ม restart...',
      restartProgress: 10,
    })
    
    try {
      await restartBackend(device, modelNames)
      
      // เริ่ม polling รอ backend กลับมา
      get().startPollingRestartStatus()
      
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },
}))
