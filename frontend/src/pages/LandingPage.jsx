import { Link, useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, FileText, Calendar, Trash2, Pencil, Check, X, Tag, FolderOpen, Inbox, Settings as SettingsIcon, Search } from 'lucide-react'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useChatStore } from '../stores/chatStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useThemeStore } from '../stores/themeStore.js'
import { useCategoryStore } from '../stores/categoryStore.js'
import { Sun, Moon, Globe } from 'lucide-react'
import { useState, useRef } from 'react'
import { useLanguageStore } from '../stores/languageStore.js'
import GlobalSearchModal from '../components/chat/GlobalSearchModal.jsx'

export default function LandingPage() {
  const { history, deleteSession, setActiveSession, updateSessionTitle, updateSessionCategory } = useChatHistoryStore()
  const { categories, selectedCategoryId, setSelectedCategory, clearCategoryFilter } = useCategoryStore()
  const { theme, toggleTheme } = useThemeStore()
  const { lang, t, toggleLanguage } = useLanguageStore()
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [changingCategoryId, setChangingCategoryId] = useState(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [draggedSessionId, setDraggedSessionId] = useState(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  const getCategoryLabel = (category) => {
    if (category.id === 'work') return t('categoryWork')
    if (category.id === 'personal') return t('categoryPersonal')
    if (category.id === 'research') return t('categoryResearch')
    return category.name
  }

  // Filter entries by category and search
  const allEntries = Object.entries(history).sort(([, a], [, b]) => b.updatedAt - a.updatedAt)

  // Apply category filter
  const entries = selectedCategoryId
    ? allEntries.filter(([, session]) => session.categoryId === selectedCategoryId)
    : allEntries

  // Count chats per category
  const categoryCounts = allEntries.reduce((acc, [, session]) => {
    const catId = session.categoryId || 'uncategorized'
    acc[catId] = (acc[catId] || 0) + 1
    return acc
  }, {})

  const handleNewChat = () => {
    const newSessionId = useSessionStore.getState().resetSession()
    setActiveSession(newSessionId)
    useChatStore.getState().clearMessages()
    useDocumentStore.getState().clearDocuments()
    navigate(`/chat/${newSessionId}`)
  }

  const handleOpenChat = (sessionId, messageIndex = null) => {
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

  const startEditing = (e, sessionId, currentTitle) => {
    e.stopPropagation()
    setEditingId(sessionId)
    setEditTitle(currentTitle)
  }

  const saveEdit = (e, sessionId) => {
    e.stopPropagation()
    if (editTitle.trim()) {
      updateSessionTitle(sessionId, editTitle.trim())
      // Also update sessionStore if this is the active session
      const currentSessionId = useSessionStore.getState().sessionId
      if (currentSessionId === sessionId) {
        useSessionStore.getState().setChatTitle(editTitle.trim())
      }
    }
    setEditingId(null)
  }

  const cancelEdit = (e) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const changeCategory = (e, sessionId, categoryId) => {
    e.stopPropagation()
    updateSessionCategory(sessionId, categoryId)
    setChangingCategoryId(null)
  }

  // Drag & Drop Handlers
  const handleDragStart = (e, sessionId) => {
    setIsDragging(true)
    setDraggedSessionId(sessionId)
    e.dataTransfer.effectAllowed = 'move'

    // Try to create a better drag image
    const title = history[sessionId]?.title || t('historyUntitledChat')
    const truncatedTitle = title.length > 30 ? title.slice(0, 27) + '...' : title

    // Method 1: Try with HTML element
    const dragElement = document.createElement('div')
    dragElement.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: 280px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid rgba(59, 130, 246, 0.4);
      border-radius: 16px;
      font-family: system-ui, sans-serif;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      transform: rotate(-1deg) scale(0.95);
      z-index: 10000;
    `

    dragElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <div style="width: 36px; height: 36px; background: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px;">💬</div>
        <div>
          <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${truncatedTitle}</div>
          <div style="color: #64748b; font-size: 11px;">${t('historyMoving')}</div>
        </div>
      </div>
      <div style="text-align: center; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 12px; color: #3b82f6; font-weight: 600;">
        🎯 ${t('historyDropOnCategory')}
      </div>
    `

    document.body.appendChild(dragElement)

    // Force browser to render the element
    dragElement.offsetHeight

    try {
      // Try to set custom drag image
      e.dataTransfer.setDragImage(dragElement, 140, 50)
    } catch (error) {
      console.log('Custom drag image failed, using default')
    }

    // Cleanup
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement)
      }
    }, 1)

    // Set text data as fallback
    e.dataTransfer.setData('text/plain', `${t('historyDraggingPrefix')}: ${truncatedTitle}`)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedSessionId(null)
    setDragOverCategoryId(null)
  }

  const handleCardClick = (sessionId, messageIndex = null) => {
    // Only handle click if we're not in the middle of a drag
    if (!isDragging) {
      handleOpenChat(sessionId, messageIndex)
    }
  }

  const handleDragOver = (e, categoryId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCategoryId(categoryId)
  }

  const handleDragLeave = () => {
    setDragOverCategoryId(null)
  }

  const handleDrop = (e, categoryId) => {
    e.preventDefault()
    if (draggedSessionId) {
      updateSessionCategory(draggedSessionId, categoryId)
      setDraggedSessionId(null)
      setDragOverCategoryId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-primary-50/20 to-surface-100 dark:from-surface-950 dark:via-primary-950/10 dark:to-surface-900 flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center justify-between px-4 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-surface-900 dark:text-white">
            RAG-LLM Workspace
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400 font-medium text-sm flex items-center gap-2"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>
          
          <Link
            to="/settings"
            className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400"
            title={t('settings')}
          >
            <SettingsIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-6 lg:px-12 py-8 flex flex-col overflow-hidden">
        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0 py-2 px-4 -mx-4">
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={() => clearCategoryFilter()}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                !selectedCategoryId
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white/60 dark:bg-surface-900/60 text-surface-600 dark:text-surface-400 hover:bg-white dark:hover:bg-surface-900 border border-surface-200 dark:border-surface-800'
              } ${dragOverCategoryId === null && draggedSessionId ? 'ring-2 ring-primary-500 scale-105 z-20 relative' : ''}`}
            >
              <Inbox className="w-4 h-4" />
              {t('all')} ({allEntries.length})
            </button>

            {Object.values(categories).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                  selectedCategoryId === category.id
                    ? 'text-white shadow-md'
                    : 'bg-white/60 dark:bg-surface-900/60 hover:bg-white dark:hover:bg-surface-900 border border-surface-200 dark:border-surface-800'
                } ${dragOverCategoryId === category.id ? 'ring-2 ring-primary-500 scale-105 z-20 relative' : ''}`}
                style={{
                  backgroundColor: selectedCategoryId === category.id ? category.color : undefined,
                  color: selectedCategoryId === category.id ? '#fff' : undefined,
                }}
              >
                <span>{category.icon}</span>
                {getCategoryLabel(category)} ({categoryCounts[category.id] || 0})
              </button>
            ))}

            <button
              onClick={() => clearCategoryFilter()}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                selectedCategoryId === null && categoryCounts.uncategorized
                  ? 'bg-surface-300 dark:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-md'
                  : 'bg-white/60 dark:bg-surface-900/60 text-surface-500 dark:text-surface-500 hover:bg-white dark:hover:bg-surface-900 border border-surface-200 dark:border-surface-800'
              } ${dragOverCategoryId === null && draggedSessionId ? 'ring-2 ring-primary-500 scale-105 z-20 relative' : ''}`}
            >
              <FolderOpen className="w-4 h-4" />
              {t('uncategorized')} ({categoryCounts.uncategorized || 0})
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
          <div className="space-y-2 flex-1">
            <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white tracking-tight">
              {t('welcome')}
            </h1>
            <p className="text-surface-600 dark:text-surface-400 text-base flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
              {t('subtitle')}
            </p>

            {/* Search Bar - Trigger Modal */}
            <div className="relative mt-4 max-w-md">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="w-full flex items-center gap-3 pl-4 pr-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-500 dark:text-surface-400 hover:border-primary-400 dark:hover:border-primary-600 transition-all text-left shadow-sm group"
              >
                <Search className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
                <span className="flex-1">{t('search')}</span>
              </button>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl transition-all duration-300 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-1 active:translate-y-0 font-semibold shrink-0"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            {t('newChat')}
          </button>
        </div>

        {/* History Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-6 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            {t('history')}
            {allEntries.length > 0 && (
              <span className="ml-auto text-xs font-normal text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
                {t('historyDragHint')}
              </span>
            )}
          </h2>

          {entries.length === 0 ? (
            <div className="text-center py-24 bg-white/60 dark:bg-surface-900/40 rounded-3xl border-2 border-surface-200/50 dark:border-surface-800/50 border-dashed backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary-400 dark:text-primary-500" />
              </div>
              <p className="text-surface-700 dark:text-surface-300 font-semibold text-lg">
                {t('historyNoChatsTitle')}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                {tr('historyNoChatsSubtitle', { newChat: t('newChat') })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {entries.map(([id, session]) => {
                const docCount = session.documents?.length || 0;
                return (
                  <div key={id} className="flex flex-col gap-2">
                    <div
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(id)}
                      className={`group flex flex-col bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm rounded-3xl p-6 border border-surface-200/60 dark:border-surface-800/60 shadow-md hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 hover:border-primary-300/60 dark:hover:border-primary-700/60 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 active:translate-y-0 select-none ${
                        draggedSessionId === id
                          ? 'opacity-50 scale-95 rotate-2 cursor-grabbing ring-2 ring-primary-400 shadow-2xl'
                          : 'cursor-pointer hover:cursor-grab'
                      }`}
                    >
                      {/* Gradient bar on top */}
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Subtle background gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-100/0 dark:from-primary-900/0 dark:to-primary-800/0 group-hover:from-primary-50/50 group-hover:to-primary-100/30 dark:group-hover:from-primary-900/10 dark:group-hover:to-primary-800/5 transition-all duration-300 rounded-3xl" />

                      <div className="relative z-10 flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300 ring-2 ring-primary-200/50 dark:ring-primary-800/30">
                          <MessageSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => startEditing(e, id, session.title || t('historyUntitledChat'))}
                            className="p-2 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                            title={t('historyEditTitle')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(id)
                            }}
                            className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                            title={t('historyDeleteChat')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingId === id ? (
                        <div className="relative z-10 mb-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(e, id)
                              if (e.key === 'Escape') cancelEdit(e)
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-800 border-2 border-primary-400 dark:border-primary-600 rounded-xl text-surface-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => saveEdit(e, id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {t('historySave')}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              {t('historyCancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <h3 className="relative z-10 text-lg font-bold text-surface-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-300">
                          {session.title || t('historyUntitledChat')}
                        </h3>
                      )}

                      <div className="relative z-10 mt-auto pt-4 flex items-center gap-4 text-xs font-semibold text-surface-500 dark:text-surface-400 border-t border-surface-100 dark:border-surface-800/50 group-hover:border-primary-200 dark:group-hover:border-primary-800/50 transition-colors duration-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(session.updatedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full text-xs font-bold">
                            {docCount}
                          </span>
                          {t('historyDocumentsLabel')}
                        </div>

                        {/* Category Selector */}
                        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={session.categoryId || ''}
                            onChange={(e) => changeCategory(e, id, e.target.value || null)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-primary-400 dark:hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">{t('uncategorized')}</option>
                            {Object.values(categories).map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {getCategoryLabel(cat)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <GlobalSearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />
    </div>
  )
}
