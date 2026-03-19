import ReactMarkdown from 'react-markdown'
import { Bot, User } from 'lucide-react'

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
          ${isUser
            ? 'bg-primary-500 text-white'
            : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-primary-500 text-white rounded-tr-md'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-md border border-surface-200 dark:border-surface-700'
          }
        `}
      >
        {isUser ? (
          <p>{content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
