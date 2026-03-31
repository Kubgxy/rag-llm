import { useEffect, useState } from 'react'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useToast } from '../ui/Toast.jsx'
import { generateKnowledgeAction } from '../../services/api.js'
import Summary from './Summary.jsx'
import ActionResults from './ActionResults.jsx'
import { FileText, GitBranch, Sparkles, BarChart3, Presentation, Image } from 'lucide-react'

export default function KnowledgeTabs() {
  const { activeTab, setActiveTab, summary, actionResults, addActionResult } = useDocumentStore()
  const { t, lang } = useLanguageStore()
  const { addToast } = useToast()
  const [actionLoading, setActionLoading] = useState(null)

  // Handle persisted legacy tab value after mindmap tab removal.
  useEffect(() => {
    if (activeTab === 'mindmap') {
      setActiveTab('actions')
    }
  }, [activeTab, setActiveTab])

  const ACTIONS = [
    {
      id: 'mindmap',
      label: t('knowledgeActionMindmap'),
      promptLabel: t('knowledgeActionPromptMindmap'),
      icon: GitBranch,
    },
    {
      id: 'chart',
      label: t('knowledgeActionChart'),
      promptLabel: t('knowledgeActionPromptChart'),
      icon: BarChart3,
    },
    {
      id: 'slides',
      label: t('knowledgeActionSlides'),
      promptLabel: t('knowledgeActionPromptSlides'),
      icon: Presentation,
    },
    {
      id: 'infographic',
      label: t('knowledgeActionInfographic'),
      promptLabel: t('knowledgeActionPromptInfographic'),
      icon: Image,
    },
  ]

  const handleActionClick = async (action) => {
    if (actionLoading) return

    const sessionId = useSessionStore.getState().getSessionId()
    if (!sessionId) {
      addToast(t('knowledgeActionSessionMissing'), 'error')
      return
    }

    setActionLoading(action.id)

    try {
      const data = await generateKnowledgeAction(action.id, sessionId, {
        language: lang,
      })

      addActionResult({
        actionType: action.id,
        title: action.label,
        answer: data.answer,
        modelName: data.model_name,
        citations: data.citations || [],
        createdAt: Date.now(),
      })

      setActiveTab('actions')
      addToast(t('knowledgeActionSuccess'), 'success')
    } catch (err) {
      addToast(err.message || t('knowledgeActionFailed'), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const TABS = [
    { id: 'summary', label: t('knowledgeTabSummary'), icon: FileText },
    { id: 'actions', label: t('knowledgeTabActions'), icon: Sparkles },
  ]

  const hasContent = summary || actionResults.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-500">
          {t('knowledgeEmptyTitle')}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          {t('knowledgeEmptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl ">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium transition-all duration-200
              ${activeTab === id
                ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* One-click actions (show only in Actions tab) */}
      {activeTab === 'actions' && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-2 px-1">
            {t('knowledgeActionTitle')}
          </p>
          <div className="grid grid-cols-2 gap-2 px-4 mb-2">
            {ACTIONS.map((action) => {
              const isBusy = actionLoading === action.id
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={Boolean(actionLoading)}
                  className={
                    `px-3 py-2 rounded-lg text-xs font-medium border transition-all ` +
                    `${isBusy
                      ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                      : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-sm'
                    } ` +
                    `${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {isBusy ? t('knowledgeActionGenerating') : action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 mt-4 min-h-0">
        {activeTab === 'summary' && <Summary />}
        {activeTab === 'actions' && <ActionResults />}
      </div>
    </div>
  )
}
