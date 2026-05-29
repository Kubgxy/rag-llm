import ReactMarkdown from 'react-markdown'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import SummarySection from './SummarySection'

export default function Summary() {
  const { summary } = useDocumentStore()
  const { t, lang } = useLanguageStore()

  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!summary) {
    return (
      <p className="text-sm text-surface-500 dark:text-surface-500 italic">
        {t('summaryNoData')}
      </p>
    )
  }

  // Support both old format (string) and new format (object with sections)
  const isOldFormat = typeof summary === 'string'

  if (isOldFormat) {
    // Fallback: render as plain markdown
    return (
      <div className="prose-chat text-surface-800 dark:text-surface-200 overflow-y-auto max-h-[calc(100vh-22rem)] pr-2">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    )
  }

  // New format: render sections
  const { sections = [], metadata = {} } = summary

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-15rem)] pr-2 p-4">
      {/* Metadata (word count + time) */}
      {metadata?.wordCount && (
        <div className="text-xs text-surface-500 dark:text-surface-400 mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
          📊 {tr('summaryWordCount', { count: metadata.wordCount })}
          {metadata.createdAt && (
            <span className="ml-2">• {formatTime(metadata.createdAt)}</span>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3 mt-2">
        {sections && sections.length > 0 ? (
          sections.map((section) => (
            <SummarySection key={section.id} section={section} />
          ))
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">
            {t('summaryNoHelpfulData')}
          </p>
        )}
      </div>
    </div>
  )
}
