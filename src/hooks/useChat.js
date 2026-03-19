import { useCallback } from 'react'
import { chatSingle, chatCompare } from '../services/api.js'
import { useChatStore } from '../stores/chatStore.js'
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
  const { addToast } = useToast()

  const sendMessage = useCallback(
    async (query) => {
      if (!query.trim() || isLoading) return

      addUserMessage(query)
      setLoading(true)

      try {
        const data = await chatSingle(query, selectedModel)
        addAssistantMessage(data.answer)
      } catch (err) {
        addToast(err.message || 'Failed to get response', 'error')
        addAssistantMessage('⚠️ Sorry, an error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [isLoading, selectedModel, addUserMessage, addAssistantMessage, setLoading, addToast]
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
        const respA = data.responses?.find((r) => r.model === arenaModelA)?.answer || 'No response'
        const respB = data.responses?.find((r) => r.model === arenaModelB)?.answer || 'No response'
        addArenaResponse({ responseA: respA, responseB: respB })
      } catch (err) {
        addToast(err.message || 'Arena comparison failed', 'error')
        addArenaResponse({
          responseA: '⚠️ Error occurred',
          responseB: '⚠️ Error occurred',
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
