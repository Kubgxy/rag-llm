import { useState } from 'react'
import { Send, Loader2, Plus, FileText } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore.js'

export default function ChatInput({ onSend, isLoading, placeholder = 'Ask a question about your document...' }) {
  const [input, setInput] = useState('')
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)

  const { documents } = useDocumentStore()

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  const checkMentionTrigger = (text, selectionEnd) => {
    const textBeforeCursor = text.slice(0, selectionEnd)
    const words = textBeforeCursor.split(/\s/)
    const currentWord = words[words.length - 1]

    if (currentWord && currentWord.startsWith('/')) {
      setMentionFilter(currentWord.slice(1))
      setShowMentionMenu(true)
      setCursorPos(selectionEnd)
      setActiveIndex(0)
    } else {
      setShowMentionMenu(false)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setInput(val)
    checkMentionTrigger(val, e.target.selectionStart)
  }

  const handleSelect = (e) => {
    checkMentionTrigger(e.target.value, e.target.selectionStart)
  }

  const insertMention = (docName) => {
    const textBeforeCursor = input.slice(0, cursorPos)
    const textAfterCursor = input.slice(cursorPos)
    
    // Find the last index of '/' before the cursor
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')
    
    if (lastSlashIndex !== -1) {
      const newTextBefore = textBeforeCursor.slice(0, lastSlashIndex) + `/${docName} `
      setInput(newTextBefore + textAfterCursor)
      setShowMentionMenu(false)
      
      setTimeout(() => {
        const textarea = document.getElementById('chat-input')
        if (textarea) {
          textarea.focus()
          const newPos = newTextBefore.length
          textarea.setSelectionRange(newPos, newPos)
        }
      }, 50)
    }
  }

  const handlePlusClick = () => {
    const textarea = document.getElementById('chat-input')
    if (textarea) {
      const currentPos = textarea.selectionStart
      const textBefore = input.slice(0, currentPos)
      const textAfter = input.slice(currentPos)
      
      const newTextBefore = textBefore + (textBefore.endsWith(' ') || textBefore === '' ? '/' : ' /')
      setInput(newTextBefore + textAfter)
      
      setTimeout(() => {
        textarea.focus()
        const newPos = newTextBefore.length
        textarea.setSelectionRange(newPos, newPos)
        checkMentionTrigger(newTextBefore + textAfter, newPos)
      }, 50)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
    setShowMentionMenu(false)
  }

  const handleKeyDown = (e) => {
    if (showMentionMenu && filteredDocs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % filteredDocs.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + filteredDocs.length) % filteredDocs.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        insertMention(filteredDocs[activeIndex].name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionMenu(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full relative">
      <button
        type="button"
        onClick={handlePlusClick}
        title="Mention document"
        className="
          p-3 rounded-2xl mb-2 border border-surface-200 dark:border-surface-700/80
          text-surface-500 hover:text-primary-500 dark:text-surface-400 dark:hover:text-primary-400
          bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700/50
          transition-all duration-200 active:scale-95 shrink-0
        "
        style={{ height: '44px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus className="w-5 h-5" />
      </button>

      <div className="flex-1 relative">
        <textarea
          id="chat-input"
          value={input}
          onChange={handleChange}
          onSelect={handleSelect}
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

        {/* Autocomplete Mention Popover */}
        {showMentionMenu && filteredDocs.length > 0 && (
          <div className="
            absolute bottom-full left-0 mb-2 w-full max-h-60 overflow-y-auto
            bg-white/95 dark:bg-surface-900/95 backdrop-blur-md
            border border-surface-200 dark:border-surface-800
            rounded-2xl shadow-xl z-50 py-1.5
          ">
            <div className="px-3 py-1.5 text-xs font-semibold text-surface-400 dark:text-surface-500 border-b border-surface-100 dark:border-surface-800/50 mb-1 flex items-center justify-between">
              <span>Mention Document</span>
              <span>{filteredDocs.length} files</span>
            </div>
            {filteredDocs.map((doc, idx) => (
              <button
                key={doc.name}
                type="button"
                onClick={() => insertMention(doc.name)}
                className={`
                  w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors
                  ${idx === activeIndex 
                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50'}
                `}
              >
                <FileText className={`w-4 h-4 ${idx === activeIndex ? 'text-primary-500' : 'text-surface-400'}`} />
                <span className="truncate flex-1">{doc.name}</span>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        id="chat-send-button"
        className="
          p-3 rounded-2xl mb-2 bg-primary-500 hover:bg-primary-600
          text-white disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg shadow-primary-500/25
          hover:shadow-primary-500/40 active:scale-95 shrink-0
        "
        style={{ height: '44px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
