import { Outlet } from 'react-router-dom'
import { ToastProvider } from '../components/ui/Toast.jsx'

export default function MainLayout() {
  return (
    <ToastProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50">
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
