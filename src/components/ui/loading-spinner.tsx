'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  text?: string
}

export function LoadingSpinner({ 
  size = 'medium', 
  className = '',
  text
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner',
    large: 'w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={sizeClasses[size]} />
      {text && (
        <p className="mt-3 text-gray-600 font-medium">
          {text}
        </p>
      )}
    </div>
  )
}

// Page Loading Component
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="large" text={text} />
    </div>
  )
}

// Inline Loading Component
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner text={text} />
    </div>
  )
}

// Button Loading Component
export function ButtonLoading({ text = 'Processing...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <LoadingSpinner size="small" />
      <span>{text}</span>
    </div>
  )
}

export default LoadingSpinner