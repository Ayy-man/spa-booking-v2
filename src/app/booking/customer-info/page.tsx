'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerForm, { CustomerFormData } from '@/components/booking/CustomerForm'
import { staffNameMap } from '@/lib/staff-data'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'
import { loadBookingState, saveBookingState } from '@/lib/booking-state-manager'

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

  useEffect(() => {
    // Get data from state manager
    const state = loadBookingState()
    
    if (!state) {
      console.log('[CustomerInfoPage] No booking state found, redirecting to service selection')
      window.location.href = '/booking'
      return
    }

    // Handle couples booking data structure
    if (state.bookingData?.primaryService) {
      setSelectedService(state.bookingData.primaryService)
    } else if (state.selectedService) {
      // Handle regular booking data structure
      setSelectedService(state.selectedService)
    }
    
    // Set other booking data
    if (state.selectedDate) setSelectedDate(state.selectedDate)
    if (state.selectedTime) setSelectedTime(state.selectedTime)
    if (state.selectedStaff) setSelectedStaff(state.selectedStaff)
    
    // Validate we have all required data for this step
    if (!state.selectedDate || !state.selectedTime || !state.selectedStaff || (state.bookingData?.isCouplesBooking && !state.secondaryStaff)) {
      console.log('[CustomerInfoPage] Missing required booking data, redirecting to staff selection')
      window.location.href = state.bookingData?.isCouplesBooking ? '/booking/staff-couples' : '/booking/staff'
      return
    }
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
    
    // Store customer info using state manager
    saveBookingState({ 
      customerInfo: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        isNewCustomer: data.isNewCustomer,
        specialRequests: data.specialRequests
      }
    })
    
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
    
    // Check if it's a couples booking and determine redirect
    const currentState = loadBookingState()
    
    // STRICT CHECK: Only treat as couples booking if explicitly set to true
    // AND there's a secondary service (for couples bookings)
    const rawIsCouplesBooking = currentState?.bookingData?.isCouplesBooking
    const hasSecondaryService = currentState?.bookingData?.secondaryService
    const isCouplesBooking = (rawIsCouplesBooking === true) && (hasSecondaryService != null)
    
    // DEBUG: Log the booking state to identify the issue
    console.log('[CustomerInfo] DEBUGGING BOOKING STATE:', {
      currentState,
      bookingData: currentState?.bookingData,
      rawIsCouplesBooking,
      hasSecondaryService: !!hasSecondaryService,
      isCouplesBookingFinal: isCouplesBooking,
      selectedService: selectedService?.name,
      localStorage_bookingData: localStorage.getItem('bookingData'),
      decision: isCouplesBooking ? 'COUPLES BOOKING' : 'SINGLE BOOKING'
    })
    
    // Ensure proper data structure before redirecting
    if (isCouplesBooking && currentState?.bookingData && selectedService) {
      // For couples booking, ensure bookingData is properly updated
      const updatedBookingData = {
        ...currentState.bookingData,
        primaryService: selectedService,
        // Ensure secondary service exists (same as primary if not different)
        secondaryService: currentState.bookingData.secondaryService || selectedService,
        totalPrice: currentState.bookingData.totalPrice || (selectedService.price * (currentState.bookingData.secondaryService ? 2 : 1))
      }
      saveBookingState({ bookingData: updatedBookingData })
    } else if (selectedService) {
      // For regular booking, ensure selectedService is saved
      saveBookingState({ selectedService })
    }

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
      bookingData: loadBookingState()?.bookingData
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
      if (isCouplesBooking) {
        // For couples booking, skip payment selection and go directly to confirmation
        console.log('[CustomerInfo] Existing customer couples booking - going to couples confirmation')
        window.location.href = '/booking/confirmation-couples'
      } else {
        // Single booking - offer payment choice between deposit and pay-on-location
        console.log('[CustomerInfo] Existing customer single booking - going to payment selection')
        window.location.href = '/booking/payment-selection'
      }
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
                  href={ (loadBookingState()?.bookingData?.isCouplesBooking ? '/booking/staff-couples' : '/booking/staff') as any } 
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