import { useState } from 'react'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import { Sparkles, X, BarChart3, Presentation, Image, Waypoints, ChevronRight } from 'lucide-react'
import ActionDetailRenderer from './ActionDetailRenderer.jsx'

export default function ActionResults() {
  const { actionResults, selectedActionResultId, setSelectedActionResult } = useDocumentStore()
  const { t, lang } = useLanguageStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    if (actionType === 'diagram') return Waypoints
    if (actionType === 'chart') return BarChart3
    if (actionType === 'slides') return Presentation
    if (actionType === 'infographic') return Image
    return Sparkles
  }

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

  const handleOpenDetail = (itemId) => {
    setSelectedActionResult(itemId)
    setIsModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="space-y-2 overflow-y-auto  px-4">
        {actionResults.map((item) => {
          const isActive = selected && selected.id === item.id
          const Icon = getActionIcon(item.actionType)
          return (
            <button
              key={item.id}
              onClick={() => handleOpenDetail(item.id)}
              className={
                `w-full text-left px-3 py-2 rounded-lg border transition-colors ` +
                `${isActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300'
                }`
              }
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
              <div className="text-[11px] text-primary-600 dark:text-primary-400 mt-1">
                {t('knowledgeActionViewDetail')}
              </div>
            </button>
          )
        })}
      </div>

          {isModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl h-[85vh] bg-surface-50 dark:bg-surface-900 rounded-2xl shadow-xl flex flex-col overflow-hidden border border-surface-200 dark:border-surface-700">
            <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white dark:bg-surface-950">
              <div className="min-w-0 pr-4">
                    <h3 className="font-semibold text-surface-800 dark:text-surface-200 truncate inline-flex items-center gap-2">
                      <SelectedIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      {selected.title}
                    </h3>
                <p className="text-[11px] text-surface-500 mt-0.5 truncate">
                  {selected.modelName || '-'} • {formatTime(selected.createdAt)}
                </p>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
                aria-label={t('knowledgeActionClose')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-surface-100/60 dark:bg-surface-950 space-y-3">
              <ActionDetailRenderer actionType={selected.actionType} answer={selected.answer} />

              {Array.isArray(selected.citations) && selected.citations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.citations.map((cite, idx) => (
                    <span
                      key={`cite-${idx}`}
                      className="text-[11px] px-2 py-1 rounded-md bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                    >
                      {cite.file_name} ({t('citationPageLabel')} {cite.page_label})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
