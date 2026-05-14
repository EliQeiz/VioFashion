// src/components/ui/Toast.jsx
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext()

const ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

const BG = {
  success: 'rgba(5,150,105,0.12)',
  error: 'rgba(248,113,113,0.1)',
  info: 'rgba(59,130,246,0.1)',
  warning: 'rgba(201,168,76,0.1)',
}

const BORDER = {
  success: 'rgba(52,211,153,0.25)',
  error: 'rgba(248,113,113,0.25)',
  info: 'rgba(59,130,246,0.25)',
  warning: 'rgba(201,168,76,0.25)',
}

const COLOR = {
  success: '#6EE7B7',
  error: '#FCA5A5',
  info: '#93C5FD',
  warning: '#E8C87A',
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId
    setToasts(p => [...p, { id, message, type, entering: true }])

    // Remove entering state
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, entering: false } : t))
    }, 50)

    // Auto dismiss
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => {
        setToasts(p => p.filter(t => t.id !== id))
      }, 300)
    }, duration)

    return id
  }, [])

  const toast = useCallback({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  }, [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none', maxWidth: 400, width: '90%',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 14,
            background: BG[t.type],
            border: `1px solid ${BORDER[t.type]}`,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            transform: t.entering ? 'translateY(-20px)' : t.leaving ? 'translateY(-20px)' : 'translateY(0)',
            opacity: (t.entering || t.leaving) ? 0 : 1,
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'auto',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[t.type]}</span>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 500,
              color: COLOR[t.type], lineHeight: 1.4,
            }}>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Return no-op if outside provider (prevents crashes)
    return { success: () => {}, error: () => {}, info: () => {}, warning: () => {} }
  }
  return ctx
}