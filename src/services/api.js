import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 60000,
  // [เพิ่ม] Header นี้สำคัญมากสำหรับทะลวงหน้าเตือนของ Ngrok
  headers: {
    'ngrok-skip-browser-warning': 'true', 
  }
})

// Request interceptor (can add auth tokens later)
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

/**
 * Upload a PDF document
 * POST /upload
 * @param {File} file - PDF file to upload
 */
export const uploadDocument = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * [เพิ่มใหม่] Check document processing status
 * GET /document/status/{filename}
 * @param {string} filename 
 */
export const checkDocumentStatus = async (filename) => {
  const { data } = await api.get(`/document/status/${filename}`)
  return data
}

/**
 * Single-model chat
 * POST /chat/single
 */
export const chatSingle = async (query, modelName) => {
  const { data } = await api.post('/chat/single', {
    query,
    model_name: modelName,
  })
  return data
}

/**
 * Compare models (arena)
 * POST /chat/compare
 */
export const chatCompare = async (query, models) => {
  const { data } = await api.post('/chat/compare', {
    query,
    models,
  })
  return data
}

export default api