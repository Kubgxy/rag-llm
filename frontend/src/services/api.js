import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 600000, // โหมด CPU อาจใช้เวลานาน ต้องกัน frontend timeout ตัดก่อน
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
 * @param {string} query - User query
 * @param {string} modelA - Model A name
 * @param {string} modelB - Model B name
 * @param {string} sessionId - Session ID
 */
export const chatCompare = async (query, modelA, modelB, sessionId) => {
  const { data } = await api.post('/chat/compare', {
    query,
    model_a: modelA,
    model_b: modelB,
    session_id: sessionId,
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

/**
 * Generate specialized knowledge action result using dedicated action model
 * POST /actions/generate
 * @param {'diagram'|'chart'|'slides'|'infographic'} actionType
 * @param {string} sessionId
 * @param {{ userGoal?: string, language?: 'th'|'en', modelName?: string }} options
 */
export const generateKnowledgeAction = async (actionType, sessionId, options = {}) => {
  const payload = {
    action_type: actionType,
    session_id: sessionId,
    user_goal: options.userGoal || null,
    language: options.language || 'th',
  }

  if (options.modelName) {
    payload.model_name = options.modelName
  }

  const { data } = await api.post('/actions/generate', payload)
  return data
}

/**
 * Get global runtime device
 * GET /runtime/status
 */
export const getRuntimeStatus = async () => {
  const { data } = await api.get('/runtime/status')
  return data
}

/**
 * Set global runtime device
 * PUT /runtime/device
 * @param {string} device - cpu|gpu
 * @param {string[]} modelNames - optional models to warmup after switch
 * @param {boolean} waitForPending - wait for pending requests to complete
 * @param {boolean} force - force switch without waiting
 */
export const setRuntimeDevice = async (device, modelNames = [], waitForPending = true, force = false) => {
  const payload = { 
    device,
    wait_for_pending: waitForPending,
    force
  }
  if (Array.isArray(modelNames) && modelNames.length > 0) {
    payload.model_names = modelNames
  }
  const { data } = await api.put('/runtime/device', payload)
  return data
}

/**
 * Get restart/switch status for polling
 * GET /runtime/restart-status
 */
export const getRestartStatus = async () => {
  const { data } = await api.get('/runtime/restart-status')
  return data
}

/**
 * Trigger backend restart
 * POST /runtime/restart
 * @param {string} device - optional new device after restart
 * @param {string[]} modelNames - optional models to warmup
 */
export const restartBackend = async (device = null, modelNames = []) => {
  const payload = {}
  if (device) payload.device = device
  if (Array.isArray(modelNames) && modelNames.length > 0) {
    payload.model_names = modelNames
  }
  const { data } = await api.post('/runtime/restart', payload)
  return data
}

export default api