'use client'

import * as React from "react"
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type MessageType = 'error' | 'success' | 'warning' | 'info'

interface ErrorMessageProps {
  message?: string
  type?: MessageType
  showIcon?: boolean
  showAnimation?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onDismiss?: () => void
  dismissible?: boolean
  children?: React.ReactNode
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  showIcon = true,
  showAnimation = true,
  size = 'md',
  className,
  onDismiss,
  dismissible = false,
  children
}) => {
  const [isVisible, setIsVisible] = React.useState(true)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    if (showAnimation && (message || children)) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [message, children, showAnimation])

  const handleDismiss = () => {
    if (showAnimation) {
      setIsVisible(false)
      setTimeout(() => {
        onDismiss?.()
      }, 300)
    } else {
      onDismiss?.()
    }
  }

  const getIcon = () => {
    const iconProps = {
      className: cn(
        "flex-shrink-0",
        size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
      )
    }

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} />
      case 'warning':
        return <AlertTriangle {...iconProps} />
      case 'info':
        return <Info {...iconProps} />
      default:
        return <AlertCircle {...iconProps} />
    }
  }

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'warning':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs p-2'
      case 'lg':
        return 'text-base p-4'
      default:
        return 'text-sm p-3'
    }
  }

  const getAnimationClasses = () => {
    if (!showAnimation) return ''
    
    const classes = []
    
    if (isAnimating) {
      classes.push('animate-fade-slide-in')
    }
    
    if (!isVisible) {
      classes.push('animate-fade-slide-out')
    }
    
    return classes.join(' ')
  }

  if (!message && !children) {
    return null
  }

  return (
    <div
      className={cn(
        // Base styling
        "relative flex items-start gap-2 rounded-lg border transition-all duration-200 ease-out",
        
        // Type styling
        getTypeClasses(),
        
        // Size styling
        getSizeClasses(),
        
        // Animation classes
        getAnimationClasses(),
        
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      {showIcon && (
        <div className="mt-0.5">
          {getIcon()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {message && <span>{message}</span>}
        {children}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 rounded-md p-1 hover:bg-black/5 focus:outline-none",
            "focus:ring-2 focus:ring-offset-2 transition-colors duration-200",
            type === 'error' && "focus:ring-red-500",
            type === 'success' && "focus:ring-green-500", 
            type === 'warning' && "focus:ring-amber-500",
            type === 'info' && "focus:ring-blue-500"
          )}
          aria-label="Dismiss message"
        >
          <svg 
            className={cn(
              "fill-current", 
              size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )} 
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// Specialized components for different types
const SuccessMessage: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage {...props} type="success" />
)

const WarningMessage: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage {...props} type="warning" />
)

const InfoMessage: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage {...props} type="info" />
)

// Validation message component specifically for form fields
interface ValidationMessageProps {
  error?: string
  success?: string
  warning?: string
  info?: string
  showAnimation?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  error,
  success,
  warning,
  info,
  showAnimation = true,
  size = 'sm',
  className
}) => {
  // Priority order: error > warning > success > info
  const message = error || warning || success || info
  const type: MessageType = error ? 'error' : warning ? 'warning' : success ? 'success' : 'info'

  if (!message) return null

  return (
    <ErrorMessage
      message={message}
      type={type}
      showAnimation={showAnimation}
      size={size}
      className={cn("mt-1", className)}
      showIcon={true}
    />
  )
}

ErrorMessage.displayName = "ErrorMessage"
SuccessMessage.displayName = "SuccessMessage"
WarningMessage.displayName = "WarningMessage"
InfoMessage.displayName = "InfoMessage"
ValidationMessage.displayName = "ValidationMessage"

export { 
  ErrorMessage, 
  SuccessMessage, 
  WarningMessage, 
  InfoMessage, 
  ValidationMessage,
  type ErrorMessageProps,
  type ValidationMessageProps,
  type MessageType
}