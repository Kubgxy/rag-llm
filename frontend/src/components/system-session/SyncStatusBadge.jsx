import React from 'react'
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function SyncStatusBadge({ status, lastSyncedAt }) {
  const { lang } = useLanguageStore()

  const isThai = lang === 'th'

  const formatDateTime = (isoString) => {
    if (!isoString) return isThai ? 'ยังไม่มีข้อมูล' : 'No data'
    const date = new Date(isoString)
    return date.toLocaleString(isThai ? 'th-TH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // กำหนดสไตล์และข้อความตามสถานะการซิงค์
  let statusText = isThai ? 'เชื่อมต่อแล้ว' : 'Synced'
  let statusColorClass = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
  let Icon = CheckCircle2
  let isSpinning = false

  if (status === 'syncing') {
    statusText = isThai ? 'กำลังประสานข้อมูล...' : 'Syncing...'
    statusColorClass = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
    Icon = RefreshCw
    isSpinning = true
  } else if (status === 'error') {
    statusText = isThai ? 'การเชื่อมต่อผิดพลาด' : 'Sync Error'
    statusColorClass = 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
    Icon = AlertCircle
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 select-none">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-300 ${statusColorClass}`}>
        <Icon className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
        <span>{statusText}</span>
      </div>
      
      {lastSyncedAt && (
        <span className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1 font-medium">
          <span>{isThai ? 'อัปเดตล่าสุด:' : 'Last Synced:'}</span>
          <span className="text-surface-700 dark:text-surface-300 font-semibold">
            {formatDateTime(lastSyncedAt)}
          </span>
        </span>
      )}
    </div>
  )
}
