import React from 'react'
import ReactMarkdown from 'react-markdown'

/**
 * SummarySection - แสดง summary section แต่ละอัน
 * รองรับ icon, title, content, styling
 */
export function SummarySection({ section }) {
  if (!section) return null

  const {
    id,
    title,
    content,
    icon,
    type = 'overview',
    styling = {}
  } = section

  // Default styling based on type
  const getDefaultStyling = () => {
    switch (type) {
      case 'keypoint':
        return { bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-l-amber-400' }
      case 'conclusion':
        return { bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-l-green-400' }
      default:
        return { bgColor: 'bg-slate-50 dark:bg-slate-900/20', borderColor: 'border-l-slate-400' }
    }
  }

  const defaultStyle = getDefaultStyling()
  const bgColor = styling.bgColor || defaultStyle.bgColor
  const borderColor = styling.borderColor || defaultStyle.borderColor

  return (
    <div
      className={`summary-section ${bgColor} ${borderColor} border-l-4 rounded-lg p-4 mb-4 transition-all hover:shadow-md`}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-3 mb-2">
        {icon && (
          <span className="text-2xl flex-shrink-0">{icon}</span>
        )}
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
          {title}
        </h3>
      </div>

      {/* Content (markdown) */}
      <div className="section-content prose-chat prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 ml-11">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

export default SummarySection
