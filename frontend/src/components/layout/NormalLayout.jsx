import { MessageSquare, FileText, PanelRight } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore.js'
import UploadZone from '../upload/UploadZone.jsx'
import ChatMessage from '../chat/ChatMessage.jsx'
import ChatInput from '../chat/ChatInput.jsx'
import KnowledgeTabs from '../knowledge/KnowledgeTabs.jsx'

/**
 * NormalLayout - 3-Column Layout for regular chat
 * Left: Documents/Upload | Center: Chat | Right: Knowledge Base
 */
export function NormalLayout({
  messages,
  isLoading,
  sendMessage,
  isKnowledgeExpanded,
  setIsKnowledgeExpanded,
  showMobileLeft,
  setShowMobileLeft,
  showMobileRight,
  setShowMobileRight,
  documents,
  toggleThinkingExpanded,
  chatEndRef,
}) {
  const setPreviewPdf = useDocumentStore(state => state.setPreviewPdf)
  return (
    <>
      {/* ===================== LEFT COLUMN (Documents) ===================== */}
      <div
        className={`
          absolute md:static inset-y-0 left-0 z-10
          flex flex-col bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
          transition-all duration-300 w-72 md:w-1/5 xl:w-[20%]
          ${showMobileLeft ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <h2 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
            จัดการเอกสาร
          </h2>
          <UploadZone />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-surface-500 italic text-center mt-4">ยังไม่มีเอกสารในแชทนี้</p>
          ) : (
            documents.map((doc, i) => (
              <div
                key={i}
                onClick={() => setPreviewPdf(doc.name)}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 hover:border-primary-400 cursor-pointer transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                  {doc.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===================== CENTER COLUMN (Chat) ===================== */}
      <div
        className={`
          flex-1 flex flex-col bg-white dark:bg-surface-950 transition-all duration-500 min-w-0
          ${isKnowledgeExpanded ? 'md:w-2/5 xl:w-[40%]' : 'md:w-3/5 xl:w-[60%]'}
        `}
      >
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-surface-950/50 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-500" />
            สนทนา
          </h2>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary-500/10 to-primary-600/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary-500" />
              </div>
              <p className="text-base font-semibold text-surface-700 dark:text-surface-300">
                เริ่มพูดคุยกับ AI
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 max-w-sm">
                อัปโหลดเอกสารด้านซ้าย จากนั้นพิมพ์คำถามของคุณที่นี่
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <ChatMessage
                key={msg.id || i}
                message={msg}
                onThinkingToggle={(messageId) => toggleThinkingExpanded(messageId)}
              />
            ))
          )}

          {isLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-surface-200 dark:bg-surface-800 shrink-0" />
              <div className="h-12 w-32 bg-surface-200 dark:bg-surface-800 rounded-2xl rounded-tl-sm" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-surface-50 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 shrink-0">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} isLoading={isLoading} placeholder="พิมพ์คำถามของคุณที่นี่..." />
          </div>
        </div>
      </div>

      {/* ===================== RIGHT COLUMN (Knowledge Base) ===================== */}
      <div
        className={`
          absolute md:static inset-y-0 right-0 z-10
          flex flex-col bg-surface-50 dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800
          transition-all duration-500 w-80
          ${showMobileRight ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          ${isKnowledgeExpanded ? 'md:w-2/5 xl:w-[40%]' : 'md:w-1/5 xl:w-[20%]'}
        `}
      >
        <div className="p-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider pl-2">
            Knowledge Base
          </h2>
          <button
            onClick={() => setIsKnowledgeExpanded(!isKnowledgeExpanded)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors hidden md:block"
            title={isKnowledgeExpanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'}
          >
            <PanelRight className={`w-4 h-4 transition-transform ${isKnowledgeExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {documents.length === 0 ? (
            <div className="text-center mt-10">
              <PanelRight className="w-10 h-10 text-surface-300 dark:text-surface-700 mx-auto mb-3" />
              <p className="text-sm text-surface-500">อัปโหลดเอกสารเพื่อดูสรุปและ Mindmap</p>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Quick Document List for Context (Always visible) */}
              {!isKnowledgeExpanded && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-surface-500 px-1">คลิกที่เอกสารเพื่อดูสรุปแบบละเอียด</p>
                  {documents.map((doc, i) => (
                    <div
                      key={i}
                      onClick={() => setIsKnowledgeExpanded(true)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 hover:border-primary-400 cursor-pointer transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                          {doc.name}
                        </span>
                        <span className="block text-[10px] text-surface-400 mt-0.5">กดเพื่อดูข้อมูลเชิงลึก</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* The actual Knowledge Viewer (Shows clearly when expanded) */}
              <div
                className={`flex-1 min-h-0 bg-white dark:bg-surface-950 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden flex flex-col transition-opacity duration-300 ${
                  isKnowledgeExpanded ? 'opacity-100' : 'opacity-0 hidden'
                }`}
              >
                <KnowledgeTabs />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NormalLayout
