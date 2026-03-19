import ReactMarkdown from 'react-markdown'
import { Bot, User } from 'lucide-react'
import VoteButton from './VoteButton.jsx'

export default function ArenaChat({ arenaMessages, onVote }) {
  if (arenaMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4">
            <span className="text-3xl">⚔️</span>
          </div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-500">
            Select two models and start a battle!
          </p>
          <p className="text-xs text-surface-400 mt-1">
            Both models will answer your question side by side
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
      {arenaMessages.map((msg, i) => {
        if (msg.role === 'user') {
          return (
            <div key={i} className="flex justify-center">
              <div className="flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-2xl text-sm max-w-lg">
                <User className="w-4 h-4 shrink-0" />
                <span>{msg.content}</span>
              </div>
            </div>
          )
        }

        if (msg.role === 'arena-response') {
          return (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Model A Response */}
              <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-500/10 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Model A
                  </span>
                </div>
                <div className="p-4 prose-chat text-sm text-surface-800 dark:text-surface-200">
                  <ReactMarkdown>{msg.responseA}</ReactMarkdown>
                </div>
                <div className="px-4 py-2.5 border-t border-surface-200 dark:border-surface-700">
                  <VoteButton
                    currentVote={msg.votes?.a}
                    onVote={(vote) => onVote(i, 'a', vote)}
                  />
                </div>
              </div>

              {/* Model B Response */}
              <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Model B
                  </span>
                </div>
                <div className="p-4 prose-chat text-sm text-surface-800 dark:text-surface-200">
                  <ReactMarkdown>{msg.responseB}</ReactMarkdown>
                </div>
                <div className="px-4 py-2.5 border-t border-surface-200 dark:border-surface-700">
                  <VoteButton
                    currentVote={msg.votes?.b}
                    onVote={(vote) => onVote(i, 'b', vote)}
                  />
                </div>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
