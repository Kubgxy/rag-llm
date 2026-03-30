import { create } from 'zustand'
import { getRuntimeStatus, setRuntimeDevice } from '../services/api.js'

export const useRuntimeStore = create((set, get) => ({
  device: 'gpu',
  isLoading: false,
  isInitialized: false,

  fetchRuntime: async () => {
    if (get().isLoading) return

    set({ isLoading: true })
    try {
      const data = await getRuntimeStatus()
      set({
        device: data.device === 'cpu' ? 'cpu' : 'gpu',
        isInitialized: true,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  updateRuntime: async (device, modelNames = []) => {
    set({ isLoading: true })
    try {
      const data = await setRuntimeDevice(device, modelNames)
      set({
        device: data.device === 'cpu' ? 'cpu' : 'gpu',
        isInitialized: true,
      })
      return data
    } finally {
      set({ isLoading: false })
    }
  },
}))
