import React from 'react'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useChatHistoryStore } from '../../stores/chatHistoryStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useNavigate } from 'react-router-dom'

export default function Sidebar() {
  const { history, activeSessionId, setActiveSession, deleteSession } = useChatHistoryStore()
  const navigate = useNavigate()

  const handleNewChat = () => {
    // Generate new session
    const newSessionId = useSessionStore.getState().resetSession()
    setActiveSession(newSessionId)
    
    // Clear chat and docs
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
        summary: sessionData.summary || '',
        mindmapNodes: sessionData.mindmapNodes || [],
        mindmapEdges: sessionData.mindmapEdges || [],
      })
    }
    navigate('/')
  }

  const entries = Object.entries(history).sort(([, a], [, b]) => b.updatedAt - a.updatedAt)

  return (
    <aside className="w-64 bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col h-full">
      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <div className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider px-3 py-2">
          Recent Chats
        </div>
        
        {entries.length === 0 ? (
          <div className="text-sm text-surface-500 px-3 py-2 italic">
            No history yet.
          </div>
        ) : (
          entries.map(([id, session]) => (
            <div
              key={id}
              onClick={() => handleSelectSession(id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeSessionId === id || useSessionStore.getState().sessionId === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="text-sm truncate">
                  {session.title || 'Untitled Chat'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded text-red-500 transition-all"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
