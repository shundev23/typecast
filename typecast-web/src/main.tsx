import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
          className: 'typecast-toast',
          style: {
            background: 'var(--color-typecast-surface)',
            color: 'var(--color-typecast-text)',
            border: '1px solid var(--color-typecast-border)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: 'var(--color-typecast-accent)', secondary: 'transparent' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'transparent' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
