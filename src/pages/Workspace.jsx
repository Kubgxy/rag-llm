import { useEffect, useRef } from 'react'
import UploadZone from '../components/upload/UploadZone.jsx'
import KnowledgeTabs from '../components/knowledge/KnowledgeTabs.jsx'
import ModelSelector from '../components/chat/ModelSelector.jsx'
import ChatMessage from '../components/chat/ChatMessage.jsx'
import ChatInput from '../components/chat/ChatInput.jsx'
import { useChat } from '../hooks/useChat.js'
import { MessageSquare } from 'lucide-react'

export default function Workspace() {
  const { messages, isLoading, sendMessage } = useChat()
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* ===================== LEFT COLUMN: Document & Knowledge ===================== */}
        <div className="flex flex-col gap-6 min-h-0 overflow-hidden">
          {/* Section header */}
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white">
              Document & Knowledge
            </h1>
            <p className="text-sm text-surface-500 mt-0.5">
              Upload a PDF to auto-generate knowledge insights
            </p>
          </div>

          {/* Upload area */}
          <UploadZone />

          {/* Auto-Knowledge tabs (Summary / Mindmap) */}
          <div className="flex-1 min-h-0 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 overflow-hidden flex flex-col">
            <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-3">
              Auto-Generated Knowledge
            </h2>
            <div className="flex-1 min-h-0">
              <KnowledgeTabs />
            </div>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN: Chat ===================== */}
        <div className="flex flex-col min-h-0 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          {/* Chat header with model selector */}
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                  AI Chat
                </h2>
              </div>
              <div className="w-48">
                <ModelSelector />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/20 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-primary-500" />
                  </div>
                  <p className="text-sm font-medium text-surface-500">
                    Start a conversation
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    Ask questions about your uploaded document
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl rounded-tl-md px-4 py-3 border border-surface-200 dark:border-surface-700">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
