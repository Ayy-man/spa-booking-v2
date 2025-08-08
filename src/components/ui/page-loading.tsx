'use client'

import { useEffect, useState } from 'react'

interface PageLoadingProps {
  text?: string
  delay?: number
  showProgress?: boolean
}

export function PageLoadingSpinner({ 
  text = 'Loading...', 
  delay = 0,
  showProgress = false 
}: PageLoadingProps) {
  const [isVisible, setIsVisible] = useState(delay === 0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsVisible(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])

  // Simulate progress for visual feedback
  useEffect(() => {
    if (showProgress && isVisible) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 150)
      
      return () => clearInterval(interval)
    }
  }, [showProgress, isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Elegant loading spinner */}
        <div className="relative mb-8">
          <div className="w-16 h-16 mx-auto relative">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            {/* Animated ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
            {/* Inner gradient ring */}
            <div className="absolute inset-2 border-2 border-transparent border-t-primary/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-primary rounded-full opacity-60"
                style={{
                  top: '50%',
                  left: '50%',
                  animation: `float-particle-${i} 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.6}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <p className="text-xl font-semibold text-primary animate-pulse">
            {text}
          </p>
          
          {/* Progress bar */}
          {showProgress && (
            <div className="w-full max-w-xs mx-auto">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        {/* Premium loading dots */}
        <div className="flex items-center justify-center space-x-2 mt-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function NavigationLoadingOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 mx-4 text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-gray-800">
          Navigating...
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Please wait
        </p>
      </div>
    </div>
  )
}

// Skeleton loading for page content
export function PageContentSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-12 bg-gray-200 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Card skeletons */}
      <div className="grid gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl shadow-lg border">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="flex justify-end">
        <div className="h-12 bg-gray-200 rounded-xl w-48"></div>
      </div>
    </div>
  )
}

export default PageLoadingSpinner