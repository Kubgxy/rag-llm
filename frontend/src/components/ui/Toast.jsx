import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    base: 'bg-white dark:bg-surface-900 border-l-4 border-l-emerald-500 shadow-xl shadow-emerald-500/10',
    iconColor: 'text-emerald-500',
    progress: 'bg-emerald-500'
  },
  error: {
    icon: AlertCircle,
    base: 'bg-white dark:bg-surface-900 border-l-4 border-l-red-500 shadow-xl shadow-red-500/10',
    iconColor: 'text-red-500',
    progress: 'bg-red-500'
  },
  warning: {
    icon: AlertTriangle,
    base: 'bg-white dark:bg-surface-900 border-l-4 border-l-amber-500 shadow-xl shadow-amber-500/10',
    iconColor: 'text-amber-500',
    progress: 'bg-amber-500'
  },
  info: {
    icon: Info,
    base: 'bg-white dark:bg-surface-900 border-l-4 border-l-blue-500 shadow-xl shadow-blue-500/10',
    iconColor: 'text-blue-500',
    progress: 'bg-blue-500'
  },
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, duration, exiting: false }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 300)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 sm:top-6 sm:bottom-auto sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
          const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info
          const Icon = config.icon

          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-xl 
                border border-surface-200 dark:border-surface-700 min-w-[320px] max-w-[420px]
                transition-all duration-300 ease-out transform
                ${config.base}
                ${toast.exiting 
                  ? 'opacity-0 translate-x-full sm:translate-x-12 scale-95' 
                  : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right sm:slide-in-from-top-4'}
              `}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 flex flex-col pt-0.5">
                <span className="text-sm font-medium text-surface-800 dark:text-surface-100">
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {toast.duration > 0 && (
                <div 
                  className={`absolute bottom-0 left-0 h-1 bg-opacity-20 flex`}
                  style={{ width: '100%', backgroundColor: 'transparent' }}
                >
                  <div 
                    className={`h-full ${config.progress}`} 
                    style={{ 
                      width: '100%', 
                      animation: `shrink ${toast.duration}ms linear forwards` 
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { addToast: () => {} }
  }
  return ctx
}
