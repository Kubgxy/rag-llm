import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquare, FileText, PanelRight, ExternalLink, X, Globe } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import UploadZone from '../upload/UploadZone.jsx'
import WebSearchPreview from '../search/WebSearchPreview.jsx'
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
  const importedWebSources = useDocumentStore(state => state.importedWebSources)
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState('docs') // 'docs' or 'search'

  // Calculate cumulative document storage size in MB
  const totalSizeBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0)
  const totalSizeMB = totalSizeBytes / (1024 * 1024)
  const location = useLocation()
  const { t } = useLanguageStore()

  // ---- Resize Logic ----
  const [rightPanelWidth, setRightPanelWidth] = useState(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(null)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const [isResizingLeft, setIsResizingLeft] = useState(false)

  const isResizing = isResizingLeft || isResizingRight

  const startResizingRight = (e) => {
    e.preventDefault()
    setIsResizingRight(true)
    document.addEventListener('mousemove', handleMouseMoveRight)
    document.addEventListener('mouseup', stopResizingRight)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMoveRight = (e) => {
    let newWidth = window.innerWidth - e.clientX
    if (newWidth < 250) newWidth = 250
    if (newWidth > window.innerWidth * 0.45) newWidth = window.innerWidth * 0.45
    if (newWidth < window.innerWidth * 0.20) newWidth = window.innerWidth * 0.20
    setRightPanelWidth(newWidth)
  }

  const stopResizingRight = () => {
    setIsResizingRight(false)
    document.removeEventListener('mousemove', handleMouseMoveRight)
    document.removeEventListener('mouseup', stopResizingRight)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const startResizingLeft = (e) => {
    e.preventDefault()
    setIsResizingLeft(true)
    document.addEventListener('mousemove', handleMouseMoveLeft)
    document.addEventListener('mouseup', stopResizingLeft)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMoveLeft = (e) => {
    let newWidth = e.clientX
    if (newWidth < 260) newWidth = 260
    if (newWidth > window.innerWidth * 0.45) newWidth = window.innerWidth * 0.45
    if (newWidth < window.innerWidth * 0.22) newWidth = window.innerWidth * 0.22
    setLeftPanelWidth(newWidth)
  }

  const stopResizingLeft = () => {
    setIsResizingLeft(false)
    document.removeEventListener('mousemove', handleMouseMoveLeft)
    document.removeEventListener('mouseup', stopResizingLeft)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveRight)
      document.removeEventListener('mouseup', stopResizingRight)
      document.removeEventListener('mousemove', handleMouseMoveLeft)
      document.removeEventListener('mouseup', stopResizingLeft)
    }
  }, [])

  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    } catch {
      return null
    }
  }
  const pdfItems = documents.map((doc, index) => ({
    key: `pdf-${doc.name}-${index}`,
    title: doc.name,
    action: () => setPreviewPdf(doc.name),
  }))

  const webItems = importedWebSources.map((item, index) => ({
    key: `web-${item.url}-${index}`,
    title: item.source || item.title || item.url,
    subtitle: item.url,
    favicon: getFaviconUrl(item.url),
    action: () => window.open(item.url, '_blank', 'noopener,noreferrer'),
  }))

  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      const scrollToIdx = location.state?.scrollToMessage

      if (scrollToIdx !== undefined && scrollToIdx !== null) {
        const msgEl = document.getElementById(`msg-${scrollToIdx}`)
        if (msgEl) {
          msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })

          msgEl.classList.add('ring-2', 'ring-primary-500', 'bg-primary-50/50', 'dark:bg-primary-900/20', 'rounded-xl', 'transition-all', 'duration-500')

          let isOp = false;
          const flashInterval = setInterval(() => {
            if (isOp) {
              msgEl.style.opacity = '1';
            } else {
              msgEl.style.opacity = '0.5';
            }
            isOp = !isOp;
          }, 300);

          setTimeout(() => {
            clearInterval(flashInterval);
            msgEl.style.opacity = '1';
            msgEl.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50/50', 'dark:bg-primary-900/20', 'rounded-xl')
          }, 2500)
          return;
        }
      }

      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [messages, location.state])
  return (
    <>
      {/* ===================== LEFT COLUMN (Documents) ===================== */}
      <div
        style={leftPanelWidth ? { width: `${leftPanelWidth}px`, flexShrink: 0 } : {}}
        className={`
          relative fixed md:static inset-y-0 left-0 z-40
          flex flex-col bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
          w-80 lg:w-[420px] shrink-0
          ${isResizing ? '' : 'transition-all duration-300'}
          ${showMobileLeft ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Left Drag Handle */}
        <div
          onMouseDown={startResizingLeft}
          className={`absolute right-0 top-0 bottom-0 w-1.5 -mr-[3px] cursor-col-resize z-20 hover:bg-primary-500 transition-colors ${isResizingLeft ? 'bg-primary-500' : 'bg-transparent'}`}
        />
        {/* Left Column Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 shrink-0 flex items-center justify-between bg-surface-50 dark:bg-surface-900">
          <h2 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            {t('normalDocsTitle')}
          </h2>
          <button
            onClick={() => setShowMobileLeft(false)}
            className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg text-surface-500 md:hidden transition-colors"
            title="Close documents sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 py-2 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 shrink-0">
          <div className="flex p-1 bg-surface-200/60 dark:bg-surface-850 rounded-xl">
            <button
              onClick={() => setActiveLeftTab('docs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeLeftTab === 'docs'
                  ? 'bg-white dark:bg-surface-800 text-primary-500 shadow-sm'
                  : 'text-surface-550 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>เอกสาร ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('search')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeLeftTab === 'search'
                  ? 'bg-white dark:bg-surface-800 text-primary-500 shadow-sm'
                  : 'text-surface-550 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>ค้นหาเว็บ</span>
            </button>
          </div>
        </div>

        {/* Left Column Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeLeftTab === 'docs' ? (
            <div className="space-y-4 animate-fadeIn">
              <UploadZone />
              
              {/* Session Context Summary Card */}
              <div className="bg-gradient-to-br from-primary-500/5 to-indigo-500/5 border border-primary-500/10 dark:border-primary-500/5 rounded-2xl p-4 space-y-3 transition-all duration-300">
                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">
                  ภาพรวมแหล่งข้อมูลแชทนี้
                </h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/60 dark:bg-surface-900/30 p-2.5 rounded-xl border border-surface-150 dark:border-surface-800/50">
                    <span className="block text-base font-bold text-surface-900 dark:text-white">
                      {documents.length}
                    </span>
                    <span className="text-[9px] font-semibold text-surface-500 dark:text-surface-400 block mt-0.5 leading-none">
                      ไฟล์ PDF
                    </span>
                  </div>
                  <div className="bg-white/60 dark:bg-surface-900/30 p-2.5 rounded-xl border border-surface-150 dark:border-surface-800/50">
                    <span className="block text-base font-bold text-surface-900 dark:text-white">
                      {importedWebSources.length}
                    </span>
                    <span className="text-[9px] font-semibold text-surface-500 dark:text-surface-400 block mt-0.5 leading-none">
                      แหล่งข้อมูลเว็บ
                    </span>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between text-[10px] text-surface-500 dark:text-surface-400 border-t border-surface-200/50 dark:border-surface-800/50">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    RAG Engine Active
                  </span>
                  <span>
                    รวม {totalSizeMB.toFixed(2)} MB
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <WebSearchPreview />

              {/* Imported Web Sources Card */}
              {importedWebSources.length > 0 && (
                <div className="bg-white dark:bg-surface-900/40 border border-surface-200 dark:border-surface-800/80 rounded-2xl p-4 space-y-3 shadow-sm transition-all duration-300">
                  <div className="flex items-center justify-between text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary-500" />
                      แหล่งข้อมูลเว็บ ({importedWebSources.length})
                    </span>
                    <button 
                      onClick={() => setIsSourcesModalOpen(true)}
                      className="text-primary-500 hover:text-primary-600 font-semibold transition-colors text-xs"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {importedWebSources.slice(0, 3).map((item, index) => (
                      <div 
                        key={index}
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className="group flex items-center gap-2 p-2 rounded-xl bg-surface-50 dark:bg-surface-800/20 hover:bg-primary-500/5 hover:border-primary-500/20 border border-transparent cursor-pointer transition-all duration-200"
                      >
                        {getFaviconUrl(item.url) ? (
                          <img src={getFaviconUrl(item.url)} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                        ) : (
                          <Globe className="w-4 h-4 text-surface-400 shrink-0" />
                        )}
                        <span className="text-[11px] font-medium text-surface-700 dark:text-surface-300 truncate flex-1">
                          {item.source || item.title || item.url}
                        </span>
                        <ExternalLink className="w-3 h-3 text-surface-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================== CENTER COLUMN (Chat) ===================== */}
      <div
        className={`
          flex-1 flex flex-col bg-white dark:bg-surface-950 min-w-0
          ${isResizing ? '' : 'transition-all duration-500'}
          ${!rightPanelWidth ? (isKnowledgeExpanded ? 'md:w-2/5 xl:w-[40%]' : 'md:w-3/5 xl:w-[60%]') : ''}
        `}
      >
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-surface-950/50 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-500" />
            {t('normalChatTitle')}
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
                {t('normalEmptyChatTitle')}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 max-w-sm">
                {t('normalEmptyChatSubtitle')}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
                <div key={msg.id || i} id={`msg-${i}`} className="transition-all duration-300">
                  <ChatMessage
                    message={msg}
                    onThinkingToggle={(messageId) => toggleThinkingExpanded(messageId)}
                  />
                </div>
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
            <ChatInput onSend={sendMessage} isLoading={isLoading} placeholder={t('normalInputPlaceholder')} />
          </div>
        </div>
      </div>

      {/* ===================== RIGHT COLUMN (Knowledge Base) ===================== */}
      <div
        style={rightPanelWidth && isKnowledgeExpanded ? { width: `${rightPanelWidth}px`, flexShrink: 0 } : {}}
        className={`
          absolute md:relative inset-y-0 right-0 z-10
          flex flex-col bg-surface-50 dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800
          ${isResizing ? '' : 'transition-all duration-500'} w-80
          ${showMobileRight ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          ${!rightPanelWidth ? (isKnowledgeExpanded ? 'md:w-2/5 xl:w-[30%]' : 'md:w-1/5 xl:w-[20%]') : ''}
        `}
      >
        {/* Drag Handle */}
        {isKnowledgeExpanded && (
          <div
            onMouseDown={startResizingRight}
            className={`absolute left-0 top-0 bottom-0 w-1.5 -ml-[3px] cursor-col-resize z-20 hover:bg-primary-500 transition-colors ${isResizing ? 'bg-primary-500' : 'bg-transparent'}`}
          />
        )}

        <div className="p-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider pl-2">
            {t('normalKnowledgeBaseTitle')}
          </h2>
          <button
            onClick={() => setIsKnowledgeExpanded(!isKnowledgeExpanded)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors hidden md:block"
            title={isKnowledgeExpanded ? t('normalCollapsePanel') : t('normalExpandPanel')}
          >
            <PanelRight className={`w-4 h-4 transition-transform ${isKnowledgeExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {documents.length === 0 && importedWebSources.length === 0 ? (
            <div className="text-center mt-10">
              <PanelRight className="w-10 h-10 text-surface-300 dark:text-surface-700 mx-auto mb-3" />
              <p className="text-sm text-surface-500">{t('normalUploadToViewInsights')}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Quick Document List for Context (Always visible) */}
              {!isKnowledgeExpanded && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-surface-500 px-1">{t('normalClickDocForDetailSummary')}</p>
                  
                  {/* PDF files */}
                  {documents.map((doc, i) => (
                    <div
                      key={`pdf-${i}`}
                      onClick={() => setIsKnowledgeExpanded(true)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 hover:border-primary-400 cursor-pointer transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                          {doc.name}
                        </span>
                        <span className="block text-[10px] text-surface-400 mt-0.5">{t('normalTapForInsights')}</span>
                      </div>
                    </div>
                  ))}

                  {/* Web Sources */}
                  {importedWebSources.map((item, i) => (
                    <div
                      key={`web-${i}`}
                      onClick={() => setIsKnowledgeExpanded(true)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 hover:border-primary-400 cursor-pointer transition-colors shadow-sm"
                    >
                      {getFaviconUrl(item.url) ? (
                        <img src={getFaviconUrl(item.url)} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-primary-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                          {item.source || item.title || item.url}
                        </span>
                        <span className="block text-[10px] text-surface-400 mt-0.5">{t('normalTapForInsights')}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-surface-400 opacity-60 group-hover:opacity-100 transition-opacity" />
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

      {isSourcesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setIsSourcesModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-white dark:bg-surface-950">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200">
                {t('webImportedSourcesTitle')} ({webItems.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(false)}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {webItems.map((item) => (
                <div
                  key={item.key}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
                >
                  {item.favicon ? (
                    <img src={item.favicon} alt="" className="w-5 h-5 rounded-sm shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-5 h-5 rounded-sm bg-emerald-500/25 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate block">
                      {item.title}
                    </span>
                    <span className="text-xs text-surface-500 dark:text-surface-400 truncate block">
                      {item.subtitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={item.action}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default NormalLayout
