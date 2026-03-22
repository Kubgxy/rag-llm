import { Link, useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, FileText, Calendar, Trash2 } from 'lucide-react'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useChatStore } from '../stores/chatStore.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useThemeStore } from '../stores/themeStore.js'
import { Sun, Moon } from 'lucide-react'

export default function LandingPage() {
  const { history, deleteSession, setActiveSession } = useChatHistoryStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const entries = Object.entries(history).sort(([, a], [, b]) => b.updatedAt - a.updatedAt)

  const handleNewChat = () => {
    const newSessionId = useSessionStore.getState().resetSession()
    setActiveSession(newSessionId)
    useChatStore.getState().clearMessages()
    useDocumentStore.getState().clearDocuments()
    navigate(`/chat/${newSessionId}`)
  }

  const handleOpenChat = (sessionId) => {
    setActiveSession(sessionId)
    useSessionStore.getState().setSessionId?.(sessionId) || useSessionStore.setState({ sessionId })
    
    const sessionData = history[sessionId]
    if (sessionData) {
      useChatStore.setState({ messages: sessionData.messages || [] })
      useDocumentStore.setState({
        documents: sessionData.documents || [],
        summary: sessionData.summary || '',
        mindmapNodes: sessionData.mindmapNodes || [],
        mindmapEdges: sessionData.mindmapEdges || [],
      })
    }
    navigate(`/chat/${sessionId}`)
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
            RAG-LLM Workspace
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/arena" 
            className="text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Model Arena
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white tracking-tight mb-2">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="text-surface-500 dark:text-surface-400 text-lg">
              จัดการเอกสารและพูดคุยกับ AI ของคุณได้ที่นี่
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 font-medium"
          >
            <Plus className="w-5 h-5" />
            สร้างแชทใหม่
          </button>
        </div>

        {/* History Grid */}
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-surface-400" />
            ประวัติการแชทล่าสุด
          </h2>

          {entries.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-surface-900/50 rounded-3xl border border-surface-200 dark:border-surface-800 border-dashed">
              <MessageSquare className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400 font-medium">ยังไม่มีประวัติการแชท</p>
              <p className="text-sm text-surface-500 mt-1">กดปุ่มสร้างแชทใหม่เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {entries.map(([id, session]) => {
                const docCount = session.documents?.length || 0;
                return (
                  <div
                    key={id}
                    onClick={() => handleOpenChat(id)}
                    className="group flex flex-col bg-white dark:bg-surface-900 rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(id)
                        }}
                        className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        title="ลบแชท"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2 line-clamp-2">
                      {session.title || 'Untitled Chat'}
                    </h3>

                    <div className="mt-auto pt-4 flex items-center gap-4 text-xs font-medium text-surface-500 dark:text-surface-400 border-t border-surface-100 dark:border-surface-800/50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(session.updatedAt).toLocaleDateString('th-TH', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {docCount} เอกสาร
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
