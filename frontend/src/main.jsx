import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useThemeStore } from './stores/themeStore.js'

// Apply theme on initial load
const theme = useThemeStore.getState().theme
document.documentElement.classList.toggle('dark', theme === 'dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
