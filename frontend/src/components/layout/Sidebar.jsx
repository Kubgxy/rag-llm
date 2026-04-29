import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Plus, Trash2, BookOpen, Swords, Sun, Moon, LayoutPanelLeft } from 'lucide-react'
import { useChatHistoryStore } from '../../stores/chatHistoryStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useThemeStore } from '../../stores/themeStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { history, activeSessionId, setActiveSession, deleteSession } = useChatHistoryStore()
  const { theme, toggleTheme } = useThemeStore()
  const { t } = useLanguageStore()
  const location = useLocation()
  const navigate = useNavigate()

  const NAV_LINKS = [
    { path: '/', label: t('workspace'), icon: BookOpen },
    { path: '/arena', label: t('arena'), icon: Swords },
  ]

  const handleNewChat = () => {
    const newSessionId = useSessionStore.getState().resetSession()
    setActiveSession(newSessionId)
    useChatStore.getState().clearMessages()
    useDocumentStore.getState().clearDocuments()
    navigate('/')
  }

  const handleSelectSession = (sessionId) => {
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
    navigate('/')
  }

  const entries = Object.entries(history).sort(([, a], [, b]) => b.updatedAt - a.updatedAt)

  return (
    <aside 
      className={`
        flex flex-col bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800">
        <Link to="/" className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20 shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent truncate">
              NotebookLM
            </span>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <div className="p-3 space-y-1">
        {NAV_LINKS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              title={isCollapsed ? label : ''}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <button
          onClick={handleNewChat}
          title={isCollapsed ? 'New Chat' : ''}
          className={`
            flex items-center justify-center gap-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm
            ${isCollapsed ? 'px-0' : 'px-4'}
          `}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {!isCollapsed && (
          <div className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider px-3 py-2">
            Recent Chats
          </div>
        )}
        
        {entries.length === 0 ? (
          !isCollapsed && <div className="text-sm text-surface-500 px-3 py-2 italic">No history yet.</div>
        ) : (
          entries.map(([id, session]) => (
            <div
              key={id}
              onClick={() => handleSelectSession(id)}
              title={isCollapsed ? (session.title || 'Untitled Chat') : ''}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                activeSessionId === id || useSessionStore.getState().sessionId === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                {!isCollapsed && (
                  <span className="text-sm truncate">
                    {session.title || 'Untitled Chat'}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-red-500 transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer (Theme + Collapse) */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800 flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          title={isCollapsed ? 'Toggle Theme' : ''}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <LayoutPanelLeft className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
