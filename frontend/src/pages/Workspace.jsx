import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MessageSquare, FileText, PanelRight, Sun, Moon, Pencil, Check, X, Globe } from 'lucide-react'
import { useChat } from '../hooks/useChat.js'
import { useChatStore } from '../stores/chatStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'
import { useLanguageStore } from '../stores/languageStore.js'
import ModelSelector from '../components/chat/ModelSelector.jsx'
import CompareToggle from '../components/chat/CompareToggle.jsx'
import NormalLayout from '../components/layout/NormalLayout.jsx'
import CompareLayout from '../components/layout/CompareLayout.jsx'
import PdfViewerModal from '../components/layout/PdfViewerModal.jsx'

export default function Workspace() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // States & Hooks
  const { lang, t, toggleLanguage } = useLanguageStore()
  const { messages, isLoading, sendMessage } = useChat()
  const { toggleThinkingExpanded } = useChatStore()
  const { chatTitle, setChatTitle } = useSessionStore()
  const { updateSessionTitle } = useChatHistoryStore()
  const { documents, previewPdfFile, previewPdfPage, clearPreviewPdf } = useDocumentStore()
  const chatEndRef = useRef(null)

  // Layout states
  const [isKnowledgeExpanded, setIsKnowledgeExpanded] = useState(false)
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [showMobileLeft, setShowMobileLeft] = useState(false)
  const [showMobileRight, setShowMobileRight] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

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

  // Hydrate chat, document, and web source state from history when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // 1. Set active session ID in stores
      useSessionStore.setState({ sessionId })
      useChatHistoryStore.setState({ activeSessionId: sessionId })

      // 2. Fetch session data from history
      const sessionData = useChatHistoryStore.getState().history[sessionId]
      
      if (sessionData) {
        // Hydrate existing session
        useChatStore.setState({ messages: sessionData.messages || [] })
        useSessionStore.setState({ chatTitle: sessionData.title || 'New Chat' })
        useDocumentStore.setState({
          documents: sessionData.documents || [],
          importedWebSources: sessionData.importedWebSources || [],
          summary: sessionData.summary || null,
          mindmapNodes: sessionData.mindmapNodes || [],
          mindmapEdges: sessionData.mindmapEdges || [],
          // Clear temp search/preview states from other sessions
          webSearchQuery: '',
          webSearchResults: [],
          selectedWebSourceUrls: [],
        })
      } else {
        // Create new session or empty state
        useChatStore.getState().clearMessages()
        useSessionStore.setState({ chatTitle: 'New Chat' })
        useDocumentStore.getState().clearDocuments()
      }
    }
  }, [sessionId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle compare mode toggle - preserve compare messages when switching
  const handleToggleCompare = (newMode) => {
    setIsCompareMode(newMode)
    // Don't clear arena messages - preserve chat history when switching modes
    // Users can manually clear if needed
  }

  const startEditingTitle = () => {
    setEditTitle(chatTitle || t('workspaceSessionFallback'))
    setIsEditingTitle(true)
  }

  const saveTitle = () => {
    if (editTitle.trim()) {
      setChatTitle(editTitle.trim())
      updateSessionTitle(sessionId, editTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const cancelEditTitle = () => {
    setIsEditingTitle(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface-100 dark:bg-surface-950">

      {/* Navbar for Workspace */}
      <header className="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>

          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') cancelEditTitle()
                }}
                className="flex-1 px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border-2 border-primary-400 dark:border-primary-600 rounded-lg text-surface-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
                autoFocus
              />
              <button
                onClick={saveTitle}
                className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shrink-0"
                title={t('workspaceSave')}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEditTitle}
                className="p-1.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors shrink-0"
                title={t('workspaceCancel')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0 group">
              <span className="font-semibold text-surface-900 dark:text-white truncate">
                {chatTitle || t('workspaceSessionFallback')}
              </span>
              <button
                onClick={startEditingTitle}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                title={t('workspaceEditTitle')}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Toolbar: Model Selector + Compare Toggle + Theme Toggle */}
        <div className="flex items-center gap-3">
          <ModelSelector />
          <CompareToggle isCompareMode={isCompareMode} onToggle={handleToggleCompare} />
          
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-surface-600 dark:text-surface-300 font-medium text-sm flex items-center gap-2"
            title={t('workspaceChangeLanguage')}
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-surface-600 dark:text-surface-300"
            title={isDarkMode ? t('workspaceSwitchToLight') : t('workspaceSwitchToDark')}
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
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-30 md:hidden" 
          onClick={() => { setShowMobileLeft(false); setShowMobileRight(false); }}
        />
      )}

      {/* PDF Viewer */}
      {previewPdfFile && (
        <PdfViewerModal
          isOpen={true}
          onClose={clearPreviewPdf}
          title={previewPdfFile}
          fileUrl={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/docs/${useSessionStore.getState().sessionId}_${previewPdfFile}${previewPdfPage ? `#page=${previewPdfPage}` : ''}`}
        />
      )}
    </div>
  )
}
