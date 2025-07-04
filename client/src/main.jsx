import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Tambahkan redirect ke home saat reload
if (window.location.pathname !== '/') {
  window.history.replaceState({}, '', '/');
}
