import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, Brain } from 'lucide-react'

/**
 * ThinkingBlock - แสดง AI thinking process (Gemini/Copilot style)
 * สร้างได้ ขยาย/ย่อได้ โดยมี animation
 */
export function ThinkingBlock({ thinking, isExpanded, onToggle, messageId }) {
  if (!thinking) return null

  // ดึงจำนวน tokens โดยประมาณ (word count)
  const tokenEstimate = thinking.split(/\s+/).length

  return (
    <div className="thinking-block mb-3 border-l-2 border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium text-sm"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={18}
            className={`transition-transform text-blue-600 dark:text-blue-400 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Brain size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-blue-900 dark:text-blue-200">AI Thinking Process</span>
          <span className="text-xs px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full">
            ~{tokenEstimate} tokens
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="thinking-content px-4 py-3 border-t border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800">
          <div className="prose-chat prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown>{thinking}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThinkingBlock
