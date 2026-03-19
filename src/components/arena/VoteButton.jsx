import { ThumbsUp, ThumbsDown } from 'lucide-react'

export default function VoteButton({ currentVote, onVote }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVote(currentVote === 'up' ? null : 'up')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-200
          ${currentVote === 'up'
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'text-surface-400 hover:text-emerald-500 hover:bg-emerald-500/10'
          }
        `}
        id="vote-up-button"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        ดีกว่า
      </button>
      <button
        onClick={() => onVote(currentVote === 'down' ? null : 'down')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-200
          ${currentVote === 'down'
            ? 'bg-red-500/20 text-red-600 dark:text-red-400'
            : 'text-surface-400 hover:text-red-500 hover:bg-red-500/10'
          }
        `}
        id="vote-down-button"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        แย่กว่า
      </button>
    </div>
  )
}
