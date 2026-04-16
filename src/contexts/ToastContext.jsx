import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const COLORS = {
  success: { bg: '#10b981', text: '#fff', icon: '✓' },
  error:   { bg: '#ef4444', text: '#fff', icon: '×' },
  info:    { bg: '#6366f1', text: '#fff', icon: 'ℹ' },
  warn:    { bg: '#f59e0b', text: '#fff', icon: '⚠' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(t => t.filter(x => x.id !== id))
      }, duration)
    }
    return id
  }, [])

  const api = {
    show,
    success: (m, o) => show(m, { ...o, type: 'success' }),
    error:   (m, o) => show(m, { ...o, type: 'error' }),
    info:    (m, o) => show(m, { ...o, type: 'info' }),
    warn:    (m, o) => show(m, { ...o, type: 'warn' }),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const c = COLORS[toast.type] || COLORS.info
  const [leaving, setLeaving] = useState(false)

  function handleDismiss() {
    setLeaving(true)
    setTimeout(onDismiss, 150)
  }

  return (
    <div
      className="pointer-events-auto rounded-xl border shadow-2xl flex items-start gap-3 px-4 py-3 min-w-[260px] max-w-sm slide-up"
      style={{
        backgroundColor: '#13131d',
        borderColor: '#2a2a38',
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 150ms ease, transform 150ms ease',
      }}
      role="status"
    >
      <span className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black mt-0.5"
        style={{ backgroundColor: c.bg }}>
        {c.icon}
      </span>
      <p className="text-sm text-white leading-snug flex-1 break-words">
        {toast.message}
      </p>
      <button onClick={handleDismiss}
        className="shrink-0 text-[#555568] hover:text-white transition-colors text-base leading-none mt-0.5">
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
