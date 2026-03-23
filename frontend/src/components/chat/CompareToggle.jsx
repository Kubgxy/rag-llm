import React from 'react'
import { GitCompare } from 'lucide-react'

/**
 * CompareToggle - Toggle button สำหรับ switch between Normal / Compare mode
 */
export function CompareToggle({ isCompareMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`compare-toggle px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
        isCompareMode
          ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
      }`}
      title={isCompareMode ? 'Switch to Normal mode' : 'Switch to Compare mode'}
    >
      <GitCompare size={18} />
      <span>{isCompareMode ? 'Compare Mode' : 'Normal'}</span>
    </button>
  )
}

export default CompareToggle
