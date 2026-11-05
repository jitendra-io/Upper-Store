import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Security notice: Warn against DevTools tampering and Self-XSS attacks
if (import.meta.env.PROD) {
  console.warn(
    '%cSTOP!',
    'color: #ef4444; font-size: 40px; font-weight: 900; -webkit-text-stroke: 1px black;'
  );
  console.info(
    '%cThis browser feature is intended for developers. Pasting code here or attempting to inspect tokens will not grant administrative access and may compromise your account.',
    'color: #d4af37; font-size: 13px; font-weight: 600;'
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
