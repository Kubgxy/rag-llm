import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, Brain } from 'lucide-react'

/**
 * ThinkingBlock - แสดง AI thinking process (Gemini/Copilot style)
 * สร้างได้ ขยาย/ย่อได้ โดยมี animation
 */
export function ThinkingBlock({ thinking, isExpanded, onToggle, messageId }) {
  if (!thinking) return null

  // ลบ <think> tags ออก
  const cleanedThinking = thinking
    .replace(/<think>/gi, '')
    .replace(/<\/think>/gi, '')
    .trim()

  // ดึงจำนวน tokens โดยประมาณ (word count)
  const tokenEstimate = cleanedThinking.split(/\s+/).length

  return (
    <div className="thinking-block mb-3 border-l-2 border-blue-400 dark:border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-all duration-200 font-medium text-sm group"
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 text-blue-600 dark:text-blue-400 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Brain size={18} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-blue-900 dark:text-blue-200 font-semibold">AI Thinking Process</span>
          <span className="text-[10px] px-2 py-0.5 bg-blue-200 dark:bg-blue-800/80 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            ~{tokenEstimate} tokens
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="thinking-content px-4 py-4 border-t border-blue-200 dark:border-blue-700 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-slate-800 dark:via-blue-900/10 dark:to-indigo-900/10">
          <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
            <ReactMarkdown
              components={{
                p: ({children}) => <p className="mb-3 italic text-blue-900/80 dark:text-blue-100/80">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
                li: ({children}) => <li className="text-blue-800/70 dark:text-blue-200/70">{children}</li>,
                strong: ({children}) => <strong className="font-semibold text-blue-950 dark:text-blue-100">{children}</strong>,
                em: ({children}) => <em className="italic text-blue-900 dark:text-blue-200">{children}</em>,
                code: ({children}) => <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200 font-mono text-xs">{children}</code>,
              }}
            >
              {cleanedThinking}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThinkingBlock
