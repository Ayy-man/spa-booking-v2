'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { CheckIcon } from 'lucide-react'
import { StepCheckmark, ProgressLine } from '@/components/ui/success-checkmark'

interface ProgressStep {
  id: string
  title: string
  subtitle: string
  path: string
  order: number
}

const steps: ProgressStep[] = [
  {
    id: 'service',
    title: 'Service',
    subtitle: 'Choose treatment',
    path: '/booking',
    order: 1
  },
  {
    id: 'datetime',
    title: 'Date & Time',
    subtitle: 'Pick appointment',
    path: '/booking/date-time',
    order: 2
  },
  {
    id: 'staff',
    title: 'Staff',
    subtitle: 'Select therapist',
    path: '/booking/staff',
    order: 3
  },
  {
    id: 'customer',
    title: 'Your Info',
    subtitle: 'Contact details',
    path: '/booking/customer-info',
    order: 4
  },
  {
    id: 'waiver',
    title: 'Waiver',
    subtitle: 'Sign consent',
    path: '/booking/waiver',
    order: 5
  },
  {
    id: 'confirmation',
    title: 'Confirm',
    subtitle: 'Review booking',
    path: '/booking/confirmation',
    order: 6
  }
]

interface BookingProgressIndicatorProps {
  className?: string
  allowNavigation?: boolean
  showCelebration?: boolean
}

export function BookingProgressIndicator({ 
  className = '', 
  allowNavigation = true,
  showCelebration = false
}: BookingProgressIndicatorProps) {
  const pathname = usePathname()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [previousSteps, setPreviousSteps] = useState<number[]>([])
  const [animatingSteps, setAnimatingSteps] = useState<number[]>([])
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Determine current step based on pathname
    const matchingStep = steps.find(step => 
      step.path === pathname || 
      (step.id === 'staff' && (pathname === '/booking/staff-couples' || pathname === '/booking/staff')) ||
      (step.id === 'confirmation' && (pathname === '/booking/confirmation-couples' || pathname === '/booking/confirmation'))
    )
    
    if (matchingStep) {
      setCurrentStep(matchingStep.order)
      
      // Determine completed steps based on localStorage data
      const completedIds: number[] = []
      
      // Check if service is selected
      const hasService = localStorage.getItem('bookingData') || localStorage.getItem('selectedService')
      if (hasService) completedIds.push(1)
      
      // Check if date/time is selected
      const hasDateTime = localStorage.getItem('selectedDate') && localStorage.getItem('selectedTime')
      if (hasDateTime && hasService) completedIds.push(2)
      
      // Check if staff is selected
      const hasStaff = localStorage.getItem('selectedStaff')
      if (hasStaff && hasDateTime && hasService) completedIds.push(3)
      
      // Check if customer info is provided
      const hasCustomerInfo = localStorage.getItem('customerInfo')
      if (hasCustomerInfo && hasStaff && hasDateTime && hasService) completedIds.push(4)
      
      // Check if waiver is completed (only if required)
      const waiverCompleted = localStorage.getItem('waiverCompleted')
      if (waiverCompleted === 'true' && hasCustomerInfo) completedIds.push(5)
      
      // If on confirmation page without waiver being required, skip waiver step in completion
      if (matchingStep.id === 'confirmation' && waiverCompleted !== 'true') {
        // Check if current service requires waiver
        const service = hasService ? JSON.parse(hasService).name || JSON.parse(localStorage.getItem('bookingData') || '{}').primaryService?.name : null
        if (service) {
          // Import waiver check (async, so this is an approximation)
          const requiresWaiverCheck = (serviceName: string): boolean => {
            const name = serviceName.toLowerCase()
            return name.includes('radio frequency') || name.includes('chemical peel') || name.includes('microderm') || 
                   name.includes('wax') || name.includes('brazilian') || name.includes('bikini')
          }
          
          if (!requiresWaiverCheck(service)) {
            // Service doesn't require waiver, so mark waiver step as completed
            completedIds.push(5)
          }
        }
      }
      
      // Detect newly completed steps for celebration
      const newlyCompleted = completedIds.filter(id => !previousSteps.includes(id))
      
      if (newlyCompleted.length > 0 && showCelebration) {
        setAnimatingSteps(newlyCompleted)
        setTimeout(() => setAnimatingSteps([]), 1000) // Clear animation after 1 second
      }
      
      setPreviousSteps(completedSteps)
      setCompletedSteps(completedIds)
    }
  }, [pathname, completedSteps, previousSteps, showCelebration])

  const handleStepClick = (step: ProgressStep) => {
    if (!allowNavigation) return
    
    // Only allow navigation to completed steps or the next available step
    const canNavigate = completedSteps.includes(step.order - 1) || step.order === 1
    
    if (canNavigate) {
      // Handle special cases for staff and confirmation paths
      let targetPath = step.path
      if (step.id === 'staff') {
        const bookingData = localStorage.getItem('bookingData')
        if (bookingData) {
          const parsed = JSON.parse(bookingData)
          if (parsed.isCouplesBooking) {
            targetPath = '/booking/staff-couples'
          }
        }
      } else if (step.id === 'confirmation') {
        const bookingData = localStorage.getItem('bookingData')
        if (bookingData) {
          const parsed = JSON.parse(bookingData)
          if (parsed.isCouplesBooking) {
            targetPath = '/booking/confirmation-couples'
          }
        }
      }
      
      window.location.href = targetPath
    }
  }

  const getStepStatus = (step: ProgressStep) => {
    if (completedSteps.includes(step.order)) {
      if (animatingSteps.includes(step.order)) return 'celebrating'
      return 'completed'
    }
    if (step.order === currentStep) return 'current'
    return 'upcoming'
  }

  const getStepClasses = (step: ProgressStep) => {
    const status = getStepStatus(step)
    const baseClasses = 'progress-step transition-all duration-300 ease-out'
    
    switch (status) {
      case 'celebrating':
        return `${baseClasses} progress-step-celebrating animate-step-celebration`
      case 'completed':
        return `${baseClasses} progress-step-completed ${allowNavigation ? 'cursor-pointer hover:scale-105' : ''}`
      case 'current':
        return `${baseClasses} progress-step-active animate-pulse-current`
      default:
        return `${baseClasses} progress-step-upcoming ${allowNavigation && completedSteps.includes(step.order - 1) ? 'cursor-pointer hover:scale-105 hover:border-primary/50' : ''}`
    }
  }

  const getLineClasses = (stepOrder: number) => {
    const baseClasses = 'progress-line transition-all duration-500 ease-out'
    return completedSteps.includes(stepOrder) 
      ? `${baseClasses} progress-line-completed` 
      : `${baseClasses} progress-line-pending`
  }

  const getProgressPercentage = () => {
    const totalSteps = steps.length
    const progress = currentStep / totalSteps
    return Math.min(progress * 100, 100)
  }

  return (
    <div className={`w-full bg-white border-b border-gray-100 shadow-sm ${className}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Animated Progress Bar - Mobile/Tablet */}
        <div className="sm:hidden mb-6">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-700 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-progress-shimmer rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => allowNavigation && handleStepClick(step)}
                  className={allowNavigation ? 'cursor-pointer' : ''}
                >
                  <StepCheckmark
                    isCompleted={completedSteps.includes(step.order)}
                    stepNumber={step.order}
                    className={getStepClasses(step)}
                  />
                </div>
                
                {/* Step Labels - Hidden on mobile, shown on larger screens */}
                <div className="hidden sm:flex flex-col items-center mt-3">
                  <span className={`text-sm font-semibold transition-colors duration-300 ${
                    getStepStatus(step) === 'current' 
                      ? 'text-primary' 
                      : getStepStatus(step) === 'completed' || getStepStatus(step) === 'celebrating'
                      ? 'text-success'
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {step.subtitle}
                  </span>
                </div>
              </div>
              
              {/* Progress Line - Don't show after last step */}
              {index < steps.length - 1 && (
                <div className="mx-4 hidden sm:block relative">
                  <ProgressLine 
                    isCompleted={completedSteps.includes(step.order)}
                    className="w-16 h-1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile Step Labels - Show current step info */}
        <div className="sm:hidden mt-4 text-center">
          <div className="text-lg font-semibold text-primary">
            {steps.find(s => s.order === currentStep)?.title}
          </div>
          <div className="text-sm text-gray-500">
            {steps.find(s => s.order === currentStep)?.subtitle}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingProgressIndicator