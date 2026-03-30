import { useRef, useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import ModelSelector from './ModelSelector.jsx'
import ChatMessage from './ChatMessage.jsx'
import ChatInput from './ChatInput.jsx'
import { useChat } from '../../hooks/useChat.js'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function ChatPanel({ isOpen, onClose }) {
  const { messages, isLoading, sendMessage } = useChat()
  const { t } = useLanguageStore()
  const chatEndRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    // We need a slight delay to ensure UI rendering is complete before scrolling
    // and especially before relying on document.getElementById.
    const scrollTimeout = setTimeout(() => {
      // If we have a specific message to scroll to from global search
      const scrollToIdx = location.state?.scrollToMessage
      
      if (scrollToIdx !== undefined && scrollToIdx !== null) {
        const msgEl = document.getElementById(`msg-${scrollToIdx}`)
        if (msgEl) {
          msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Add a highlight effect
          msgEl.classList.add('ring-2', 'ring-primary-500', 'bg-primary-50/50', 'dark:bg-primary-900/20', 'rounded-xl', 'transition-all', 'duration-500')
          
          // Flash effect
          let isOp = false;
          const flashInterval = setInterval(() => {
            if (isOp) {
              msgEl.style.opacity = '1';
            } else {
              msgEl.style.opacity = '0.5';
            }
            isOp = !isOp;
          }, 300);

          setTimeout(() => {
            clearInterval(flashInterval);
            msgEl.style.opacity = '1';
            msgEl.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50/50', 'dark:bg-primary-900/20', 'rounded-xl')
          }, 2500)
          
          return
        }
      }
      
      // Default scroll to bottom
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [messages, location.state, isOpen])

  if (!isOpen) return null

  return (
    <div className="w-80 lg:w-96 xl:w-[400px] flex-shrink-0 flex flex-col bg-surface-50 dark:bg-surface-950 border-l border-surface-200 dark:border-surface-800 shadow-xl z-20 transition-all duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-white/50 dark:bg-surface-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
            {t('chatPanelTitle')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32">
            <ModelSelector />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50 dark:bg-surface-950">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/20 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
              {t('chatPanelEmptyTitle')}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-[200px]">
              {t('chatPanelEmptySubtitle')}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} id={`msg-${i}`} className="transition-all duration-300 p-1 -mx-1">
              <ChatMessage message={msg} />
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-surface-200 dark:bg-surface-800 shrink-0" />
            <div className="h-10 w-24 bg-surface-200 dark:bg-surface-800 rounded-2xl rounded-tl-sm" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <ChatInput onSend={sendMessage} isLoading={isLoading} placeholder={t('chatPanelInputPlaceholder')} />
      </div>
    </div>
  )
}
