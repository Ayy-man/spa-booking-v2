'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BookingProgressIndicator from './BookingProgressIndicator'

interface BookingPageWrapperProps {
  children: React.ReactNode
  step: number
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backButtonText?: string
  backButtonHref?: string
  className?: string
}

type TransitionDirection = 'forward' | 'back' | 'fade'

export function BookingPageWrapper({
  children,
  step,
  title,
  subtitle,
  showBackButton = true,
  backButtonText = 'Back',
  backButtonHref,
  className = ''
}: BookingPageWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('fade')
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef<number>(step)

  // Map of booking steps for navigation
  const bookingSteps = [
    { path: '/booking', step: 1 },
    { path: '/booking/date-time', step: 2 },
    { path: '/booking/staff', step: 3 },
    { path: '/booking/staff-couples', step: 3 },
    { path: '/booking/customer-info', step: 4 },
    { path: '/booking/waiver', step: 5 },
    { path: '/booking/payment-selection', step: 6 },
    { path: '/booking/confirmation', step: 7 },
    { path: '/booking/confirmation-couples', step: 7 }
  ]

  // Determine default back button href based on step
  const getDefaultBackHref = () => {
    switch (step) {
      case 2: return '/booking'
      case 3: return '/booking/date-time'
      case 4: 
        // Check if it's couples booking for staff selection
        const bookingData = typeof window !== 'undefined' ? localStorage.getItem('bookingData') : null
        const isCouplesBooking = bookingData ? JSON.parse(bookingData).isCouplesBooking : false
        return isCouplesBooking ? '/booking/staff-couples' : '/booking/staff'
      case 5: return '/booking/customer-info'
      case 6: return '/booking/waiver'
      case 7: return '/booking/payment-selection'
      default: return '/booking'
    }
  }

  // Determine transition direction based on step change
  useEffect(() => {
    const currentStepData = bookingSteps.find(s => s.path === pathname)
    if (currentStepData && previousStepRef.current !== currentStepData.step) {
      if (currentStepData.step > previousStepRef.current) {
        setTransitionDirection('forward')
      } else if (currentStepData.step < previousStepRef.current) {
        setTransitionDirection('back')
      } else {
        setTransitionDirection('fade')
      }
      previousStepRef.current = currentStepData.step
    }
  }, [pathname])

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Handle navigation with smooth transitions
  const handleNavigation = async (href: string, direction: TransitionDirection = 'fade') => {
    if (isNavigating) return

    setIsNavigating(true)
    setTransitionDirection(direction)
    setIsExiting(true)

    // Wait for exit animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))

    // Reset scroll before navigation to avoid persisting deep scroll on next page
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0

    // Navigate to new page
    if (href.startsWith('http') || href.startsWith('/')) {
      window.location.href = href
    } else {
      router.push(href)
    }
  }

  // Enhanced back button handler with transition
  const handleBackClick = () => {
    const href = backButtonHref || getDefaultBackHref()
    handleNavigation(href, 'back')
  }

  // Get transition classes based on direction and state
  const getTransitionClasses = () => {
    if (!isVisible && !isExiting) {
      // Initial entrance state
      switch (transitionDirection) {
        case 'forward':
          return 'page-transition-enter opacity-0 transform translate-x-full'
        case 'back':
          return 'page-transition-back-enter opacity-0 transform -translate-x-full'
        default:
          return 'page-transition-fade-enter opacity-0 transform translate-y-5 scale-95'
      }
    }

    if (isExiting) {
      // Exit state
      switch (transitionDirection) {
        case 'forward':
          return 'page-transition-exit-active opacity-0 transform -translate-x-full'
        case 'back':
          return 'page-transition-back-exit-active opacity-0 transform translate-x-full'
        default:
          return 'page-transition-fade-exit-active opacity-0 transform -translate-y-5 scale-95'
      }
    }

    // Visible state
    return 'opacity-100 transform translate-x-0 translate-y-0 scale-100 transition-all duration-400 ease-out'
  }

  // Loading state component
  const LoadingState = () => (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  )

  // Screen reader announcement for page changes
  useEffect(() => {
    if (title && isVisible) {
      const announcement = `Navigation: ${title}${subtitle ? `, ${subtitle}` : ''}`
      
      // Create a temporary element for screen reader announcement
      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.textContent = announcement
      
      document.body.appendChild(announcer)
      
      // Clean up after announcement
      setTimeout(() => {
        document.body.removeChild(announcer)
      }, 1000)
    }
  }, [title, subtitle, isVisible])

  return (
    <>
      {/* Progress Indicator with celebration support */}
      <BookingProgressIndicator 
        showCelebration={isVisible && !isExiting} 
        allowNavigation={!isNavigating}
      />
      
      {/* Loading overlay during navigation */}
      {isNavigating && <LoadingState />}
      
      {/* Main page content with transitions */}
      <div 
        ref={wrapperRef}
        className={`min-h-screen bg-background ${getTransitionClasses()} ${className}`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header with back button */}
          {(title || showBackButton) && (
            <div className="max-w-4xl mx-auto mb-8">
              {showBackButton && (
                <button
                  onClick={handleBackClick}
                  disabled={isNavigating}
                  className="btn-tertiary !w-auto px-6 mb-6 inline-flex items-center gap-2 hover:gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`${backButtonText} to previous step`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {backButtonText}
                </button>
              )}
              
              {title && (
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4 animate-in slide-in-from-top-2">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xl text-gray-600 animate-in slide-in-from-top-2" style={{ animationDelay: '0.1s' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Page content */}
          <div className="animate-in slide-in-from-bottom-2" style={{ animationDelay: '0.2s' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

// Navigation helper hook for use in booking pages
export const useBookingNavigation = () => {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const navigateWithTransition = async (href: string, direction: TransitionDirection = 'forward') => {
    if (isNavigating) return

    setIsNavigating(true)

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 150))

    // Navigate
    if (href.startsWith('http') || href.startsWith('/')) {
      window.location.href = href
    } else {
      router.push(href)
    }

    // Reset navigation state after a delay
    setTimeout(() => setIsNavigating(false), 500)
  }

  return {
    navigateWithTransition,
    isNavigating
  }
}