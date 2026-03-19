import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

export default function ChatInput({ onSend, isLoading, placeholder = 'Ask a question about your document...' }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          className="
            w-full resize-none rounded-2xl px-4 py-3 pr-4
            bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
            text-sm text-surface-800 dark:text-surface-200
            placeholder:text-surface-400 dark:placeholder:text-surface-600
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
            disabled:opacity-50 transition-all
          "
          style={{ minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            e.target.style.height = '44px'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        id="chat-send-button"
        className="
          p-3 rounded-2xl bg-primary-500 hover:bg-primary-600
          text-white disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg shadow-primary-500/25
          hover:shadow-primary-500/40 active:scale-95
        "
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  )
}
