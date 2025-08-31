"use client"

import * as React from "react"
import { Toast, ToastProps } from "./toast"

interface ToasterProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
}

export const Toaster: React.FC<ToasterProps> = ({ position = "top-right" }) => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  React.useEffect(() => {
    // Expose showToast function globally
    if (typeof window !== 'undefined') {
      (window as any).showToast = (toast: Omit<ToastProps, 'onDismiss'>) => {
        const id = toast.id || Math.random().toString(36).substr(2, 9)
        const newToast: ToastProps = {
          ...toast,
          id,
          onDismiss: () => removeToast(id)
        }
        setToasts(prev => [...prev, newToast])
      }

      // Cleanup
      return () => {
        delete (window as any).showToast
      }
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2"
  }

  return (
    <div
      className={`fixed z-50 pointer-events-none ${positionClasses[position]}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  )
}