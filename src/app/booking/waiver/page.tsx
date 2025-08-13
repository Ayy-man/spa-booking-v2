'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WaiverForm, WaiverFormData } from '@/components/booking/WaiverForm'
import { requiresWaiver, WaiverType } from '@/lib/waiver-content'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, CheckCircleIcon, ArrowLeftIcon } from 'lucide-react'
import { analytics } from '@/lib/analytics'

interface Service {
  name: string
  price: number
  duration: number
}

export default function WaiverPage() {
  const router = useRouter()
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [waiverType, setWaiverType] = useState<WaiverType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [completed, setCompleted] = useState(false)

  const proceedToPayment = useCallback(() => {
    // Check if it's a couples booking to determine the correct confirmation page
    const bookingDataStr = localStorage.getItem('bookingData')
    const isCouplesBooking = bookingDataStr ? JSON.parse(bookingDataStr).isCouplesBooking : false
    const customerInfo = localStorage.getItem('customerInfo')
    
    if (customerInfo) {
      const customer = JSON.parse(customerInfo)
      
      if (customer.isNewCustomer) {
        // New customer - redirect to GoHighLevel payment link
        const baseUrl = window.location.origin
        const confirmationPage = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
        const returnUrl = `${baseUrl}${confirmationPage}?payment=success`
        const ghlPaymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
        window.location.href = ghlPaymentUrl
      } else {
        // Existing customer - go to appropriate confirmation page
        router.push(isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation')
      }
    } else {
      // Fallback - redirect to customer info if no customer data
      router.push('/booking/customer-info')
    }
  }, [router])

  useEffect(() => {
    // Check if we should be on this page
    const checkWaiverRequirement = () => {
      // Get service data from localStorage
      const serviceData = localStorage.getItem('selectedService')
      const bookingDataStr = localStorage.getItem('bookingData')
      
      let service: Service | null = null
      
      // Handle couples booking data structure
      if (bookingDataStr) {
        const bookingData = JSON.parse(bookingDataStr)
        if (bookingData.primaryService) {
          service = bookingData.primaryService
        }
      } else if (serviceData) {
        // Handle regular booking data structure
        service = JSON.parse(serviceData)
      }

      if (!service) {
        console.error('No service found, redirecting to booking start')
        router.push('/booking')
        return
      }

      setSelectedService(service)

      // Check if this service requires a waiver
      const requiredWaiverType = requiresWaiver(service.name)
      
      if (!requiredWaiverType) {
        proceedToPayment()
        return
      }

      setWaiverType(requiredWaiverType)

      // Check if waiver was already completed in this session
      const waiverCompleted = localStorage.getItem('waiverCompleted')
      const completedWaiverType = localStorage.getItem('completedWaiverType')
      
      if (waiverCompleted === 'true' && completedWaiverType === requiredWaiverType) {
        proceedToPayment()
        return
      }
    }

    checkWaiverRequirement()
  }, [router, proceedToPayment])

  // Track page view
  useEffect(() => {
    if (waiverType) {
      analytics.pageViewed('waiver', 5)
    }
  }, [waiverType])

  const handleWaiverSubmit = async (data: WaiverFormData) => {
    setLoading(true)
    setError('')

    try {
      // Include customer info from localStorage if available
      const customerInfo = localStorage.getItem('customerInfo')
      const submissionData = {
        ...data,
        customerInfo: customerInfo || '{}'
      }

  
      const response = await fetch('/api/waivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit waiver')
      }

      // Mark waiver as completed in localStorage
      localStorage.setItem('waiverCompleted', 'true')
      localStorage.setItem('completedWaiverType', waiverType!)
      localStorage.setItem('waiverId', result.waiverId)

      // Track waiver completion
      analytics.waiverCompleted(waiverType!, selectedService?.name || '')

      setCompleted(true)

      // Auto-proceed to payment after brief success message
      setTimeout(() => {
        proceedToPayment()
      }, 2000)

    } catch (err: any) {
      console.error('Waiver submission error:', err)
      setError(err.message || 'Failed to submit waiver. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while determining waiver requirement
  if (!selectedService || !waiverType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading waiver requirements...</p>
        </div>
      </div>
    )
  }

  // Show completion state
  if (completed) {
    return (
      <>
        <BookingProgressIndicator />
        <div className="min-h-screen bg-background section-spacing">
          <div className="container mx-auto px-6 max-w-4xl">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Waiver Completed Successfully!
                </h1>
                <p className="text-gray-600">
                  Your waiver for <strong>{selectedService.name}</strong> has been signed and saved.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  Redirecting you to complete your booking...
                </p>
              </div>
            </Card>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <BookingProgressIndicator />
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
                Service Waiver Required
              </h1>
              <p className="text-xl text-gray-600 mb-2">
                Please complete the required waiver for your selected service
              </p>
              <p className="text-gray-500">
                This waiver is required for <strong>{selectedService.name}</strong> due to the nature of the treatment.
              </p>
            </div>

            {/* Important Notice */}
            <Card className="mb-8 p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Important Notice</h3>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Please read all sections carefully before signing</li>
                    <li>• All required fields must be completed</li>
                    <li>• Your digital signature has the same legal effect as a handwritten signature</li>
                    <li>• This waiver will be securely stored with your booking information</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="mb-6 p-4 bg-red-50 border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircleIcon className="w-5 h-5 text-red-600" />
                  <p className="text-red-600 font-medium">Error submitting waiver:</p>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError('')}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </Card>
            )}

            {/* Waiver Form */}
            <WaiverForm
              waiverType={waiverType}
              serviceName={selectedService.name}
              onSubmit={handleWaiverSubmit}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </>
  )
}