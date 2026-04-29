import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, MessageSquare, Calendar, ChevronRight } from 'lucide-react'
import { useChatHistoryStore } from '../../stores/chatHistoryStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'chats', 'messages'
  const { history } = useChatHistoryStore()
  const { t } = useLanguageStore()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Analyze search
  const allEntries = Object.entries(history).sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
  
  const entries = query.trim()
    ? allEntries.map(([id, session]) => {
        const q = query.toLowerCase()
        const titleMatch = session.title?.toLowerCase().includes(q)
        const matchedMessages = session.messages?.map((msg, index) => ({ ...msg, index }))
          .filter(msg => msg.content?.toLowerCase().includes(q)) || []
        
        return [id, session, titleMatch, matchedMessages]
      }).filter(([,, titleMatch, matchedMessages]) => {
        if (activeTab === 'chats') return titleMatch
        if (activeTab === 'messages') return matchedMessages.length > 0
        return titleMatch || matchedMessages.length > 0
      })
    : []

  const openFirstResult = () => {
    if (entries.length === 0) return

    const [sessionId,, , matchedMessages] = entries[0]
    const firstMessageIndex = activeTab === 'chats'
      ? null
      : (matchedMessages?.length > 0 ? matchedMessages[0].index : null)

    handleOpenChat(sessionId, firstMessageIndex)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      openFirstResult()
    }
  }

  const handleOpenChat = (sessionId, messageIndex = null) => {
    onClose()
    const { setActiveSession } = useChatHistoryStore.getState()
    setActiveSession(sessionId)
    useSessionStore.getState().setSessionId?.(sessionId) || useSessionStore.setState({ sessionId })

    const sessionData = history[sessionId]
    if (sessionData) {
      useChatStore.setState({ messages: sessionData.messages || [] })
      useDocumentStore.setState({
        documents: sessionData.documents || [],
        importedWebSources: sessionData.importedWebSources || [],
        summary: sessionData.summary || '',
        mindmapNodes: sessionData.mindmapNodes || [],
        mindmapEdges: sessionData.mindmapEdges || [],
      })
    }
    navigate(`/chat/${sessionId}`, { state: { scrollToMessage: messageIndex } })
  }

  // Highlight text component
  const HighlightText = ({ text, highlight }) => {
    if (!highlight.trim()) return <span>{text}</span>
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-primary-200 dark:bg-primary-900/50 text-primary-900 dark:text-primary-100 rounded px-1">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-800 flex flex-col max-h-[80vh]">
        {/* Search Input and Tabs */}
        <div className="flex flex-col shrink-0">
          <div className="p-4 flex items-center gap-3">
            <Search className="w-6 h-6 text-surface-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchModalPlaceholder')}
              className="flex-1 bg-transparent border-none text-lg text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-0"
              onKeyDown={handleInputKeyDown}
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-surface-500" />
              </button>
            ) : (
               <button
                onClick={onClose}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors text-xs font-semibold text-surface-500"
              >
                ESC
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex px-4 border-b border-surface-200 dark:border-surface-800">
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
              onClick={() => setActiveTab('all')}
            >
              {t('all')}
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chats' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
              onClick={() => setActiveTab('chats')}
            >
              {t('searchModalTabChats')}
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'messages' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
              onClick={() => setActiveTab('messages')}
            >
              {t('searchModalTabMessages')}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-surface-50/50 dark:bg-surface-950/50">
          {query.trim() === '' ? (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="w-12 h-12 text-surface-300 dark:text-surface-700 mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400 font-medium">{t('searchModalEmptyTitle')}</p>
              <p className="text-sm text-surface-500 mt-1">{t('searchModalEmptySubtitle')}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-12 text-center text-surface-600 dark:text-surface-400">
              <p>{tr('searchModalNoResults', { query })}</p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-2">
                {tr('searchModalResults', { count: entries.length, unit: t('searchModalChatsUnit') })}
              </div>
              {entries.map(([id, session, titleMatch, matchedMessages]) => (
                <div key={id} className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Title Match or Session Header */}
                  <div 
                    onClick={() => handleOpenChat(id)}
                    className="p-4 flex items-start justify-between cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-surface-900 dark:text-white line-clamp-1">
                          {titleMatch ? <HighlightText text={session.title || t('searchModalUntitledChat')} highlight={query} /> : (session.title || t('searchModalUntitledChat'))}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-surface-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-400" />
                  </div>

                  {/* Message Matches */}
                  {matchedMessages.length > 0 && activeTab !== 'chats' && (
                    <div className="border-t border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-3 flex flex-col gap-2">
                      <div className="text-xs font-semibold text-surface-500 mb-1 px-1">{tr('searchModalMatchedMessages', { count: matchedMessages.length })}</div>
                      <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {matchedMessages.map((msg, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleOpenChat(id, msg.index)}
                            className="p-3 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-600 cursor-pointer transition-colors"
                          >
                            <div className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-1 flex items-center gap-1.5">
                              {msg.role === 'user' ? t('searchModalSenderUser') : t('searchModalSenderAI')}
                              {msg.role !== 'user' && msg.error && (
                                <span className="text-red-500 flex items-center">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-surface-700 dark:text-surface-300 line-clamp-3">
                              <HighlightText text={msg.content || (msg.error ? t('searchModalConnectionError') : '')} highlight={query} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="shrink-0 border-t border-surface-200 dark:border-surface-800 px-4 py-2.5 bg-white/90 dark:bg-surface-900/90">
          <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1">
              <kbd className="rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 px-1.5 py-0.5 text-[10px] font-semibold">Scroll</kbd>
              {t('searchHintScroll')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1">
              <kbd className="rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 px-1.5 py-0.5 text-[10px] font-semibold">Enter</kbd>
              {t('searchHintOpenFirstResult')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1">
              <kbd className="rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 px-1.5 py-0.5 text-[10px] font-semibold">Esc</kbd>
              {t('searchHintCloseSearch')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
