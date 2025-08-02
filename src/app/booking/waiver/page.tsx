'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import WaiverForm from '@/components/booking/WaiverForm'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { 
  getRequiredWaivers, 
  hasWaiverRequirements,
  storeWaiverCompletion,
  areAllWaiversCompleted,
  getWaiverDisplayName,
  getStoredWaivers
} from '@/lib/waiver-logic'
import { BookingData } from '@/lib/waiver-logic'

interface CustomerData {
  name: string
  email: string
  phone: string
  specialRequests?: string
  isNewCustomer: boolean
  paymentType: 'deposit' | 'full'
}

export default function WaiverPage() {
  const router = useRouter()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [currentWaiverIndex, setCurrentWaiverIndex] = useState(0)
  const [requiredWaivers, setRequiredWaivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get booking and customer data from localStorage
    const bookingDataStr = localStorage.getItem('bookingData')
    const customerDataStr = localStorage.getItem('customerData')
    const selectedDate = localStorage.getItem('selectedDate')
    const selectedTime = localStorage.getItem('selectedTime')

    if (!bookingDataStr || !customerDataStr || !selectedDate || !selectedTime) {
      // Missing required data, redirect to start
      router.push('/booking')
      return
    }

    const booking = JSON.parse(bookingDataStr)
    const customer = JSON.parse(customerDataStr)

    setBookingData(booking)
    setCustomerData(customer)

    // Check if waivers are actually required
    if (!hasWaiverRequirements(booking)) {
      // No waivers needed, proceed to payment
      router.push('/booking/customer-info')
      return
    }

    // Get required waivers
    const waivers = getRequiredWaivers(booking)
    setRequiredWaivers(waivers)

    // Check if all waivers are already completed
    if (areAllWaiversCompleted(booking)) {
      // All waivers completed, proceed to final step
      proceedToNextStep()
      return
    }

    setLoading(false)
  }, [router])

  const proceedToNextStep = () => {
    // Store completion status and proceed to payment
    localStorage.setItem('waiversCompleted', 'true')
    router.push('/booking/customer-info')
  }

  const handleWaiverComplete = (waiverData: any) => {
    if (!requiredWaivers[currentWaiverIndex]) return

    const currentWaiverType = requiredWaivers[currentWaiverIndex].type
    
    // Store the completed waiver
    storeWaiverCompletion(currentWaiverType, waiverData)

    // Check if there are more waivers
    if (currentWaiverIndex < requiredWaivers.length - 1) {
      // Move to next waiver
      setCurrentWaiverIndex(currentWaiverIndex + 1)
    } else {
      // All waivers completed
      proceedToNextStep()
    }
  }

  const handleBack = () => {
    if (currentWaiverIndex > 0) {
      // Go to previous waiver
      setCurrentWaiverIndex(currentWaiverIndex - 1)
    } else {
      // Go back to customer info
      router.push('/booking/customer-info')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading waiver requirements...</p>
        </div>
      </div>
    )
  }

  if (!bookingData || !customerData || requiredWaivers.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4">No Waivers Required</h2>
          <p className="text-gray-600 mb-6">
            Your selected services do not require any additional waivers.
          </p>
          <Button onClick={() => router.push('/booking/customer-info')}>
            Continue to Payment
          </Button>
        </Card>
      </div>
    )
  }

  const currentWaiver = requiredWaivers[currentWaiverIndex]
  const progressPercent = ((currentWaiverIndex + 1) / requiredWaivers.length) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="container mx-auto px-6 max-w-4xl py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-6 mb-6">
            <Link 
              href="/booking/customer-info" 
              className="btn-tertiary !w-auto px-6"
            >
              ← Back to Customer Info
            </Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <div className="text-sm text-gray-600">
              Step {currentWaiverIndex + 1} of {requiredWaivers.length}
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-heading text-primary mb-4">
            Required Treatment Waiver
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {getWaiverDisplayName(currentWaiver.type)}
          </p>
          
          {/* Progress bar for multiple waivers */}
          {requiredWaivers.length > 1 && (
            <div className="mt-6 max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Waiver {currentWaiverIndex + 1} of {requiredWaivers.length}
              </p>
            </div>
          )}
        </div>

        {/* Service Summary */}
        <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Services Requiring This Waiver:</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-800">{currentWaiver.serviceName}</span>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {currentWaiver.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            {bookingData.isCouplesBooking && bookingData.secondaryService && (
              <div className="flex justify-between items-center">
                <span className="text-blue-800">{bookingData.secondaryService.name}</span>
                <span className="text-sm text-blue-600">Couples Service</span>
              </div>
            )}
          </div>
        </Card>

        {/* Waiver Form */}
        <WaiverForm
          serviceCategory={currentWaiver.type}
          serviceName={currentWaiver.serviceName}
          customerName={customerData.name}
          customerEmail={customerData.email}
          customerPhone={customerData.phone}
          onWaiverComplete={handleWaiverComplete}
          onBack={handleBack}
          isLastWaiver={currentWaiverIndex === requiredWaivers.length - 1}
          waiverProgress={{
            current: currentWaiverIndex + 1,
            total: requiredWaivers.length
          }}
        />
      </div>
    </div>
  )
}