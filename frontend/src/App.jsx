import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Workspace from './pages/Workspace.jsx'
import ModelArena from './pages/ModelArena.jsx'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat/:sessionId" element={<Workspace />} />
        <Route path="/arena" element={<ModelArena />} />
      </Route>
    </Routes>
  )
}

export default App
