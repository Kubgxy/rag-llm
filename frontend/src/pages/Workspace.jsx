import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MessageSquare, FileText, PanelRight, Sun, Moon } from 'lucide-react'
import { useChat } from '../hooks/useChat.js'
import { useChatStore } from '../stores/chatStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import ModelSelector from '../components/chat/ModelSelector.jsx'
import CompareToggle from '../components/chat/CompareToggle.jsx'
import NormalLayout from '../components/layout/NormalLayout.jsx'
import CompareLayout from '../components/layout/CompareLayout.jsx'

export default function Workspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // States & Hooks
  const { messages, isLoading, sendMessage } = useChat()
  const { toggleThinkingExpanded, clearArenaMessages } = useChatStore()
  const { chatTitle } = useSessionStore()
  const { documents } = useDocumentStore()
  const chatEndRef = useRef(null)

  // Layout states
  const [isKnowledgeExpanded, setIsKnowledgeExpanded] = useState(false)
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [showMobileLeft, setShowMobileLeft] = useState(false)
  const [showMobileRight, setShowMobileRight] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize theme from localStorage/system preference
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    const newIsDark = !isDarkMode
    setIsDarkMode(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Ensure current session in URL matches store
  useEffect(() => {
    if (sessionId) {
      useSessionStore.setState({ sessionId })
    }
  }, [sessionId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle compare mode toggle - clear compare messages when switching
  const handleToggleCompare = (newMode) => {
    setIsCompareMode(newMode)
    if (newMode) {
      // Entering compare mode - clear old compare messages
      clearArenaMessages()
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-100 dark:bg-surface-950">

      {/* Navbar for Workspace */}
      <header className="h-14 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-surface-900 dark:text-white truncate">
            {chatTitle || 'Chat Session'}
          </span>
        </div>

        {/* Toolbar: Model Selector + Compare Toggle + Theme Toggle */}
        <div className="flex items-center gap-3">
          <ModelSelector />
          <CompareToggle isCompareMode={isCompareMode} onToggle={handleToggleCompare} />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-surface-600 dark:text-surface-300"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile toggles */}
        <div className="flex md:hidden items-center gap-2 ml-3">
          <button onClick={() => setShowMobileLeft(!showMobileLeft)} className="p-2 text-surface-600">
            <FileText className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMobileRight(!showMobileRight)} className="p-2 text-surface-600">
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout - Choose based on mode */}
      <div className="flex-1 flex min-h-0 relative">
        {isCompareMode ? (
          <CompareLayout
            isLoading={isLoading}
            showMobileLeft={showMobileLeft}
            setShowMobileLeft={setShowMobileLeft}
            documents={documents}
            sendMessage={sendMessage}
            toggleThinkingExpanded={toggleThinkingExpanded}
            chatEndRef={chatEndRef}
          />
        ) : (
          <NormalLayout
            messages={messages}
            isLoading={isLoading}
            sendMessage={sendMessage}
            isKnowledgeExpanded={isKnowledgeExpanded}
            setIsKnowledgeExpanded={setIsKnowledgeExpanded}
            showMobileLeft={showMobileLeft}
            setShowMobileLeft={setShowMobileLeft}
            showMobileRight={showMobileRight}
            setShowMobileRight={setShowMobileRight}
            documents={documents}
            toggleThinkingExpanded={toggleThinkingExpanded}
            chatEndRef={chatEndRef}
          />
        )}
      </div>

      {/* Mobile overlays */}
      {(showMobileLeft || showMobileRight) && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-0 md:hidden" 
          onClick={() => { setShowMobileLeft(false); setShowMobileRight(false); }}
        />
      )}
    </div>
  )
}
