import { AlertTriangle, X, Clock, Zap } from 'lucide-react'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function RuntimeWarningDialog({ 
  isOpen, 
  onClose, 
  onWait, 
  onForce, 
  activeRequests = 0,
  targetDevice = 'gpu' 
}) {
  const { t } = useLanguageStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
              มีการถามคำถามอยู่
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            ขณะนี้มี <span className="font-bold text-amber-600">{activeRequests}</span> คำถามที่กำลังรอคำตอบจาก AI อยู่
          </p>
          
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            การสลับ runtime เป็น <span className="font-semibold uppercase">{targetDevice}</span> อาจทำให้คำถามที่ค้างอยู่ถูกยกเลิก คุณต้องการ:
          </p>

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: Wait */}
            <button
              onClick={onWait}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 dark:text-white mb-1">
                  รอให้เสร็จก่อน (แนะนำ)
                </h4>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  ระบบจะรอให้ AI ตอบคำถามปัจจุบันเสร็จก่อน แล้วค่อยสลับ runtime (สูงสุด 2 นาที)
                </p>
              </div>
            </button>

            {/* Option 2: Force */}
            <button
              onClick={onForce}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 dark:text-white mb-1">
                  สลับทันที
                </h4>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  สลับ runtime ทันทีโดยไม่รอ คำถามที่ค้างอยู่อาจล้มเหลวและต้องถามใหม่
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}
