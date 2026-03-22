import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
import { ToastProvider } from '../components/ui/Toast.jsx'

export default function MainLayout() {
  return (
    <ToastProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex min-h-0">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 h-full bg-surface-50 dark:bg-surface-950">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
