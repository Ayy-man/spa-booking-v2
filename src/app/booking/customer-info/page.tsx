'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerForm, { CustomerFormData } from '@/components/booking/CustomerForm'
import { staffNameMap } from '@/lib/staff-data'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'
import { useBookingState, type CustomerInfo } from '@/lib/booking-state-v2'

interface Service {
  name: string
  price: number
  duration: number
}

export default function CustomerInfoPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  
  // Use the new booking state manager
  const bookingState = useBookingState()

  useEffect(() => {
    console.log('[CustomerInfoPage] Initializing with booking state:', bookingState.state)
    
    // Validate that we can proceed to customer info
    const validation = bookingState.canProceedTo('customer-info')
    if (!validation.isValid) {
      console.error('[CustomerInfoPage] Invalid state - redirecting:', validation.errors)
      console.error('[CustomerInfoPage] Current state:', bookingState.state)
      
      // Redirect based on what's missing
      const state = bookingState.state
      if (!state.service) {
        console.log('[CustomerInfoPage] Missing service, redirecting to /booking')
        window.location.href = '/booking'
      } else if (!state.date || !state.time) {
        console.log('[CustomerInfoPage] Missing date/time, redirecting to /booking/date-time')
        window.location.href = '/booking/date-time'
      } else if (!state.staff || (state.bookingType === 'couples' && !state.secondaryStaff)) {
        console.log('[CustomerInfoPage] Missing staff, redirecting to staff selection')
        window.location.href = state.bookingType === 'couples' ? '/booking/staff-couples' : '/booking/staff'
      }
      return
    }
    
    console.log('[CustomerInfoPage] Validation passed, proceeding with customer info')
    
    const state = bookingState.state
    
    // Set data for display
    if (state.service) setSelectedService(state.service)
    if (state.date) setSelectedDate(state.date)
    if (state.time) setSelectedTime(state.time)
    if (state.staff) setSelectedStaff(state.staff.id)
  }, [])

  // Track page view
  useEffect(() => {
    analytics.pageViewed('customer_info', 4)
  }, [])

  const handleSubmit = async (data: CustomerFormData) => {
    // Track customer info submission
    analytics.customerInfoSubmitted(data.isNewCustomer, !!data.phone)
    
    // Track payment initiation for new customers
    if (data.isNewCustomer && selectedService) {
      analytics.paymentInitiated(true, selectedService.price)
    }
    
    // Store customer info using new state manager
    const customerInfo: CustomerInfo = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      notes: data.specialRequests,
      isNewCustomer: data.isNewCustomer
    }
    
    console.log('[CustomerInfoPage] Saving customer info:', customerInfo)
    bookingState.setCustomer(customerInfo)
    console.log('[CustomerInfoPage] Updated booking state:', bookingState.state)
    
    // Send new customer webhook to GHL if it's a new customer
    if (data.isNewCustomer && selectedService) {
      try {
        const serviceCategory = getServiceCategory(selectedService.name)
        const ghlCategory = getGHLServiceCategory(selectedService.name)
        const result = await ghlWebhookSender.sendNewCustomerWebhook(
          {
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            isNewCustomer: true
          },
          {
            service: selectedService.name,
            serviceCategory,
            ghlCategory,
            date: selectedDate,
            time: selectedTime,
            duration: selectedService.duration,
            price: selectedService.price,
            staff: selectedStaff ? (staffNameMap as any)[selectedStaff] || selectedStaff : 'Any Available'
          }
        )
        
        if (result.success) {
        } else {
          // Failed to send new customer data to GHL
        }
      } catch (error) {
        // Don't block the booking flow if GHL webhook fails
        // Error is logged in the webhook sender
      }
    }
    
    // Check if it's a couples booking using the new state manager
    const isCouplesBooking = bookingState.state.bookingType === 'couples'
    
    // DEBUG: Log the booking state
    console.log('[CustomerInfo] Booking State:', {
      bookingType: bookingState.state.bookingType,
      service: bookingState.state.service?.name,
      secondaryService: bookingState.state.secondaryService?.name,
      decision: isCouplesBooking ? 'COUPLES BOOKING' : 'SINGLE BOOKING'
    })

    // Check if service requires waiver before proceeding to payment
    const { requiresWaiver } = await import('@/lib/waiver-content')
    const waiverType = requiresWaiver(selectedService?.name || '')
    
    if (waiverType) {
      // Service requires waiver - redirect to waiver page
      console.log('Service requires waiver, redirecting to waiver page')
      window.location.href = '/booking/waiver'
      return
    }

    // No waiver required - proceed with normal flow
    proceedToPaymentOrConfirmation(data, isCouplesBooking)
  }

  const proceedToPaymentOrConfirmation = (data: CustomerFormData, isCouplesBooking: boolean) => {
    console.log('[CustomerInfo] Proceeding to payment/confirmation:', {
      isNewCustomer: data.isNewCustomer,
      isCouplesBooking: isCouplesBooking,
      bookingType: bookingState.state.bookingType
    })
    
    // Check customer status and redirect accordingly
    if (data.isNewCustomer) {
      // New customer - redirect to deposit payment link with return URL
      const baseUrl = window.location.origin
      const confirmationPage = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
      const returnUrl = `${baseUrl}${confirmationPage}?payment=success`
      const depositPaymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
      console.log('[CustomerInfo] New customer - redirecting to deposit payment')
      window.location.href = depositPaymentUrl
    } else {
      // Existing customer - redirect to payment selection page for deposit or pay-on-location choice
      console.log('[CustomerInfo] Existing customer - redirecting to payment selection')
      window.location.href = '/booking/payment-selection'
    }
  }

  // Helper function to get service category from service name
  const getServiceCategory = (serviceName: string): string => {
    const name = serviceName.toLowerCase()
    
    if (name.includes('facial')) return 'facial'
    if (name.includes('massage')) return 'massage'
    if (name.includes('scrub') || name.includes('treatment') || name.includes('moisturizing')) return 'body_treatment'
    if (name.includes('wax')) return 'waxing'
    if (name.includes('package')) return 'package'
    
    return 'facial' // default
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }


  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div>
              {/* Header */}
              <div className="text-center lg:text-left mb-8">
                <Link 
                  href={ (bookingState.state.bookingType === 'couples' ? '/booking/staff-couples' : '/booking/staff') as any } 
                  className="btn-tertiary !w-auto px-6 mb-6 inline-flex"
                >
                  ← Back to Staff Selection
                </Link>
                <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
                  Customer Information
                </h1>
                <p className="text-xl text-gray-600">
                  Please provide your contact details to complete your booking
                </p>
              </div>

              {/* Customer Form */}
              <CustomerForm onSubmit={handleSubmit} />
            </div>


          </div>
        </div>
      </div>
    </>
  )
}