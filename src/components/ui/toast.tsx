import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { NOTIFICATION_CONFIG, PRIORITY_CONFIG } from "@/types/notifications"
import type { NotificationType, NotificationPriority } from "@/types/notifications"

export interface ToastProps {
  id: string
  title: string
  message: string
  type?: NotificationType
  priority?: NotificationPriority
  duration?: number
  onAction?: () => void
  onDismiss?: () => void
  actionLabel?: string
}

export const Toast = React.forwardRef<
  HTMLDivElement,
  ToastProps
>(({ 
  id,
  title, 
  message, 
  type = 'system_alert',
  priority = 'normal',
  duration = 6000,
  onAction,
  onDismiss,
  actionLabel = "View"
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(true)
  const [isExiting, setIsExiting] = React.useState(false)
  
  const notificationConfig = NOTIFICATION_CONFIG[type]
  const priorityConfig = PRIORITY_CONFIG[priority]

  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300) // Animation duration
  }

  if (!isVisible) return null

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg transition-all duration-300",
        "transform",
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
        priorityConfig.bgColor,
        priorityConfig.borderColor,
        "border"
      )}
      role="alert"
      aria-live={priority === 'urgent' ? 'assertive' : 'polite'}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl" aria-hidden="true">
            {notificationConfig.icon}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={cn("text-sm font-medium", priorityConfig.color)}>
              {title}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {message}
            </p>
            {onAction && (
              <div className="mt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    onAction()
                    handleDismiss()
                  }}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm font-medium",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2",
                    priority === 'urgent' 
                      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                      : priority === 'high'
                      ? "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500"
                      : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                  )}
                >
                  {actionLabel}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className={cn(
                "inline-flex rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                priorityConfig.color.replace('text', 'hover:bg').replace('800', '200'),
                "p-1.5"
              )}
              onClick={handleDismiss}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {priority === 'urgent' && (
        <div className="h-1 bg-red-600 animate-pulse" />
      )}
    </div>
  )
})

Toast.displayName = "Toast"