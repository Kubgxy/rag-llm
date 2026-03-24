import { MessageSquare, FileText, ThumbsUp, ThumbsDown } from 'lucide-react'
import ChatMessage from '../chat/ChatMessage.jsx'
import ChatInput from '../chat/ChatInput.jsx'
import { useChatStore } from '../../stores/chatStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { chatCompare } from '../../services/api.js'
import { useToast } from '../ui/Toast.jsx'
import ReactMarkdown from 'react-markdown'

/**
 * CompareLayout - Side-by-side comparison of 2 AI models
 * Shows Model A vs Model B responses with voting
 */
export function CompareLayout({
  isLoading,
  showMobileLeft,
  setShowMobileLeft,
  documents,
  sendMessage,
  toggleThinkingExpanded,
  chatEndRef,
}) {
  const {
    arenaMessages,
    arenaModelA,
    arenaModelB,
    setArenaModelA,
    setArenaModelB,
    setArenaVote,
    isArenaLoading,
    addArenaUserMessage,
    addArenaResponse,
    setArenaLoading,
  } = useChatStore()
  const { getSessionId } = useSessionStore()
  const { addToast } = useToast()

  const handleSendMessage = async (query) => {
    if (!query.trim() || isArenaLoading || !arenaModelA || !arenaModelB) {
      if (!arenaModelA || !arenaModelB) {
        addToast('กรุณาเลือกโมเดล A และ B', 'error')
      }
      return
    }

    addArenaUserMessage(query)
    setArenaLoading(true)

    try {
      // ☑️ ใช้ session id เดียวกับ normal mode เพื่อเข้าถึงเอกสารเดียวกัน
      const sessionId = getSessionId()
      const result = await chatCompare(query, arenaModelA, arenaModelB, sessionId)

      // เพิ่ม response ของทั้ง 2 โมเดล
      addArenaResponse({
        responseA: result.response_a,
        responseB: result.response_b,
      })

      addToast('ได้คำตอบจากทั้ง 2 โมเดล', 'success')
    } catch (error) {
      console.error('Compare error:', error)
      addToast(error.message || 'ไม่สามารถเปรียบเทียบโมเดลได้', 'error')
    } finally {
      setArenaLoading(false)
    }
  }

  return (
    <div className="flex-1 flex min-h-0 relative">
      {/* ===================== LEFT COLUMN (Documents) ===================== */}
      <div
        className={`
          absolute md:static inset-y-0 left-0 z-10
          flex flex-col bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
          transition-all duration-300 w-72 md:w-1/5
          ${showMobileLeft ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <h2 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
            เอกสาร
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-surface-500 italic text-center mt-4">ยังไม่มีเอกสาร</p>
          ) : (
            documents.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
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

      {/* ===================== MAIN COMPARE AREA ===================== */}
      <div className="flex-1 flex flex-col bg-white dark:bg-surface-950 min-w-0">
        {/* Header with Model Selectors */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-950/50 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-500 dark:text-surface-400">
                📊 โมเดล A (ซ้าย)
              </label>
              <select
                value={arenaModelA}
                onChange={(e) => {
                  const newValue = e.target.value
                  // ป้องกันเลือกตัวเดียวกับ Model B
                  if (newValue !== arenaModelB) {
                    setArenaModelA(newValue)
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="">เลือกโมเดล A</option>
                <option value="scb10x/typhoon2.5-qwen3-4b" disabled={arenaModelB === 'scb10x/typhoon2.5-qwen3-4b'}>Typhoon 2.5 {arenaModelB === 'scb10x/typhoon2.5-qwen3-4b' && '(ใช้โมเดล B อยู่)'}</option>
                <option value="iapp/chinda-qwen3-4b" disabled={arenaModelB === 'iapp/chinda-qwen3-4b'}>Chinda 4B {arenaModelB === 'iapp/chinda-qwen3-4b' && '(ใช้โมเดล B อยู่)'}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-500 dark:text-surface-400">
                📊 โมเดล B (ขวา)
              </label>
              <select
                value={arenaModelB}
                onChange={(e) => {
                  const newValue = e.target.value
                  // ป้องกันเลือกตัวเดียวกับ Model A
                  if (newValue !== arenaModelA) {
                    setArenaModelB(newValue)
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="">เลือกโมเดล B</option>
                <option value="scb10x/typhoon2.5-qwen3-4b" disabled={arenaModelA === 'scb10x/typhoon2.5-qwen3-4b'}>Typhoon 2.5 {arenaModelA === 'scb10x/typhoon2.5-qwen3-4b' && '(ใช้โมเดล A อยู่)'}</option>
                <option value="iapp/chinda-qwen3-4b" disabled={arenaModelA === 'iapp/chinda-qwen3-4b'}>Chinda 4B {arenaModelA === 'iapp/chinda-qwen3-4b' && '(ใช้โมเดล A อยู่)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          {arenaMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-500/10 to-purple-600/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-base font-semibold text-surface-700 dark:text-surface-300">
                เปรียบเทียบโมเดล AI
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 max-w-sm">
                เลือกโมเดลทั้ง 2 แล้วส่งคำถามเดียวกันให้กับทั้งคู่
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {arenaMessages.map((msg, i) => {
                if (msg.role === 'user') {
                  return (
                    <div key={i} className="mb-8">
                      <div className="text-center text-sm font-semibold text-surface-600 dark:text-surface-400 mb-4">
                        👤 คำถาม:
                      </div>
                      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4">
                        {msg.content}
                      </div>
                    </div>
                  )
                } else if (msg.role === 'arena-response') {
                  return (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Model A Response */}
                      <div className="flex flex-col gap-3">
                        <div className="text-sm font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-indigo-500" />
                          โมเดล A: {msg.responseA?.model_name}
                        </div>
                        {msg.responseA?.thinking && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <details className="text-xs">
                              <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
                                🧠 ความคิด...
                              </summary>
                              <div className="mt-2 text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                                {msg.responseA.thinking}
                              </div>
                            </details>
                          </div>
                        )}
                        <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 prose-chat">
                          {msg.responseA?.answer && msg.responseA.answer.trim() ? (
                            <ReactMarkdown>{msg.responseA.answer}</ReactMarkdown>
                          ) : (
                            <span className="text-surface-500 italic">ไม่มีคำตอบ</span>
                          )}
                        </div>
                        {/* Vote Buttons for Model A */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setArenaVote(i, 'a', msg.votes?.a === 'thumbs_up' ? null : 'thumbs_up')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.a === 'thumbs_up'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <ThumbsUp size={16} />
                            <span className="text-xs font-medium">ดี</span>
                          </button>
                          <button
                            onClick={() => setArenaVote(i, 'a', msg.votes?.a === 'thumbs_down' ? null : 'thumbs_down')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.a === 'thumbs_down'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <ThumbsDown size={16} />
                            <span className="text-xs font-medium">แย่</span>
                          </button>
                        </div>
                      </div>

                      {/* Model B Response */}
                      <div className="flex flex-col gap-3">
                        <div className="text-sm font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
                          โมเดล B: {msg.responseB?.model_name}
                        </div>
                        {msg.responseB?.thinking && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <details className="text-xs">
                              <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
                                🧠 ความคิด...
                              </summary>
                              <div className="mt-2 text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                                {msg.responseB.thinking}
                              </div>
                            </details>
                          </div>
                        )}
                        <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 prose-chat">
                          {msg.responseB?.answer && msg.responseB.answer.trim() ? (
                            <ReactMarkdown>{msg.responseB.answer}</ReactMarkdown>
                          ) : (
                            <span className="text-surface-500 italic">ไม่มีคำตอบ</span>
                          )}
                        </div>
                        {/* Vote Buttons for Model B */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setArenaVote(i, 'b', msg.votes?.b === 'thumbs_up' ? null : 'thumbs_up')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.b === 'thumbs_up'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <ThumbsUp size={16} />
                            <span className="text-xs font-medium">ดี</span>
                          </button>
                          <button
                            onClick={() => setArenaVote(i, 'b', msg.votes?.b === 'thumbs_down' ? null : 'thumbs_down')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.b === 'thumbs_down'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <ThumbsDown size={16} />
                            <span className="text-xs font-medium">แย่</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}

              {isArenaLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/3" />
                    <div className="h-32 bg-surface-200 dark:bg-surface-800 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/3" />
                    <div className="h-32 bg-surface-200 dark:bg-surface-800 rounded" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-50 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 shrink-0">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isArenaLoading}
              placeholder="พิมพ์คำถามเพื่อเปรียบเทียบ..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompareLayout
