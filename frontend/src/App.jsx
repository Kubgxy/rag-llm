import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import WorkspaceHome from './pages/WorkspaceHome.jsx'
import Workspace from './pages/Workspace.jsx'
import ModelArena from './pages/ModelArena.jsx'
import Settings from './pages/Settings.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/workspace" element={<WorkspaceHome />} />
          <Route path="/chat/:sessionId" element={<Workspace />} />
          <Route path="/arena" element={<ModelArena />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
