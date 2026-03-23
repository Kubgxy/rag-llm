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
  (config) => {
    console.log('🔵 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      headers: config.headers
    })
    return config
  },
  (error) => {
    console.error('❌ [API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ [API Response]', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('❌ [API Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data
    })

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
 * @param {string} sessionId - Session ID for multi-session support
 */
export const uploadDocument = async (file, sessionId) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('session_id', sessionId)

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * [เพิ่มใหม่] Check document processing status
 * GET /upload/status/{session_id}/{filename}
 * @param {string} sessionId - Session ID
 * @param {string} filename
 */
export const checkDocumentStatus = async (sessionId, filename) => {
  const { data } = await api.get(`/upload/status/${sessionId}/${filename}`)
  return data
}

/**
 * Single-model chat
 * POST /chat/single
 * @param {string} query - User query
 * @param {string} modelName - Model name to use
 * @param {string} sessionId - Session ID
 */
export const chatSingle = async (query, modelName, sessionId) => {
  const { data } = await api.post('/chat/single', {
    query,
    model_name: modelName,
    session_id: sessionId,
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

/**
 * Suggest chat title from first user message
 * POST /chat/suggest-title
 * @param {string} query - First user message
 * @param {string} modelName - Optional: model to use for title generation
 */
export const suggestTitle = async (query, modelName = 'typhoon-2.5') => {
  const { data } = await api.post('/chat/suggest-title', {
    query,
    model_name: modelName,
  })
  return data
}

export default api