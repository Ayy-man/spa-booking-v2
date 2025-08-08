'use client'

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Check, X, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'

interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => string
  hideToast: (id: string) => void
  hideAllToasts: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast component
function ToastComponent({ toast, onClose, position }: { 
  toast: Toast
  onClose: () => void
  position: ToastPosition
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50)
    
    // Auto-hide timer
    const hideTimer = setTimeout(() => {
      handleClose()
    }, toast.duration || 5000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(hideTimer)
    }
  }, [toast.duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose()
      toast.onClose?.()
    }, 300) // Match animation duration
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />
      case 'error':
        return <X className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 shadow-lg shadow-green-500/10'
      case 'error':
        return 'bg-white border-l-4 border-red-500 shadow-lg shadow-red-500/10'
      case 'warning':
        return 'bg-white border-l-4 border-yellow-500 shadow-lg shadow-yellow-500/10'
      case 'info':
        return 'bg-white border-l-4 border-blue-500 shadow-lg shadow-blue-500/10'
    }
  }

  const getAnimationClasses = () => {
    const isTop = position.includes('top')
    const isRight = position.includes('right')
    const isLeft = position.includes('left')
    const isCenter = position.includes('center')

    let enterClass = ''
    let exitClass = ''

    if (isTop && isRight) {
      enterClass = 'slide-in-from-top-right'
      exitClass = 'slide-out-to-top-right'
    } else if (isTop && isLeft) {
      enterClass = 'slide-in-from-top-left'
      exitClass = 'slide-out-to-top-left'
    } else if (isTop && isCenter) {
      enterClass = 'slide-in-from-top'
      exitClass = 'slide-out-to-top'
    } else if (position.includes('bottom') && isRight) {
      enterClass = 'slide-in-from-bottom-right'
      exitClass = 'slide-out-to-bottom-right'
    } else if (position.includes('bottom') && isLeft) {
      enterClass = 'slide-in-from-bottom-left'
      exitClass = 'slide-out-to-bottom-left'
    } else {
      enterClass = 'slide-in-from-bottom'
      exitClass = 'slide-out-to-bottom'
    }

    if (isLeaving) return exitClass
    if (isVisible) return enterClass
    return 'opacity-0 scale-95'
  }

  return (
    <div
      className={`
        ${getTypeStyles()}
        ${getAnimationClasses()}
        transform transition-all duration-300 ease-out
        rounded-xl p-4 mb-3 min-w-[320px] max-w-[480px]
        flex items-start gap-3
        relative overflow-hidden
        backdrop-blur-sm
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-semibold text-gray-900 text-sm mb-1">
            {toast.title}
          </h4>
        )}
        <p className="text-gray-700 text-sm leading-relaxed">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-primary hover:text-primary-dark font-medium text-sm transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div 
        className={`
          absolute bottom-0 left-0 h-1 
          ${toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'error' ? 'bg-red-500' :
            toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
          transition-all ease-linear
        `}
        style={{
          width: '100%',
          animation: `toast-progress ${toast.duration || 5000}ms linear`
        }}
      />
    </div>
  )
}

// Toast container
function ToastContainer({ 
  toasts, 
  position, 
  onClose 
}: { 
  toasts: Toast[]
  position: ToastPosition
  onClose: (id: string) => void
}) {
  if (toasts.length === 0) return null

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div 
      className={`fixed z-50 pointer-events-none ${getPositionClasses()}`}
      style={{ zIndex: 9999 }}
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            position={position}
            onClose={() => onClose(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Toast provider
interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  maxToasts?: number
}

export function ToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toastData: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { ...toastData, id }

    setToasts(prev => {
      const updated = [newToast, ...prev]
      return updated.slice(0, maxToasts)
    })

    return id
  }, [maxToasts])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const hideAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast, hideAllToasts }}>
      {children}
      <ToastContainer 
        toasts={toasts} 
        position={position}
        onClose={hideToast} 
      />
    </ToastContext.Provider>
  )
}

// Convenience functions for different toast types
export const showSuccessToast = (showToast: ToastContextValue['showToast']) => 
  (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => 
    showToast({ type: 'success', message, ...options })

export const showErrorToast = (showToast: ToastContextValue['showToast']) => 
  (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => 
    showToast({ type: 'error', message, ...options })

export const showWarningToast = (showToast: ToastContextValue['showToast']) => 
  (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => 
    showToast({ type: 'warning', message, ...options })

export const showInfoToast = (showToast: ToastContextValue['showToast']) => 
  (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => 
    showToast({ type: 'info', message, ...options })

export default ToastProvider