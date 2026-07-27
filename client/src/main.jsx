import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyMode, getStoredMode } from './theme-mode'

// Apply the saved (or OS-preferred) dark/light mode before first paint.
applyMode(getStoredMode())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
