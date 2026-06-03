import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore.js'
import { useEffect, useState } from 'react'

export default function ProtectedRoute() {
  const { isAuthenticated, accessToken, hydrate } = useAuthStore()
  const location = useLocation()
  const [isHydrating, setIsHydrating] = useState(true)

  useEffect(() => {
    const doHydrate = async () => {
      if (accessToken && !isAuthenticated) {
        await hydrate()
      }
      setIsHydrating(false)
    }
    doHydrate()
  }, [])

  if (isHydrating && accessToken) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">
            กำลังตรวจสอบสิทธิ์...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <Outlet />
}
