import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore.js'
import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

export default function UserProfileMenu() {
  const { user, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const initials = (user.display_name || user.username || '?')
    .charAt(0)
    .toUpperCase()

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/auth')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 group"
        aria-label="User menu"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name || user.username}
            className="w-8 h-8 rounded-lg object-cover ring-2 ring-primary-200 dark:ring-primary-800"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-primary-200 dark:ring-primary-800 group-hover:ring-primary-300 dark:group-hover:ring-primary-700 transition-all">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300 hidden sm:block max-w-[100px] truncate">
          {user.display_name || user.username}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-surface-900/10 dark:shadow-black/30 border border-surface-200/60 dark:border-surface-700/60 py-2 z-50 animate-in-dropdown">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                  {user.display_name || user.username}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                {user.role}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { navigate('/settings'); setIsOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-surface-400" />
              ตั้งค่า
            </button>
            <div className="mx-3 my-1 border-t border-surface-100 dark:border-surface-800" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
