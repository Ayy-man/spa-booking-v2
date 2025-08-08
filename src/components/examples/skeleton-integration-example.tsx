'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSkeletonLoading, useStaggeredSkeleton } from '@/hooks/use-skeleton-loading'
import {
  ServiceCardSkeleton,
  StaffCardSkeleton,
  TimeSlotSkeleton,
  BookingSummarySkeleton,
  FormSkeleton
} from '@/components/ui/skeleton-loader'

// Mock data interfaces
interface Service {
  id: string
  name: string
  price: number
  duration: number
  description: string
}

interface Staff {
  id: string
  name: string
  specialties: string[]
  avatar?: string
}

interface TimeSlot {
  id: string
  time: string
  available: boolean
}

// Mock API functions
const mockFetchServices = async (): Promise<Service[]> => {
  await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API delay
  return [
    { id: '1', name: 'Deep Cleansing Facial', price: 150, duration: 60, description: 'Thorough cleansing and exfoliation' },
    { id: '2', name: 'Anti-Aging Treatment', price: 200, duration: 90, description: 'Advanced anti-aging therapy' },
    { id: '3', name: 'Hydrating Facial', price: 120, duration: 45, description: 'Moisturizing and hydrating treatment' },
    { id: '4', name: 'Acne Treatment', price: 180, duration: 75, description: 'Specialized acne treatment' },
    { id: '5', name: 'Brightening Facial', price: 160, duration: 60, description: 'Skin brightening and tone evening' },
    { id: '6', name: 'Sensitive Skin Care', price: 140, duration: 50, description: 'Gentle care for sensitive skin' }
  ]
}

const mockFetchStaff = async (): Promise<Staff[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return [
    { id: '1', name: 'Sarah Johnson', specialties: ['Facial Treatments', 'Anti-Aging'] },
    { id: '2', name: 'Maria Rodriguez', specialties: ['Acne Treatment', 'Deep Cleansing'] },
    { id: '3', name: 'Emily Chen', specialties: ['Hydrating Treatments', 'Sensitive Skin'] },
    { id: '4', name: 'Lisa Thompson', specialties: ['Brightening', 'Advanced Treatments'] }
  ]
}

const mockFetchTimeSlots = async (): Promise<TimeSlot[]> => {
  await new Promise(resolve => setTimeout(resolve, 1200))
  return [
    { id: '1', time: '9:00 AM', available: true },
    { id: '2', time: '10:00 AM', available: true },
    { id: '3', time: '11:00 AM', available: false },
    { id: '4', time: '12:00 PM', available: true },
    { id: '5', time: '1:00 PM', available: true },
    { id: '6', time: '2:00 PM', available: false },
    { id: '7', time: '3:00 PM', available: true },
    { id: '8', time: '4:00 PM', available: true }
  ]
}

// Service Selection Component with Skeleton Integration
const ServiceSelectionWithSkeleton: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const skeleton = useSkeletonLoading(true, { minDuration: 800 })
  const staggered = useStaggeredSkeleton(6, { staggerDelay: 150 })

  useEffect(() => {
    const fetchData = async () => {
      skeleton.startLoading()
      staggered.startStaggered()
      
      try {
        const servicesData = await mockFetchServices()
        setServices(servicesData)
      } finally {
        skeleton.stopLoading()
      }
    }
    
    fetchData()
  }, [])

  if (skeleton.showSkeleton) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-primary-dark mb-6">Choose Your Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton
              key={i}
              className={staggered.isItemVisible(i) ? 'animate-fade-in-up' : 'opacity-0'}
              style={{
                animationDelay: `${staggered.getStaggerDelay(i)}ms`
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-primary-dark mb-6">Choose Your Service</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <Card
            key={service.id}
            className={`service-card-premium-enhanced cursor-pointer ${
              selectedService === service.id ? 'service-card-selected-premium-enhanced' : ''
            }`}
            onClick={() => setSelectedService(service.id)}
            style={{
              animationDelay: `${index * 150}ms`
            } as React.CSSProperties}
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold text-primary-dark mb-2 service-title">
                {service.name}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                {service.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary service-price">
                  ${service.price}
                </span>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full service-duration">
                  {service.duration} min
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Staff Selection Component with Skeleton Integration
const StaffSelectionWithSkeleton: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const skeleton = useSkeletonLoading(true, { minDuration: 600 })

  useEffect(() => {
    const fetchData = async () => {
      skeleton.startLoading()
      
      try {
        const staffData = await mockFetchStaff()
        setStaff(staffData)
      } finally {
        skeleton.stopLoading()
      }
    }
    
    fetchData()
  }, [])

  if (skeleton.showSkeleton) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-primary-dark mb-6">Select Your Practitioner</h2>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StaffCardSkeleton
              key={i}
              className="animate-fade-in-up"
              style={{
                animationDelay: `${i * 200}ms`
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-primary-dark mb-6">Select Your Practitioner</h2>
      <div className="space-y-4">
        {staff.map((member, index) => (
          <Card
            key={member.id}
            className={`staff-card cursor-pointer transition-all duration-200 ${
              selectedStaff === member.id ? 'ring-2 ring-primary border-primary bg-accent/20' : 'hover:border-accent'
            }`}
            onClick={() => setSelectedStaff(member.id)}
            style={{
              animationDelay: `${index * 200}ms`
            } as React.CSSProperties}
          >
            <div className="p-6 flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold text-primary-dark">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary-dark mb-2">
                  {member.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {member.specialties.map((specialty, i) => (
                    <span
                      key={i}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
              {selectedStaff === member.id && (
                <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Time Selection Component with Skeleton Integration
const TimeSelectionWithSkeleton: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const skeleton = useSkeletonLoading(true, { minDuration: 700 })

  useEffect(() => {
    const fetchData = async () => {
      skeleton.startLoading()
      
      try {
        const timeSlotsData = await mockFetchTimeSlots()
        setTimeSlots(timeSlotsData)
      } finally {
        skeleton.stopLoading()
      }
    }
    
    fetchData()
  }, [])

  if (skeleton.showSkeleton) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-primary-dark mb-6">Select Your Time</h2>
        <TimeSlotSkeleton count={8} />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-primary-dark mb-6">Select Your Time</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {timeSlots.map((slot) => (
          <button
            key={slot.id}
            className={`time-slot-button p-4 rounded-xl border-2 transition-all duration-200 ${
              selectedTime === slot.id
                ? 'time-slot-selected bg-primary text-white border-primary'
                : slot.available
                  ? 'time-slot-available bg-white border-gray-300 hover:border-primary hover:bg-accent/20'
                  : 'time-slot-unavailable bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={() => slot.available && setSelectedTime(slot.id)}
            disabled={!slot.available}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  )
}

// Main Integration Example Component
const SkeletonIntegrationExample: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [showBookingSummary, setShowBookingSummary] = useState(false)
  const summaryLoading = useSkeletonLoading(false)

  const steps = [
    { name: 'Service Selection', component: ServiceSelectionWithSkeleton },
    { name: 'Staff Selection', component: StaffSelectionWithSkeleton },
    { name: 'Time Selection', component: TimeSelectionWithSkeleton }
  ]

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Show booking summary with skeleton loading
      summaryLoading.startLoading()
      setShowBookingSummary(true)
      
      // Simulate processing time
      setTimeout(() => {
        summaryLoading.stopLoading()
      }, 1500)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetDemo = () => {
    setCurrentStep(0)
    setShowBookingSummary(false)
    summaryLoading.stopLoading()
  }

  const CurrentStepComponent = steps[currentStep]?.component

  if (showBookingSummary) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading text-primary-dark mb-4">
              Booking Summary
            </h1>
            <Button onClick={resetDemo} variant="outline">
              Start Over
            </Button>
          </div>
          
          <div className="max-w-md mx-auto">
            {summaryLoading.showSkeleton ? (
              <BookingSummarySkeleton />
            ) : (
              <Card className="p-6 bg-white shadow-lg">
                <h2 className="text-xl font-semibold text-primary-dark mb-4">Your Appointment</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">Deep Cleansing Facial</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Practitioner:</span>
                    <span className="font-medium">Sarah Johnson</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">Today</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">2:00 PM</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">$150</span>
                  </div>
                </div>
                <Button className="w-full mt-6 btn-continue-premium">
                  Confirm Booking
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading text-primary-dark mb-4">
            Skeleton Loading Integration Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience how skeleton loading states provide seamless transitions during the booking flow.
            Each component smoothly transitions from skeleton to real content.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.name}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index <= currentStep 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 rounded ${
                    index < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step */}
        <Card className="p-8 mb-8">
          {CurrentStepComponent && <CurrentStepComponent />}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePreviousStep}
            disabled={currentStep === 0}
            variant="outline"
          >
            Previous
          </Button>
          <Button onClick={handleNextStep} className="btn-continue-premium">
            {currentStep === steps.length - 1 ? 'Book Appointment' : 'Continue'}
          </Button>
        </div>

        {/* Reset Button */}
        <div className="text-center mt-8">
          <Button onClick={resetDemo} variant="outline" size="sm">
            Reset Demo
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SkeletonIntegrationExample