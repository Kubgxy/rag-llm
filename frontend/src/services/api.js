import axios from 'axios'
import { useAuthStore } from '../stores/authStore.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 600000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  }
})

// ─── Request interceptor: attach JWT token ───
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('🔵 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    })
    return config
  },
  (error) => {
    console.error('❌ [API Request Error]', error)
    return Promise.reject(error)
  }
)

// ─── Response interceptor: handle 401 + auto-refresh ───
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    console.log('✅ [API Response]', {
      status: response.status,
      url: response.config.url,
    })
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retried and not an auth endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().logout()
        isRefreshing = false
        processQueue(error)
        window.location.href = '/auth'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        )

        useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`

        processQueue(null, data.access_token)
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        processQueue(refreshError)
        window.location.href = '/auth'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    console.error('❌ [API Error]', {
      message: error.message,
      status: error.response?.status,
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


// ═══════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════

/**
 * Register a new user
 * POST /auth/register
 */
export const registerApi = async (username, email, password) => {
  const { data } = await api.post('/auth/register', { username, email, password })
  return data
}

/**
 * Login and get JWT tokens
 * POST /auth/login
 */
export const loginApi = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password })
  return data
}

/**
 * Refresh access token
 * POST /auth/refresh
 */
export const refreshTokenApi = async (refreshToken) => {
  const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken })
  return data
}

/**
 * Get current user profile
 * GET /auth/me
 */
export const getMeApi = async () => {
  const { data } = await api.get('/auth/me')
  return data
}


// ═══════════════════════════════════════════════
// SESSION API
// ═══════════════════════════════════════════════

/**
 * Create a new chat session
 * POST /sessions
 */
export const createSessionApi = async (title = null, sessionType = 'notebook', modelName = null, systemSessionId = null) => {
  const payload = {
    title,
    session_type: sessionType,
    model_name: modelName,
  }
  if (systemSessionId) {
    payload.system_session_id = systemSessionId
  }
  const { data } = await api.post('/sessions', payload)
  return data
}

/**
 * List all user sessions
 * GET /sessions
 */
export const listSessionsApi = async (includeArchived = false) => {
  const { data } = await api.get('/sessions', { params: { include_archived: includeArchived } })
  return data
}

/**
 * Get a single session with messages
 * GET /sessions/{id}
 */
export const getSessionApi = async (sessionId) => {
  const { data } = await api.get(`/sessions/${sessionId}`)
  return data
}

/**
 * Update session title or archive status
 * PATCH /sessions/{id}
 */
export const updateSessionApi = async (sessionId, updates = {}) => {
  const { data } = await api.patch(`/sessions/${sessionId}`, updates)
  return data
}

/**
 * Delete a session
 * DELETE /sessions/{id}
 */
export const deleteSessionApi = async (sessionId) => {
  const { data } = await api.delete(`/sessions/${sessionId}`)
  return data
}

/**
 * Get messages of a session
 * GET /sessions/{id}/messages
 */
export const getSessionMessagesApi = async (sessionId, limit = 100, offset = 0) => {
  const { data } = await api.get(`/sessions/${sessionId}/messages`, { params: { limit, offset } })
  return data
}


// ═══════════════════════════════════════════════
// UPLOAD API
// ═══════════════════════════════════════════════

/**
 * Upload a PDF document
 * POST /upload
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
 * Check document processing status
 * GET /upload/status/{session_id}/{filename}
 */
export const checkDocumentStatus = async (sessionId, filename) => {
  const { data } = await api.get(`/upload/status/${sessionId}/${filename}`)
  return data
}


// ═══════════════════════════════════════════════
// CHAT API
// ═══════════════════════════════════════════════

/**
 * Single-model chat
 * POST /chat/single
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
 */
export const suggestTitle = async (query, modelName = 'typhoon-2.5', sessionId = null) => {
  const payload = {
    query,
    model_name: modelName,
  }
  if (sessionId) {
    payload.session_id = sessionId
  }
  const { data } = await api.post('/chat/suggest-title', payload)
  return data
}


// ═══════════════════════════════════════════════
// WEB SEARCH API
// ═══════════════════════════════════════════════

/**
 * Search web sources with Tavily
 * POST /web-search/preview
 */
export const searchWebPreview = async (
  query,
  sessionId,
  searchDepth = 'basic',
  maxResults = 5,
  topic = 'general',
  timeRange = 'none',
  startDate = '',
  endDate = '',
  country = 'thailand'
) => {
  const payload = {
    query,
    session_id: sessionId,
    search_depth: searchDepth,
    max_results: maxResults,
    topic,
    country,
  }
  if (timeRange && timeRange !== 'none') {
    payload.time_range = timeRange
  }
  if (startDate) {
    payload.start_date = startDate
  }
  if (endDate) {
    payload.end_date = endDate
  }

  const { data } = await api.post('/web-search/preview', payload)
  return data
}

/**
 * Import selected web sources into RAG vector store
 * POST /web-search/import
 */
export const importWebSources = async (urls, sessionId) => {
  const { data } = await api.post('/web-search/import', {
    session_id: sessionId,
    urls,
  })
  return data
}


// ═══════════════════════════════════════════════
// ACTIONS API
// ═══════════════════════════════════════════════

/**
 * Generate specialized knowledge action
 * POST /actions/generate
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

  if (options.selectedFiles && Array.isArray(options.selectedFiles) && options.selectedFiles.length > 0) {
    payload.selected_files = options.selectedFiles
  }

  if (options.detailLevel) {
    payload.detail_level = options.detailLevel
  }

  // Forward style and custom colors to Backend
  if (options.style) {
    payload.style = options.style
  }
  if (options.primaryColor) {
    payload.primary_color = options.primaryColor
  }
  if (options.secondaryColor) {
    payload.secondary_color = options.secondaryColor
  }
  if (options.backgroundColor) {
    payload.background_color = options.backgroundColor
  }

  const { data } = await api.post('/actions/generate', payload)
  return data
}

/**
 * Fetch all previously generated actions for a session
 * GET /actions/session/${sessionId}
 */
export const getSessionActions = async (sessionId) => {
  const { data } = await api.get(`/actions/session/${sessionId}`)
  return data
}


// ═══════════════════════════════════════════════
// RUNTIME API
// ═══════════════════════════════════════════════

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
 * Get restart/switch status
 * GET /runtime/restart-status
 */
export const getRestartStatus = async () => {
  const { data } = await api.get('/runtime/restart-status')
  return data
}

/**
 * Trigger backend restart
 * POST /runtime/restart
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

/**
 * Update an existing action's editor state and answer
 * POST /actions/update/{actionId}
 * @param {string} actionId
 * @param {object} editorState
 * @param {string} answer
 */
export const updateKnowledgeAction = async (actionId, editorState, answer) => {
  const { data } = await api.post(`/actions/update/${actionId}`, {
    editor_state: editorState,
    answer,
  })
  return data
}


// ═══════════════════════════════════════════════
// SYSTEM SESSIONS & SYNC API
// ═══════════════════════════════════════════════

/**
 * List all active system sessions (shared sessions)
 * GET /system-sessions
 */
export const listSystemSessionsApi = async () => {
  const { data } = await api.get('/system-sessions')
  return data
}

/**
 * Get details of a specific system session
 * GET /system-sessions/{id}
 */
export const getSystemSessionDetailApi = async (sessionId) => {
  const { data } = await api.get(`/system-sessions/${sessionId}`)
  return data
}

/**
 * Get sync history for a system session
 * GET /system-sessions/{id}/history
 */
export const getSystemSessionHistoryApi = async (sessionId, limit = 20) => {
  const { data } = await api.get(`/system-sessions/${sessionId}/history`, {
    params: { limit }
  })
  return data
}

export default api
