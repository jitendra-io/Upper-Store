import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global fetch interceptor to detect 503 Maintenance / Firebase Quota Exhaustion
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const res = await originalFetch(...args);
      if (res && res.status === 503) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data && (data.maintenance || data.code === 'QUOTA_EXCEEDED')) {
            window.dispatchEvent(new CustomEvent('upperMaintenanceMode', { detail: true }));
          }
        } catch (_) {}
      }
      return res;
    } catch (err) {
      throw err;
    }
  };
}

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
