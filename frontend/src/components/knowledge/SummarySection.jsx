import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown } from 'lucide-react'

/**
 * SummarySection - แสดง summary section แต่ละอันแบบกล่อง Dropdown/Collapsible ย่อขยายได้
 * รองรับ icon, title, content, styling
 * สามารถซ่อน think tags ได้
 */

// Utility: Remove think tags from content
function stripThinkingTags(content) {
  if (!content) return content
  // Remove <think>...</think> blocks (including newlines)
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export function SummarySection({ section, showThinking = false }) {
  if (!section) return null

  const {
    id,
    title,
    content,
    icon,
    type = 'overview',
    styling = {}
  } = section

  // Toggle state - closed (false) by default, but open if the summary is still generating
  const isGenerating = content && (content.includes('⏳') || content.includes('กำลังสรุป'))
  const [isExpanded, setIsExpanded] = useState(!!isGenerating)

  // Clean content by removing thinking tags (unless showThinking is enabled)
  const displayContent = showThinking ? content : stripThinkingTags(content)

  // Default styling based on type
  const getDefaultStyling = () => {
    switch (type) {
      case 'keypoint':
        return { 
          bgColor: 'bg-amber-50/50 dark:bg-amber-950/10', 
          borderColor: 'border-l-amber-400 hover:bg-amber-50/80 dark:hover:bg-amber-950/20' 
        }
      case 'conclusion':
        return { 
          bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/10', 
          borderColor: 'border-l-emerald-450 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20' 
        }
      default:
        return { 
          bgColor: 'bg-slate-50/50 dark:bg-slate-900/10', 
          borderColor: 'border-l-primary-500 hover:bg-slate-50/80 dark:hover:bg-slate-900/20' 
        }
    }
  }

  const defaultStyle = getDefaultStyling()
  const bgColor = styling.bgColor || defaultStyle.bgColor
  const borderColor = styling.borderColor || defaultStyle.borderColor

  return (
    <div
      className={`summary-section ${bgColor} ${borderColor} border-l-4 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm border border-surface-200/40 dark:border-surface-800/40 mb-3`}
    >
      {/* Clickable Header Dropdown Trigger */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="text-xl flex-shrink-0 leading-none">{icon}</span>
          )}
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm md:text-base truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center shrink-0 ml-4">
          <ChevronDown
            className={`w-5 h-5 text-surface-450 dark:text-surface-500 transition-all duration-300 ${
              isExpanded ? 'rotate-180 text-primary-500 dark:text-primary-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Collapsible Content Wrapper */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded 
            ? 'max-h-[1200px] opacity-100 border-t border-surface-200/30 dark:border-surface-800/30 p-4 pt-3' 
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Content (markdown) */}
        <div className="section-content prose-chat prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 ml-1">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default SummarySection
