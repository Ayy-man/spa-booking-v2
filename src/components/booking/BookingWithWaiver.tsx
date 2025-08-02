'use client'

import { useState } from 'react'
import CouplesBooking from '../CouplesBooking'
import WaiverForm from './WaiverForm'

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface BookingData {
  isCouplesBooking: boolean
  primaryService: Service
  secondaryService?: Service
  totalPrice: number
  totalDuration: number
}

interface WaiverData {
  signature: string
  date: string
  serviceCategory: string
  serviceName: string
  customerName: string
  agreedToTerms: boolean
  medicalConditions: string
  allergies: string
  skinConditions: string
  medications: string
  pregnancyStatus?: boolean
  previousWaxing?: boolean
  recentSunExposure?: boolean
  emergencyContactName: string
  emergencyContactPhone: string
}

interface BookingWithWaiverProps {
  selectedService: Service | null
  serviceCategories: Array<{
    name: string
    services: Service[]
  }>
  onContinue: (bookingData: BookingData, waiverData?: WaiverData) => void
}

// Helper function to determine service category for waiver
const getServiceCategoryForWaiver = (serviceName: string): string => {
  const name = serviceName.toLowerCase()
  
  if (name.includes('facial') || name.includes('acne') || name.includes('microderm') || name.includes('peel') || name.includes('vitamin')) {
    return 'facial'
  }
  if (name.includes('massage') || name.includes('hot stone') || name.includes('balinese') || name.includes('deep tissue')) {
    return 'massage'
  }
  if (name.includes('wax') || name.includes('brazilian') || name.includes('bikini') || name.includes('eyebrow')) {
    return 'waxing'
  }
  if (name.includes('scrub') || name.includes('treatment') || name.includes('wrap') || name.includes('cleaning') || name.includes('whitening')) {
    return 'body_treatment'
  }
  
  // Default to facial if we can't determine
  return 'facial'
}

// Services that require waivers (most services except simple ones)
const requiresWaiver = (serviceName: string): boolean => {
  const name = serviceName.toLowerCase()
  // Simple services that typically don't need waivers
  const simpleServices = ['vip card', 'consultation']
  return !simpleServices.some(simple => name.includes(simple))
}

export default function BookingWithWaiver({ selectedService, serviceCategories, onContinue }: BookingWithWaiverProps) {
  const [currentStep, setCurrentStep] = useState<'service' | 'waiver'>('service')
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [customerName, setCustomerName] = useState('')

  const handleServiceContinue = (data: BookingData) => {
    setBookingData(data)
    
    // Check if any of the selected services require a waiver
    const needsWaiver = requiresWaiver(data.primaryService.name) || 
                       (data.secondaryService && requiresWaiver(data.secondaryService.name))
    
    if (needsWaiver) {
      // We need customer name for the waiver - in a real app this would come from auth or form
      // For now, we'll prompt for it or use a placeholder
      const name = prompt('Please enter customer name for waiver:') || 'Customer'
      setCustomerName(name)
      setCurrentStep('waiver')
    } else {
      // No waiver needed, proceed directly
      onContinue(data)
    }
  }

  const handleWaiverComplete = (waiverData: WaiverData) => {
    if (bookingData) {
      onContinue(bookingData, waiverData)
    }
  }

  const handleWaiverBack = () => {
    setCurrentStep('service')
  }

  if (currentStep === 'waiver' && bookingData) {
    // Determine which service category to use for the waiver
    // If couples booking with different categories, we might need multiple waivers
    // For simplicity, we'll use the primary service category
    const serviceCategory = getServiceCategoryForWaiver(bookingData.primaryService.name)
    const serviceName = bookingData.isCouplesBooking && bookingData.secondaryService
      ? `${bookingData.primaryService.name} + ${bookingData.secondaryService.name}`
      : bookingData.primaryService.name

    return (
      <WaiverForm
        serviceCategory={serviceCategory}
        serviceName={serviceName}
        customerName={customerName}
        onWaiverComplete={handleWaiverComplete}
        onBack={handleWaiverBack}
      />
    )
  }

  return (
    <CouplesBooking
      selectedService={selectedService}
      serviceCategories={serviceCategories}
      onContinue={handleServiceContinue}
    />
  )
}