import { useRef, useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import ModelSelector from './ModelSelector.jsx'
import ChatMessage from './ChatMessage.jsx'
import ChatInput from './ChatInput.jsx'
import { useChat } from '../../hooks/useChat.js'

export default function ChatPanel({ isOpen, onClose }) {
  const { messages, isLoading, sendMessage } = useChat()
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
            แชท AI
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
              เริ่มการสนทนา
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-[200px]">
              ถามคำถามเกี่ยวกับเอกสาร หรือให้ AI ช่วยสรุปข้อมูลให้คุณ
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
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
        <ChatInput onSend={sendMessage} isLoading={isLoading} placeholder="พิมพ์ข้อความที่นี่..." />
      </div>
    </div>
  )
}
