import { useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Server, Zap } from 'lucide-react'
import { useRuntimeStore } from '../../stores/runtimeStore.js'

const STATUS_CONFIG = {
  idle: {
    icon: null,
    color: 'text-surface-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-surface-300',
  },
  switching: {
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-blue-500',
  },
  waiting_requests: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-amber-500',
  },
  shutting_down: {
    icon: Loader2,
    color: 'text-orange-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-orange-500',
  },
  restarting: {
    icon: Loader2,
    color: 'text-primary-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-primary-500',
  },
  ready: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-green-500',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-white dark:bg-surface-900',
    barColor: 'bg-red-500',
  },
}

// ขั้นตอนการ switch runtime พร้อมคำอธิบาย
const STEPS = [
  { 
    key: 'switching', 
    label: 'เริ่มสลับ Runtime',
    description: 'กำลังส่งคำสั่งไปยัง Backend...'
  },
  { 
    key: 'waiting_requests', 
    label: 'รอคำถามที่ค้างอยู่',
    description: 'รอให้ AI ตอบคำถามที่กำลังประมวลผลอยู่ให้เสร็จก่อน'
  },
  { 
    key: 'restarting', 
    label: 'โหลดโมเดลใหม่',
    description: 'กำลังโหลด AI Model บน Device ใหม่...'
  },
  { 
    key: 'ready', 
    label: 'สำเร็จ',
    description: 'พร้อมใช้งานแล้ว!'
  },
]

export default function RestartProgress({ onComplete }) {
  const { 
    restartStatus, 
    restartMessage, 
    restartProgress,
    activeRequests,
    resetRestartStatus,
  } = useRuntimeStore()

  useEffect(() => {
    if (restartStatus === 'ready') {
      // เรียก onComplete หลังจาก ready สักครู่
      const timer = setTimeout(() => {
        resetRestartStatus()
        onComplete?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [restartStatus, onComplete, resetRestartStatus])

  // ไม่แสดงถ้า status เป็น idle
  if (restartStatus === 'idle') {
    return null
  }

  const config = STATUS_CONFIG[restartStatus] || STATUS_CONFIG.switching
  const Icon = config.icon

  const getStatusText = () => {
    if (restartMessage) return restartMessage
    
    switch (restartStatus) {
      case 'switching':
        return 'กำลังเริ่มสลับ Runtime...'
      case 'waiting_requests':
        return activeRequests > 0 
          ? `รอให้ ${activeRequests} คำถามเสร็จก่อน...`
          : 'กำลังตรวจสอบ...'
      case 'shutting_down':
        return 'กำลังปิดระบบเดิม...'
      case 'restarting':
        return 'กำลังโหลดโมเดลใหม่...'
      case 'ready':
        return 'พร้อมใช้งาน!'
      default:
        return 'กำลังดำเนินการ...'
    }
  }

  // หา current step index
  const getCurrentStepIndex = () => {
    const idx = STEPS.findIndex(s => s.key === restartStatus)
    return idx >= 0 ? idx : 0
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`max-w-lg w-full mx-4 p-6 rounded-2xl shadow-2xl ${config.bgColor} border border-surface-200 dark:border-surface-700`}>
        
        {/* Header with Icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            restartStatus === 'ready' 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-primary-100 dark:bg-primary-900/30'
          }`}>
            {Icon && (
              <Icon className={`w-7 h-7 ${config.color} ${
                restartStatus === 'restarting' || 
                restartStatus === 'shutting_down' || 
                restartStatus === 'switching' 
                  ? 'animate-spin' 
                  : ''
              }`} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-white">
              {restartStatus === 'ready' ? '✅ สลับ Runtime สำเร็จ!' : '🔄 กำลังสลับ Runtime'}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
              ความคืบหน้า
            </span>
            <span className="text-sm font-bold text-surface-900 dark:text-white">
              {restartProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${config.barColor}`}
              style={{ width: `${restartProgress}%` }}
            />
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex || restartStatus === 'ready'
            const isCurrent = index === currentStepIndex && restartStatus !== 'ready'
            const isPending = index > currentStepIndex && restartStatus !== 'ready'

            return (
              <div 
                key={step.key}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  isCurrent 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' 
                    : isCompleted
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'bg-surface-50 dark:bg-surface-800/50 opacity-50'
                }`}
              >
                {/* Step Icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : isCurrent 
                      ? 'bg-primary-500' 
                      : 'bg-surface-300 dark:bg-surface-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <span className="text-xs text-white font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    isCompleted || isCurrent 
                      ? 'text-surface-900 dark:text-white' 
                      : 'text-surface-500 dark:text-surface-400'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs ${
                    isCurrent 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-surface-500 dark:text-surface-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Active Requests Warning */}
        {activeRequests > 0 && restartStatus === 'waiting_requests' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                มี {activeRequests} คำถามกำลังประมวลผล
              </p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-7">
              ระบบจะรอให้ AI ตอบเสร็จก่อนสลับ Runtime เพื่อไม่ให้คำตอบหาย
            </p>
          </div>
        )}

        {/* Success Message */}
        {restartStatus === 'ready' && (
          <div className="mt-4 p-3 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Runtime สลับเรียบร้อยแล้ว!
              </p>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-7">
              หน้าต่างนี้จะปิดโดยอัตโนมัติ...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
