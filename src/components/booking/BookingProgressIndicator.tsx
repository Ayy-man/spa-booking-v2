'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CheckIcon } from 'lucide-react'
import { hasWaiverRequirements } from '@/lib/waiver-logic'

interface ProgressStep {
  id: string
  title: string
  subtitle: string
  path: string
  order: number
}

const baseSteps: ProgressStep[] = [
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
    subtitle: 'Required forms',
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
}

export function BookingProgressIndicator({ 
  className = '', 
  allowNavigation = true 
}: BookingProgressIndicatorProps) {
  const pathname = usePathname()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [steps, setSteps] = useState<ProgressStep[]>(baseSteps)

  useEffect(() => {
    // Check if waivers are required for current booking
    const bookingDataStr = localStorage.getItem('bookingData')
    const selectedServiceStr = localStorage.getItem('selectedService')
    
    let requiresWaiver = false
    if (bookingDataStr) {
      const bookingData = JSON.parse(bookingDataStr)
      requiresWaiver = hasWaiverRequirements(bookingData)
    } else if (selectedServiceStr) {
      const service = JSON.parse(selectedServiceStr)
      const bookingData = {
        isCouplesBooking: false,
        primaryService: service,
        totalPrice: service.price,
        totalDuration: service.duration
      }
      requiresWaiver = hasWaiverRequirements(bookingData)
    }
    
    // Build steps array based on whether waivers are required
    const dynamicSteps = [...baseSteps]
    if (!requiresWaiver) {
      // Remove waiver step if not required
      const waiverIndex = dynamicSteps.findIndex(s => s.id === 'waiver')
      if (waiverIndex > -1) {
        dynamicSteps.splice(waiverIndex, 1)
        // Renumber remaining steps
        dynamicSteps.forEach((step, index) => {
          step.order = index + 1
        })
      }
    }
    setSteps(dynamicSteps)
    
    // Determine current step based on pathname
    const matchingStep = steps.find(step => 
      step.path === pathname || 
      (step.id === 'staff' && (pathname === '/booking/staff-couples' || pathname === '/booking/staff')) ||
      (step.id === 'confirmation' && (pathname === '/booking/confirmation-couples' || pathname === '/booking/confirmation')) ||
      (step.id === 'waiver' && pathname === '/booking/waiver')
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
      const hasCustomerInfo = localStorage.getItem('customerInfo') || localStorage.getItem('customerData')
      if (hasCustomerInfo && hasStaff && hasDateTime && hasService) completedIds.push(4)
      
      // Check if waivers are completed
      const hasWaivers = localStorage.getItem('waiversCompleted')
      if (hasWaivers && hasCustomerInfo && hasStaff && hasDateTime && hasService) completedIds.push(5)
      
      setCompletedSteps(completedIds)
    }
  }, [pathname])

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
    if (completedSteps.includes(step.order)) return 'completed'
    if (step.order === currentStep) return 'current'
    return 'upcoming'
  }

  const getStepClasses = (step: ProgressStep) => {
    const status = getStepStatus(step)
    const baseClasses = 'progress-step'
    
    switch (status) {
      case 'completed':
        return `${baseClasses} progress-step-completed ${allowNavigation ? 'cursor-pointer hover:scale-105' : ''}`
      case 'current':
        return `${baseClasses} progress-step-active`
      default:
        return `${baseClasses} ${allowNavigation && completedSteps.includes(step.order - 1) ? 'cursor-pointer hover:scale-105 hover:border-primary/50' : ''}`
    }
  }

  const getLineClasses = (stepOrder: number) => {
    return completedSteps.includes(stepOrder) ? 'progress-line-completed' : 'progress-line'
  }

  return (
    <div className={`w-full bg-white border-b border-gray-100 shadow-sm ${className}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step)}
                  className={getStepClasses(step)}
                  disabled={!allowNavigation}
                  aria-label={`Step ${step.order}: ${step.title}`}
                >
                  {completedSteps.includes(step.order) ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-bold">{step.order}</span>
                  )}
                </button>
                
                {/* Step Labels - Hidden on mobile, shown on larger screens */}
                <div className="hidden sm:flex flex-col items-center mt-3">
                  <span className={`text-sm font-semibold ${
                    getStepStatus(step) === 'current' 
                      ? 'text-primary' 
                      : getStepStatus(step) === 'completed'
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
                <div className={`mx-4 ${getLineClasses(step.order)} hidden sm:block`} />
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