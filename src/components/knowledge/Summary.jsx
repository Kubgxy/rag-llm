import ReactMarkdown from 'react-markdown'
import { useDocumentStore } from '../../stores/documentStore.js'

export default function Summary() {
  const { summary } = useDocumentStore()

  if (!summary) {
    return (
      <p className="text-sm text-surface-500 dark:text-surface-500 italic">
        ยังไม่มีข้อมูลสรุป กรุณาอัปโหลดเอกสารก่อน
      </p>
    )
  }

  return (
    <div className="prose-chat text-surface-800 dark:text-surface-200 overflow-y-auto max-h-[calc(100vh-22rem)] pr-2">
      <ReactMarkdown>{summary}</ReactMarkdown>
    </div>
  )
}
