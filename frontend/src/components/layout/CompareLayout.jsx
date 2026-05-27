import { MessageSquare, FileText, ThumbsUp, ThumbsDown } from 'lucide-react'
import ChatMessage from '../chat/ChatMessage.jsx'
import ChatInput from '../chat/ChatInput.jsx'
import ThinkingBlock from '../chat/ThinkingBlock.jsx'
import { useChatStore } from '../../stores/chatStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { chatCompare } from '../../services/api.js'
import { useToast } from '../ui/Toast.jsx'
import ReactMarkdown from 'react-markdown'
import React from 'react'
import { useLanguageStore } from '../../stores/languageStore.js'

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
  const setPreviewPdf = useDocumentStore(state => state.setPreviewPdf)
  const {
    getArenaMessages,
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
  const { t } = useLanguageStore()

  // Get current session ID and arena messages for this session
  const sessionId = getSessionId()
  const arenaMessages = getArenaMessages(sessionId)

  // State สำหรับ tracking expanded state ของ thinking blocks
  const [thinkingExpanded, setThinkingExpanded] = React.useState({})

  // ฟังก์ชันสำหรับแปลง citation ให้เป็นตัวเลข (เหมือน ChatMessage)
  const processContent = (text, citations) => {
    if (!text) return text
    let citeCounter = 1

    // ค้นหา pattern เช่น [RAG_document.pdf หน้า 5, 6] หรือ [หน้า 5]
    return text.replace(/\[(?:([^\]]+?\.pdf)\s+)?หน้า\s*([0-9\s,\-]+)\]/gi, (match, fileName, pages) => {
      const resolvedFileName = (fileName || (citations && citations.length > 0 ? citations[0].file_name : ''))?.trim()
      const resolvedPages = pages?.trim()

      const payload = encodeURIComponent(JSON.stringify({
        file: resolvedFileName,
        pages: resolvedPages,
        original: match
      }))

      const res = `[${citeCounter}](#cite:${payload})`
      citeCounter++
      return res
    })
  }

  const handleSendMessage = async (query) => {
    if (!query.trim() || isArenaLoading || !arenaModelA || !arenaModelB) {
      if (!arenaModelA || !arenaModelB) {
        addToast(t('compareNeedSelectModels'), 'error')
      }
      return
    }

    addArenaUserMessage(sessionId, query)
    setArenaLoading(true)

    try {
      // ☑️ ใช้ session id เดียวกับ normal mode เพื่อเข้าถึงเอกสารเดียวกัน
      const result = await chatCompare(query, arenaModelA, arenaModelB, sessionId)

      // เพิ่ม response ของทั้ง 2 โมเดล
      addArenaResponse(sessionId, {
        responseA: result.response_a,
        responseB: result.response_b,
      })

      addToast(t('compareReceivedBothModels'), 'success')
    } catch (error) {
      console.error('Compare error:', error)
      addToast(error.message || t('compareFailed'), 'error')
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
            {t('compareDocumentsTitle')}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-surface-500 italic text-center mt-4">{t('compareNoDocuments')}</p>
          ) : (
            documents.map((doc, i) => (
              <div
                key={i}
                onClick={() => setPreviewPdf(doc.name)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 cursor-pointer hover:border-primary-400 transition-colors"
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
                {t('compareModelALeft')}
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
                <option value="">{t('compareSelectModelA')}</option>
                <option value="scb10x/typhoon2.5-qwen3-4b" disabled={arenaModelB === 'scb10x/typhoon2.5-qwen3-4b'}>Typhoon 2.5 {arenaModelB === 'scb10x/typhoon2.5-qwen3-4b' && t('compareUsedByModelB')}</option>
                <option value="iapp/chinda-qwen3-4b" disabled={arenaModelB === 'iapp/chinda-qwen3-4b'}>Chinda 4B {arenaModelB === 'iapp/chinda-qwen3-4b' && t('compareUsedByModelB')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-500 dark:text-surface-400">
                {t('compareModelBRight')}
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
                <option value="">{t('compareSelectModelB')}</option>
                <option value="scb10x/typhoon2.5-qwen3-4b" disabled={arenaModelA === 'scb10x/typhoon2.5-qwen3-4b'}>Typhoon 2.5 {arenaModelA === 'scb10x/typhoon2.5-qwen3-4b' && t('compareUsedByModelA')}</option>
                <option value="iapp/chinda-qwen3-4b" disabled={arenaModelA === 'iapp/chinda-qwen3-4b'}>Chinda 4B {arenaModelA === 'iapp/chinda-qwen3-4b' && t('compareUsedByModelA')}</option>
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
                {t('compareEmptyTitle')}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 max-w-sm">
                {t('compareEmptySubtitle')}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {arenaMessages.map((msg, i) => {
                if (msg.role === 'user') {
                  return (
                    <div key={i} className="mb-8">
                      <div className="text-center text-sm font-semibold text-surface-600 dark:text-surface-400 mb-4">
                        {t('compareQuestionLabel')}
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
                          {t('compareModelAName')}: {msg.responseA?.model_name}
                        </div>
                        {msg.responseA?.thinking && (
                          <div className="mb-2">
                            <ThinkingBlock
                              thinking={msg.responseA.thinking}
                              isExpanded={thinkingExpanded[`${i}-a`] || false}
                              onToggle={() => setThinkingExpanded(prev => ({
                                ...prev,
                                [`${i}-a`]: !prev[`${i}-a`]
                              }))}
                              messageId={`${i}-a`}
                            />
                          </div>
                        )}
                        <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 text-sm leading-relaxed prose-chat">
                          {msg.responseA?.answer && msg.responseA.answer.trim() ? (
                            <>
                              <ReactMarkdown
                                components={{
                                  a: ({node, href, children, ...props}) => {
                                    if (href?.startsWith('#cite:')) {
                                      try {
                                        const dataStr = decodeURIComponent(href.replace('#cite:', ''))
                                        const data = JSON.parse(dataStr)
                                        const firstPage = data.pages ? data.pages.split(/[,-]+/)[0].trim() : null

                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              if (data.file) {
                                                const cite = msg.responseA.citations?.find(c => c.file_name === data.file)
                                                if (cite && cite.url) {
                                                  window.open(cite.url, '_blank', 'noopener,noreferrer')
                                                } else {
                                                  setPreviewPdf(data.file, firstPage)
                                                }
                                              }
                                            }}
                                            title={data.original?.replace(/[\[\]]/g, '')}
                                            className="inline-flex cursor-pointer items-center justify-center bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/40 dark:hover:bg-primary-800/60 text-primary-700 dark:text-primary-300 rounded text-[11px] font-bold px-1.5 py-0.5 mx-0.5 transition-colors align-baseline"
                                          >
                                            {children}
                                          </button>
                                        )
                                      } catch(e) {
                                        // parse error
                                      }
                                    }
                                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline" {...props}>{children}</a>
                                  }
                                }}
                              >
                                {processContent(msg.responseA.answer, msg.responseA.citations)}
                              </ReactMarkdown>

                              {/* Citations section */}
                              {msg.responseA.citations && msg.responseA.citations.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
                                  <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {t('citationSourceTitle')}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.responseA.citations.map((cite, idx) => (
                                      cite.url ? (
                                        <a
                                          key={idx}
                                          href={cite.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 px-2 py-1 rounded-md text-surface-700 dark:text-surface-300 cursor-pointer transition-colors border-none text-left"
                                          title={cite.text_snippet ? cite.text_snippet.trim() : ''}
                                        >
                                          {cite.file_name} <span className="opacity-60">(web)</span>
                                        </a>
                                      ) : (
                                        <button
                                          key={idx}
                                          onClick={() => setPreviewPdf(cite.file_name, cite.page_label)}
                                          className="text-xs bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 px-2 py-1 rounded-md text-surface-700 dark:text-surface-300 cursor-pointer transition-colors border-none text-left"
                                          title={cite.text_snippet ? cite.text_snippet.trim() : ''}
                                        >
                                          {cite.file_name} <span className="opacity-60">({t('citationPageLabel')} {cite.page_label})</span>
                                        </button>
                                      )
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-surface-500 italic">{t('compareNoAnswer')}</span>
                          )}
                        </div>
                        {/* Vote Buttons for Model A */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setArenaVote(sessionId, i, 'a', msg.votes?.a === 'thumbs_up' ? null : 'thumbs_up')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.a === 'thumbs_up'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <ThumbsUp size={16} />
                            <span className="text-xs font-medium">{t('compareVoteGood')}</span>
                          </button>
                          <button
                            onClick={() => setArenaVote(sessionId, i, 'a', msg.votes?.a === 'thumbs_down' ? null : 'thumbs_down')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.a === 'thumbs_down'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <ThumbsDown size={16} />
                            <span className="text-xs font-medium">{t('compareVoteBad')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Model B Response */}
                      <div className="flex flex-col gap-3">
                        <div className="text-sm font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
                          {t('compareModelBName')}: {msg.responseB?.model_name}
                        </div>
                        {msg.responseB?.thinking && (
                          <div className="mb-2">
                            <ThinkingBlock
                              thinking={msg.responseB.thinking}
                              isExpanded={thinkingExpanded[`${i}-b`] || false}
                              onToggle={() => setThinkingExpanded(prev => ({
                                ...prev,
                                [`${i}-b`]: !prev[`${i}-b`]
                              }))}
                              messageId={`${i}-b`}
                            />
                          </div>
                        )}
                        <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 text-sm leading-relaxed prose-chat">
                          {msg.responseB?.answer && msg.responseB.answer.trim() ? (
                            <>
                              <ReactMarkdown
                                components={{
                                  a: ({node, href, children, ...props}) => {
                                    if (href?.startsWith('#cite:')) {
                                      try {
                                        const dataStr = decodeURIComponent(href.replace('#cite:', ''))
                                        const data = JSON.parse(dataStr)
                                        const firstPage = data.pages ? data.pages.split(/[,-]+/)[0].trim() : null

                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              if (data.file) {
                                                const cite = msg.responseB.citations?.find(c => c.file_name === data.file)
                                                if (cite && cite.url) {
                                                  window.open(cite.url, '_blank', 'noopener,noreferrer')
                                                } else {
                                                  setPreviewPdf(data.file, firstPage)
                                                }
                                              }
                                            }}
                                            title={data.original?.replace(/[\[\]]/g, '')}
                                            className="inline-flex cursor-pointer items-center justify-center bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/40 dark:hover:bg-primary-800/60 text-primary-700 dark:text-primary-300 rounded text-[11px] font-bold px-1.5 py-0.5 mx-0.5 transition-colors align-baseline"
                                          >
                                            {children}
                                          </button>
                                        )
                                      } catch(e) {
                                        // parse error
                                      }
                                    }
                                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline" {...props}>{children}</a>
                                  }
                                }}
                              >
                                {processContent(msg.responseB.answer, msg.responseB.citations)}
                              </ReactMarkdown>

                              {/* Citations section */}
                              {msg.responseB.citations && msg.responseB.citations.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
                                  <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {t('citationSourceTitle')}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.responseB.citations.map((cite, idx) => (
                                      cite.url ? (
                                        <a
                                          key={idx}
                                          href={cite.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 px-2 py-1 rounded-md text-surface-700 dark:text-surface-300 cursor-pointer transition-colors border-none text-left"
                                          title={cite.text_snippet ? cite.text_snippet.trim() : ''}
                                        >
                                          {cite.file_name} <span className="opacity-60">(web)</span>
                                        </a>
                                      ) : (
                                        <button
                                          key={idx}
                                          onClick={() => setPreviewPdf(cite.file_name, cite.page_label)}
                                          className="text-xs bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 px-2 py-1 rounded-md text-surface-700 dark:text-surface-300 cursor-pointer transition-colors border-none text-left"
                                          title={cite.text_snippet ? cite.text_snippet.trim() : ''}
                                        >
                                          {cite.file_name} <span className="opacity-60">({t('citationPageLabel')} {cite.page_label})</span>
                                        </button>
                                      )
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-surface-500 italic">{t('compareNoAnswer')}</span>
                          )}
                        </div>
                        {/* Vote Buttons for Model B */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setArenaVote(sessionId, i, 'b', msg.votes?.b === 'thumbs_up' ? null : 'thumbs_up')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.b === 'thumbs_up'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <ThumbsUp size={16} />
                            <span className="text-xs font-medium">{t('compareVoteGood')}</span>
                          </button>
                          <button
                            onClick={() => setArenaVote(sessionId, i, 'b', msg.votes?.b === 'thumbs_down' ? null : 'thumbs_down')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors ${
                              msg.votes?.b === 'thumbs_down'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <ThumbsDown size={16} />
                            <span className="text-xs font-medium">{t('compareVoteBad')}</span>
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
              placeholder={t('compareInputPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompareLayout
