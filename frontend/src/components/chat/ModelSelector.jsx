import { ChevronDown } from 'lucide-react'
import { useChatStore, AVAILABLE_MODELS } from '../../stores/chatStore.js'

export default function ModelSelector() {
  const { selectedModel, setSelectedModel } = useChatStore()

  return (
    <div className="relative">
      <select
        id="model-selector"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="
          appearance-none w-full pl-4 pr-10 py-2.5 rounded-xl
          bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
          text-sm font-medium text-surface-800 dark:text-surface-200
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
          transition-all cursor-pointer
        "
      >
        {AVAILABLE_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
    </div>
  )
}
