import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import { ToastProvider } from '../components/ui/Toast.jsx'

export default function MainLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
