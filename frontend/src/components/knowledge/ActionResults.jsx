import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import { Sparkles, X, BarChart3, Presentation, Image, GitBranch, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import ActionDetailRenderer from './ActionDetailRenderer.jsx'

export default function ActionResults() {
  const { actionResults, selectedActionResultId, setSelectedActionResult } = useDocumentStore()
  const { t, lang } = useLanguageStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const selected = actionResults.find((item) => item.id === selectedActionResultId) || actionResults[0]

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionIcon = (actionType) => {
    if (actionType === 'mindmap') return GitBranch
    if (actionType === 'chart') return BarChart3
    if (actionType === 'slides') return Presentation
    if (actionType === 'infographic') return Image
    return Sparkles
  }

  const getActionLabel = (actionType) => {
    if (actionType === 'mindmap') return t('knowledgeActionMindmap')
    if (actionType === 'chart') return t('knowledgeActionChart')
    if (actionType === 'slides') return t('knowledgeActionSlides')
    if (actionType === 'infographic') return t('knowledgeActionInfographic')
    return actionType
  }

  useEffect(() => {
    if (!isModalOpen) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isModalOpen])

  useEffect(() => {
    if (!isModalOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isModalOpen])

  const SelectedIcon = selected ? getActionIcon(selected.actionType) : Sparkles

  if (!actionResults.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-surface-400" />
        </div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          {t('knowledgeActionNoResultsTitle')}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          {t('knowledgeActionNoResultsSubtitle')}
        </p>
      </div>
    )
  }

  const handleOpenDetail = (itemId, fullscreen = false) => {
    setSelectedActionResult(itemId)
    setIsFullscreen(fullscreen)
    setIsModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsModalOpen(false)
    setIsFullscreen(false)
  }

  const modalContent = isModalOpen && selected ? (
    <div
      className={
        `fixed inset-0 z-[2000] flex items-center justify-center bg-surface-950/70 backdrop-blur-md transition-all duration-300 ` +
        `${isFullscreen ? 'p-0' : 'p-4'}`
      }
      onClick={handleCloseDetail}
    >
      <div
        className={
          `relative w-full flex flex-col overflow-hidden border transition-all duration-300 ` +
          `${isFullscreen
            ? 'h-full max-w-none rounded-none border-surface-700/50 bg-surface-50 dark:bg-surface-900'
            : 'max-w-7xl h-[94vh] rounded-2xl border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 shadow-2xl'
          }`    
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.12),transparent_36%),radial-gradient(circle_at_10%_85%,rgba(99,102,241,0.10),transparent_32%)]" />

        {/* Header */}
        <div className="relative px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white/90 dark:bg-surface-950/95 backdrop-blur-sm z-10">
          <div className="min-w-0 pr-4">
            <div className="inline-flex items-center gap-2 min-w-0">
              <SelectedIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
              <h3 className="font-semibold text-surface-800 dark:text-surface-200 truncate">
                {selected.title}
              </h3>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200/70 dark:border-primary-700/50">
                {getActionLabel(selected.actionType)}
              </span>
            </div>
            <p className="text-[11px] text-surface-500 mt-0.5 truncate">
              {selected.modelName || '-'} • {formatTime(selected.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label={isFullscreen ? t('knowledgeActionExitFullscreen') : t('knowledgeActionEnterFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {isFullscreen ? t('knowledgeActionExitFullscreen') : t('knowledgeActionEnterFullscreen')}
              </span>
            </button> */}

            <button
              onClick={handleCloseDetail}
              className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
              aria-label={t('knowledgeActionClose')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className={
            `relative flex-1 bg-surface-100/70 dark:bg-surface-950 flex flex-col w-full ` +
            // 🌟 จุดสำคัญ: ถ้าเป็น Fullscreen ให้ overflow-hidden (ปิดสกรอลล์) และจัดให้อยู่ตรงกลาง
            `${isFullscreen 
              ? 'overflow-hidden items-center justify-center p-4' 
              : 'overflow-y-auto p-4 space-y-3'}`
          }
        >
          {/* หุ้ม Component เพื่อให้มันใช้พื้นที่เต็มที่แต่ไม่เกินขอบจอในโหมด Fullscreen */}
          <div className={`w-full ${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
            <ActionDetailRenderer actionType={selected.actionType} answer={selected.answer} />
          </div>

          {Array.isArray(selected.citations) && selected.citations.length > 0 && !isFullscreen && (
            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-800/80 w-full shrink-0">
              <h4 className="text-xs font-bold text-surface-600 dark:text-surface-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                {lang === 'th' ? '📌 แหล่งอ้างอิงที่ใช้' : '📌 Sources & References'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {selected.citations.map((cite, idx) => {
                  const isWeb = cite.source_type === 'web' || cite.url;
                  return (
                    <a
                      key={`cite-${idx}`}
                      href={isWeb ? cite.url : undefined}
                      target={isWeb ? "_blank" : undefined}
                      rel={isWeb ? "noopener noreferrer" : undefined}
                      className={
                        `inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ` +
                        `${isWeb 
                          ? 'border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 hover:border-sky-300' 
                          : 'border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-800/60 text-surface-700 dark:text-surface-300'
                        }`
                      }
                      title={cite.text_snippet || undefined}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span className="max-w-[200px] truncate font-medium">{cite.file_name || cite.url}</span>
                      {!isWeb && cite.page_label && (
                        <span className="text-[10px] opacity-75">
                          ({t('citationPageLabel')} {cite.page_label})
                        </span>
                      )}
                      {isWeb && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-sky-200/50 dark:bg-sky-900/60 rounded shrink-0">
                          Web
                        </span>
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="space-y-2 overflow-y-auto px-4">
        {actionResults.map((item) => {
          const isActive = selected && selected.id === item.id
          const Icon = getActionIcon(item.actionType)
          return (
            <div
              key={item.id}
              className={
                `w-full text-left px-3 py-2 rounded-lg border transition-colors ` +
                `${isActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300'
                }`
              }
            >
              <button
                onClick={() => handleOpenDetail(item.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/40 inline-flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                    </span>
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 truncate">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                </div>
                <div className="text-[11px] text-surface-500 mt-0.5">
                  {formatTime(item.createdAt)}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {modalContent && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
    </div>
  )
}