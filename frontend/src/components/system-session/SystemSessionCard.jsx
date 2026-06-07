import React from 'react'
import * as Icons from 'lucide-react'
import SyncStatusBadge from './SyncStatusBadge.jsx'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function SystemSessionCard({ session, onSelect, isOpening = false }) {
  const { lang } = useLanguageStore()
  const isThai = lang === 'th'

  // ดึง Dynamic Icon จาก Lucide React
  const getIconComponent = (iconName) => {
    // แปลงชื่อไอคอน เช่น 'users' -> 'Users', 'building' -> 'Building'
    if (!iconName) return Icons.MessageSquare
    const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1)
    const IconComp = Icons[formattedName] || Icons[iconName.toUpperCase()] || Icons.MessageSquare
    return IconComp
  }

  const Icon = getIconComponent(session.icon)

  return (
    <div
      onClick={() => {
        if (!isOpening) onSelect(session.id)
      }}
      className={`group relative flex flex-col bg-white/80 dark:bg-surface-900/80 backdrop-blur-md rounded-3xl p-6 border border-surface-200/60 dark:border-surface-800/60 shadow-md hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 hover:border-emerald-300/60 dark:hover:border-emerald-800/60 transition-all duration-300 overflow-hidden hover:-translate-y-1 active:translate-y-0 select-none cursor-pointer ${
        isOpening ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Top Emerald Gradient highlight on hover */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Subtle radial emerald background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-100/0 dark:from-emerald-950/0 dark:to-emerald-900/0 group-hover:from-emerald-50/20 group-hover:to-emerald-100/10 dark:group-hover:from-emerald-950/10 dark:group-hover:to-emerald-900/5 transition-all duration-300 rounded-3xl" />

      {/* Main Content */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-950/30 dark:to-emerald-900/20 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300 ring-2 ring-emerald-200/50 dark:ring-emerald-800/20">
          <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        
        {/* Action Badge */}
        <span className="text-xs font-bold px-2.5 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
          {isOpening ? (isThai ? 'กำลังเปิด...' : 'Opening...') : (isThai ? 'เข้าใช้ระบบ' : 'Open')}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col mb-4">
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors duration-300">
          {session.name}
        </h3>
        <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2 leading-relaxed">
          {session.description}
        </p>
      </div>

      {/* Footer Info with Sync Status */}
      <div className="relative z-10 mt-auto pt-4 border-t border-surface-100 dark:border-surface-800/50 group-hover:border-emerald-200 dark:group-hover:border-emerald-900/50 transition-colors duration-300">
        <SyncStatusBadge status={session.sync_status} lastSyncedAt={session.last_synced_at} />
      </div>
    </div>
  )
}
