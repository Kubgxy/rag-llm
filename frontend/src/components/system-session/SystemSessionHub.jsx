import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, RefreshCw } from 'lucide-react'
import { useSystemSessionStore } from '../../stores/systemSessionStore.js'
import { useChatHistoryStore } from '../../stores/chatHistoryStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import SystemSessionCard from './SystemSessionCard.jsx'
import { createSessionApi } from '../../services/api.js'

export default function SystemSessionHub() {
  const navigate = useNavigate()
  const { systemSessions, fetchSystemSessions, isLoading, error } = useSystemSessionStore()
  const { history, fetchHistoryFromBackend, setActiveSession } = useChatHistoryStore()
  const { selectedModel } = useChatStore()
  const { lang, t } = useLanguageStore()

  const [openingSessionId, setOpeningSessionId] = useState(null)

  const isThai = lang === 'th'

  // ดึงข้อมูลเมื่อ component โหลด
  useEffect(() => {
    fetchSystemSessions()
  }, [fetchSystemSessions])

  const handleSelectSession = async (systemSessionId) => {
    setOpeningSessionId(systemSessionId)
    try {
      // 1. ค้นหาในประวัติแชทที่มีอยู่ของ Client ว่ามี session ที่ผูกกับ systemSessionId นี้อยู่แล้วหรือไม่
      const existingSessionEntry = Object.entries(history).find(
        ([, session]) => session.systemSessionId === systemSessionId
      )

      if (existingSessionEntry) {
        // หากมีอยู่แล้ว ให้เปิดห้องแชทเดิม
        const [sessionId, sessionData] = existingSessionEntry
        
        setActiveSession(sessionId)
        useSessionStore.setState({ sessionId })
        useChatStore.setState({ messages: sessionData.messages || [] })
        useDocumentStore.setState({
          documents: sessionData.documents || [],
          importedWebSources: sessionData.importedWebSources || [],
          summary: sessionData.summary || '',
          mindmapNodes: sessionData.mindmapNodes || [],
          mindmapEdges: sessionData.mindmapEdges || [],
        })
        
        navigate(`/chat/${sessionId}`)
      } else {
        // หากไม่มี ให้สร้างห้องแชทใหม่สำหรับ System Session นี้ผ่าน Backend API
        const targetSession = systemSessions.find(s => s.id === systemSessionId)
        const sessionTitle = targetSession ? targetSession.name : 'Shared Session'
        
        const newSession = await createSessionApi(
          sessionTitle,
          'system', // sessionType
          selectedModel,
          systemSessionId
        )

        // โหลดประวัติแชทใหม่จากเซิร์ฟเวอร์เพื่อให้ประวัติอัปเดตลง Store
        await fetchHistoryFromBackend()
        
        // เซ็ตห้องแชทที่เพิ่งสร้างขึ้นใหม่ให้เป็น Active
        setActiveSession(newSession.id)
        useSessionStore.setState({ sessionId: newSession.id })
        useChatStore.getState().clearMessages()
        useDocumentStore.getState().clearDocuments()

        navigate(`/chat/${newSession.id}`)
      }
    } catch (err) {
      console.error('❌ Failed to open system session:', err)
      alert(isThai ? 'ไม่สามารถเปิดห้องแชทส่วนกลางได้ กรุณาลองใหม่อีกครั้ง' : 'Failed to open shared session. Please try again.')
    } finally {
      setOpeningSessionId(null)
    }
  }

  if (isLoading && systemSessions.length === 0) {
    return (
      <div className="mb-8 p-6 bg-white/40 dark:bg-surface-900/40 rounded-3xl border border-surface-200/50 dark:border-surface-800/50 backdrop-blur-sm animate-pulse">
        <div className="h-6 w-48 bg-surface-200 dark:bg-surface-800 rounded-lg mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 bg-surface-200 dark:bg-surface-800 rounded-3xl"></div>
        </div>
      </div>
    )
  }

  if (error && systemSessions.length === 0) {
    return (
      <div className="mb-8 p-6 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-900/30 rounded-3xl flex items-center gap-3">
        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-surface-900 dark:text-white">
            {isThai ? 'ไม่สามารถดึงข้อมูลห้องแชทส่วนกลางได้' : 'Failed to load shared sessions'}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">{error}</p>
        </div>
        <button
          onClick={() => fetchSystemSessions()}
          className="ml-auto p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (systemSessions.length === 0) {
    return null
  }

  return (
    <div className="mb-8 shrink-0">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        {isThai ? 'ห้องแชทส่วนกลาง (Shared Sessions)' : 'Shared Sessions'}
        <span className="text-xs font-normal text-surface-500 dark:text-surface-400">
          {isThai ? 'ดึงข้อมูลเรียลไทม์จากระบบองค์กร' : 'Real-time sync from company databases'}
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemSessions.map((session) => (
          <SystemSessionCard
            key={session.id}
            session={session}
            onSelect={handleSelectSession}
            isOpening={openingSessionId === session.id}
          />
        ))}
      </div>
    </div>
  )
}
