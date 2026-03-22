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
    <div className="max-w-6xl mx-auto px-6 py-8 h-full flex flex-col w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
               <Swords className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
              สนามประลองโมเดล
            </h1>
          </div>
          <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm ml-[52px]">
            เปรียบเทียบ AI สองโมเดลกับคำถามเดียวกันเพื่อหาคำตอบที่ดีที่สุด
          </p>
        </div>

        {/* Model selectors */}
        <div className="flex items-center gap-4 bg-white dark:bg-surface-900/50 p-2.5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
          {/* Model A */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 block px-1">
              โมเดล A
            </label>
            <div className="relative">
              <select
                id="arena-model-a"
                value={arenaModelA}
                onChange={(e) => setArenaModelA(e.target.value)}
                className="
                  appearance-none w-full pl-3 pr-9 py-2 rounded-xl
                  bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20
                  text-sm font-medium text-blue-900 dark:text-blue-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500/40
                  transition-all cursor-pointer
                "
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/70 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-1 pt-4">
             <span className="text-surface-300 dark:text-surface-600 font-black text-sm italic">VS</span>
          </div>

          {/* Model B */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 block px-1">
              โมเดล B
            </label>
            <div className="relative">
              <select
                id="arena-model-b"
                value={arenaModelB}
                onChange={(e) => setArenaModelB(e.target.value)}
                className="
                  appearance-none w-full pl-3 pr-9 py-2 rounded-xl
                  bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20
                  text-sm font-medium text-emerald-900 dark:text-emerald-100
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                  transition-all cursor-pointer
                "
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/70 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <ArenaChat arenaMessages={arenaMessages} onVote={setArenaVote} />
        </div>

        {/* Shared input */}
        <div className="px-6 py-5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50 shrink-0">
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
