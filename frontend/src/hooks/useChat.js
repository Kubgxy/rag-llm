import { useCallback } from 'react'
import { chatSingle, chatCompare, suggestTitle } from '../services/api.js'
import { useChatStore } from '../stores/chatStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useToast } from '../components/ui/Toast.jsx'

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
          mindmapEdges: docStore.mindmapEdges
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
          addToast(data.message || 'โมเดลตอบกลับไม่สำเร็จ', 'error')
          addAssistantMessage('⚠️ เกิดข้อผิดพลาด: ' + (data.message || 'ไม่ทราบสาเหตุ'))
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
        addToast(err.message || 'ไม่สามารถเชื่อมต่อกับ Server ได้', 'error')
        addAssistantMessage('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
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
    arenaMessages,
    arenaModelA,
    arenaModelB,
    isArenaLoading,
    addArenaUserMessage,
    addArenaResponse,
    setArenaLoading,
    setArenaVote,
  } = useChatStore()
  const { addToast } = useToast()

  const sendArenaMessage = useCallback(
    async (query) => {
      if (!query.trim() || isArenaLoading) return

      addArenaUserMessage(query)
      setArenaLoading(true)

      try {
        const compareSessionId = 'compare-session-id' // หรือจะใช้ getSessionId ของคุณ
        const data = await chatCompare(query, [arenaModelA, arenaModelB], compareSessionId)
        
        if (data.status === 'error') {
          addToast(data.message || 'การเปรียบเทียบล้มเหลว', 'error')
          addArenaResponse({
            responseA: '⚠️ เกิดข้อผิดพลาด: ' + (data.message || ''),
            responseB: '⚠️ เกิดข้อผิดพลาด: ' + (data.message || ''),
          })
        } else {
          // Backend ส่งกลับมาเป็น CompareResponse ที่มี response_a และ response_b
          const respA = data.response_a?.answer || 'ไม่ได้รับคำตอบจากโมเดลนี้'
          const respB = data.response_b?.answer || 'ไม่ได้รับคำตอบจากโมเดลนี้'
          addArenaResponse({ responseA: respA, responseB: respB })
        }
      } catch (err) {
        addToast(err.message || 'การเปรียบเทียบโมเดลล้มเหลว', 'error')
        addArenaResponse({
          responseA: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ',
          responseB: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ',
        })
      } finally {
        setArenaLoading(false)
      }
    },
    [
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
