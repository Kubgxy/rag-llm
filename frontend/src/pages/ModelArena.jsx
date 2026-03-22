import { ChevronDown, Swords } from 'lucide-react'
import { useChatStore, AVAILABLE_MODELS } from '../stores/chatStore.js'
import ArenaChat from '../components/arena/ArenaChat.jsx'
import ChatInput from '../components/chat/ChatInput.jsx'
import { useArenaChat } from '../hooks/useChat.js'

export default function ModelArena() {
  const {
    arenaModelA,
    arenaModelB,
    setArenaModelA,
    setArenaModelB,
  } = useChatStore()

  const { arenaMessages, isArenaLoading, sendArenaMessage, setArenaVote } = useArenaChat()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary-500" />
            <h1 className="text-xl font-bold text-surface-900 dark:text-white">
              สนามประลองโมเดล
            </h1>
          </div>
          <p className="text-sm text-surface-500 mt-0.5">
            เปรียบเทียบ AI สองโมเดลกับคำถามเดียวกัน
          </p>
        </div>

        {/* Model selectors */}
        <div className="flex items-center gap-3">
          {/* Model A */}
          <div className="flex-1 sm:w-44">
            <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 block">
              โมเดล A
            </label>
            <div className="relative">
              <select
                id="arena-model-a"
                value={arenaModelA}
                onChange={(e) => setArenaModelA(e.target.value)}
                className="
                  appearance-none w-full pl-4 pr-10 py-2.5 rounded-xl
                  bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/30
                  text-sm font-medium text-surface-800 dark:text-surface-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-all cursor-pointer
                "
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
            </div>
          </div>

          <span className="text-surface-400 font-bold text-lg mt-5">VS</span>

          {/* Model B */}
          <div className="flex-1 sm:w-44">
            <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 block">
              โมเดล B
            </label>
            <div className="relative">
              <select
                id="arena-model-b"
                value={arenaModelB}
                onChange={(e) => setArenaModelB(e.target.value)}
                className="
                  appearance-none w-full pl-4 pr-10 py-2.5 rounded-xl
                  bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30
                  text-sm font-medium text-surface-800 dark:text-surface-200
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                  transition-all cursor-pointer
                "
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          <ArenaChat arenaMessages={arenaMessages} onVote={setArenaVote} />
        </div>

        {/* Shared input */}
        <div className="px-5 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50">
          <ChatInput
            onSend={sendArenaMessage}
            isLoading={isArenaLoading}
            placeholder="ถามคำถามเดียวกันกับทั้งสองโมเดล..."
          />
        </div>
      </div>
    </div>
  )
}
