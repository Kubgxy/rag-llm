import { useCallback } from 'react'
import { chatSingle, chatCompare, suggestTitle } from '../services/api.js'
import { useChatStore } from '../stores/chatStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useToast } from '../components/ui/Toast.jsx'
import { useLanguageStore } from '../stores/languageStore.js'

export function useChat() {
  const {
    messages,
    isLoading,
    selectedModel,
    addUserMessage,
    addAssistantMessage,
    setLoading,
  } = useChatStore()
  const { getSessionId } = useSessionStore()
  const { addToast } = useToast()
  const t = useLanguageStore.getState().t
  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  const syncToHistory = (sessionId, customTitle = null) => {
    // This timeout ensures Zustand state updates have completed before syncing
    setTimeout(() => {
      const currentMessages = useChatStore.getState().messages;
      const docStore = useDocumentStore.getState();
      const chatTitle = customTitle || useSessionStore.getState().chatTitle;

      useChatHistoryStore.getState().saveSession(
        sessionId,
        currentMessages,
        {
          documents: docStore.documents,
          summary: docStore.summary,
          mindmapNodes: docStore.mindmapNodes,
          mindmapEdges: docStore.mindmapEdges,
          importedWebSources: docStore.importedWebSources,
        },
        chatTitle // Pass the chat title to sync
      );
    }, 100);
  };

  const sendMessage = useCallback(
    async (query) => {
      if (!query.trim() || isLoading) return

      const isFirstMessage = messages.length === 0
      addUserMessage(query)
      setLoading(true)

      let sessionId;
      try {
        // ดึง session_id ปัจจุบัน
        sessionId = getSessionId()
        syncToHistory(sessionId)

        // ถามคำถาม
        const data = await chatSingle(query, selectedModel, sessionId)

        // Backend อาจส่ง { status: "error", message: "..." } กลับมาแทน
        if (data.status === 'error') {
          addToast(data.message || t('chatModelResponseFailed'), 'error')
          addAssistantMessage(tr('chatAssistantError', { message: data.message || t('chatUnknownCause') }))
        } else {
          // Create message object with thinking support
          const messageData = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: data.answer,
            thinking: data.thinking || null,
            timestamp: Date.now(),
            metadata: {
              model: selectedModel,
              thinkingExpanded: false,
              citations: data.citations || []
            }
          }
          addAssistantMessage(messageData)
        }

        // If first message, suggest title
        if (isFirstMessage) {
          try {
            const titleResponse = await suggestTitle(query, selectedModel)
            if (titleResponse.title) {
              useSessionStore.getState().setChatTitle(titleResponse.title)
              // Sync the new title to history
              syncToHistory(sessionId, titleResponse.title)
            }
          } catch (err) {
            console.warn('Failed to suggest title:', err)
            // Don't fail the chat if title suggestion fails
          }
        }
      } catch (err) {
        addToast(err.message || t('chatConnectionFailed'), 'error')
        addAssistantMessage(t('chatAssistantConnectionError'))
      } finally {
        setLoading(false)
        if (sessionId) syncToHistory(sessionId);
      }
    },
    [isLoading, selectedModel, messages, addUserMessage, addAssistantMessage, setLoading, addToast, getSessionId]
  )

  return { messages, isLoading, sendMessage }
}

export function useArenaChat() {
  const {
    getArenaMessages,
    arenaModelA,
    arenaModelB,
    isArenaLoading,
    addArenaUserMessage,
    addArenaResponse,
    setArenaLoading,
    setArenaVote: setArenaVoteStore,
  } = useChatStore()
  const { getSessionId } = useSessionStore()
  const { addToast } = useToast()
  const t = useLanguageStore.getState().t
  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  // Get current session ID and arena messages for this session
  const sessionId = getSessionId()
  const arenaMessages = getArenaMessages(sessionId)

  // Wrap setArenaVote to include sessionId
  const setArenaVote = useCallback(
    (messageIndex, side, vote) => {
      setArenaVoteStore(sessionId, messageIndex, side, vote)
    },
    [sessionId, setArenaVoteStore]
  )

  const sendArenaMessage = useCallback(
    async (query) => {
      if (!query.trim() || isArenaLoading) return

      addArenaUserMessage(sessionId, query)
      setArenaLoading(true)

      try {
        const data = await chatCompare(query, [arenaModelA, arenaModelB], sessionId)

        if (data.status === 'error') {
          addToast(data.message || t('chatCompareFailed'), 'error')
          addArenaResponse(sessionId, {
            responseA: tr('chatAssistantError', { message: data.message || t('chatUnknownCause') }),
            responseB: tr('chatAssistantError', { message: data.message || t('chatUnknownCause') }),
          })
        } else {
          // Backend ส่งกลับมาเป็น CompareResponse ที่มี response_a และ response_b
          const respA = data.response_a?.answer || t('chatNoAnswerFromModel')
          const respB = data.response_b?.answer || t('chatNoAnswerFromModel')
          addArenaResponse(sessionId, { responseA: respA, responseB: respB })
        }
      } catch (err) {
        addToast(err.message || t('chatCompareModelsFailed'), 'error')
        addArenaResponse(sessionId, {
          responseA: t('chatAssistantConnectionError'),
          responseB: t('chatAssistantConnectionError'),
        })
      } finally {
        setArenaLoading(false)
      }
    },
    [
      sessionId,
      isArenaLoading,
      arenaModelA,
      arenaModelB,
      addArenaUserMessage,
      addArenaResponse,
      setArenaLoading,
      addToast,
    ]
  )

  return { arenaMessages, isArenaLoading, sendArenaMessage, setArenaVote }
}
