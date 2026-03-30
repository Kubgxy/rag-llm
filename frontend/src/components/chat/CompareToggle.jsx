import React from 'react'
import { GitCompare } from 'lucide-react'
import { useLanguageStore } from '../../stores/languageStore.js'

/**
 * CompareToggle - Toggle button สำหรับ switch between Normal / Compare mode
 */
export function CompareToggle({ isCompareMode, onToggle }) {
  const { t } = useLanguageStore()
  return (
    <button
      onClick={() => onToggle(!isCompareMode)}
      className={`compare-toggle flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-xs transition-all ${
        isCompareMode
          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
          : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200 shadow-md'
      }`}
      title={isCompareMode ? t('compareToggleToNormal') : t('compareToggleToCompare')}
    >
      <GitCompare size={16} strokeWidth={2.5} />
      <span>{isCompareMode ? t('compareToggleCompare') : t('compareToggleNormal')}</span>
    </button>
  )
}

export default CompareToggle
