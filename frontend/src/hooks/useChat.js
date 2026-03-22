import { useCallback } from 'react'
import { chatSingle, chatCompare } from '../services/api.js'
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

  const syncToHistory = (sessionId) => {
    // This timeout ensures Zustand state updates have completed before syncing
    setTimeout(() => {
      const currentMessages = useChatStore.getState().messages;
      const docStore = useDocumentStore.getState();
      useChatHistoryStore.getState().saveSession(sessionId, currentMessages, {
        documents: docStore.documents,
        summary: docStore.summary,
        mindmapNodes: docStore.mindmapNodes,
        mindmapEdges: docStore.mindmapEdges
      });
    }, 100);
  };

  const sendMessage = useCallback(
    async (query) => {
      if (!query.trim() || isLoading) return

      addUserMessage(query)
      setLoading(true)

      let sessionId;
      try {
        // ดึง session_id ปัจจุบัน
        sessionId = getSessionId()
        syncToHistory(sessionId)

        const data = await chatSingle(query, selectedModel, sessionId)
        // Backend อาจส่ง { status: "error", message: "..." } กลับมาแทน
        if (data.status === 'error') {
          addToast(data.message || 'โมเดลตอบกลับไม่สำเร็จ', 'error')
          addAssistantMessage('⚠️ เกิดข้อผิดพลาด: ' + (data.message || 'ไม่ทราบสาเหตุ'))
        } else {
          addAssistantMessage(data.answer)
        }
      } catch (err) {
        addToast(err.message || 'ไม่สามารถเชื่อมต่อกับ Server ได้', 'error')
        addAssistantMessage('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setLoading(false)
        if (sessionId) syncToHistory(sessionId);
      }
    },
    [isLoading, selectedModel, addUserMessage, addAssistantMessage, setLoading, addToast, getSessionId]
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
        const data = await chatCompare(query, [arenaModelA, arenaModelB])
        // Backend ส่งกลับมาในรูปแบบ { results: { "model_id": "answer" } }
        if (data.status === 'error') {
          addToast(data.message || 'การเปรียบเทียบล้มเหลว', 'error')
          addArenaResponse({
            responseA: '⚠️ เกิดข้อผิดพลาด: ' + (data.message || ''),
            responseB: '⚠️ เกิดข้อผิดพลาด: ' + (data.message || ''),
          })
        } else {
          const respA = data.results?.[arenaModelA] || 'ไม่ได้รับคำตอบจากโมเดลนี้'
          const respB = data.results?.[arenaModelB] || 'ไม่ได้รับคำตอบจากโมเดลนี้'
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
