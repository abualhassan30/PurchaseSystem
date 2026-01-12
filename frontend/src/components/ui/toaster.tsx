import { useState, useEffect } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastState: Toast[] = []
let toastListeners: ((toasts: Toast[]) => void)[] = []

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toastState]))
}

export function toast(newToast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(7)
  toastState = [...toastState, { ...newToast, id }]
  notifyListeners()
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id)
    notifyListeners()
  }, 3000)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastListeners.push(listener)
    setToasts([...toastState])
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all ${
            toastItem.variant === 'destructive'
              ? 'border-red-500 bg-red-50 text-red-900'
              : 'border-gray-200 bg-white text-gray-950'
          }`}
        >
          <div className="grid gap-1">
            {toastItem.title && (
              <div className="text-sm font-semibold">{toastItem.title}</div>
            )}
            {toastItem.description && (
              <div className="text-sm opacity-90">{toastItem.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
