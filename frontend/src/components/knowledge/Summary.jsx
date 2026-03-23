import ReactMarkdown from 'react-markdown'
import { useDocumentStore } from '../../stores/documentStore.js'
import SummarySection from './SummarySection'

/**
 * Utility: format timestamp
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Summary() {
  const { summary } = useDocumentStore()

  if (!summary) {
    return (
      <p className="text-sm text-surface-500 dark:text-surface-500 italic">
        ยังไม่มีข้อมูลสรุป กรุณาอัปโหลดเอกสารก่อน
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
    <div className="overflow-y-auto max-h-[calc(100vh-22rem)] pr-2 p-4">
      {/* Metadata (word count + time) */}
      {metadata?.wordCount && (
        <div className="text-xs text-surface-500 dark:text-surface-400 mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
          📊 {metadata.wordCount} คำ
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
            ไม่มีข้อมูลสรุปที่ช่วย
          </p>
        )}
      </div>
    </div>
  )
}
