import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import Summary from './Summary.jsx'
import Mindmap from './Mindmap.jsx'
import { FileText, GitBranch } from 'lucide-react'

export default function KnowledgeTabs() {
  const { activeTab, setActiveTab, summary, mindmapNodes } = useDocumentStore()
  const { t } = useLanguageStore()
  const TABS = [
    { id: 'summary', label: t('knowledgeTabSummary'), icon: FileText },
    { id: 'mindmap', label: t('knowledgeTabMindmap'), icon: GitBranch },
  ]

  const hasContent = summary || mindmapNodes.length > 0

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
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
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

      {/* Tab content */}
      <div className="flex-1 mt-4 min-h-0">
        {activeTab === 'summary' ? <Summary /> : <Mindmap />}
      </div>
    </div>
  )
}
