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
  id?: string
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
    if (!state.selectedDate || !state.selectedTime || !state.selectedStaff) {
      console.log('[CustomerInfoPage] Missing required booking data, redirecting to staff selection')
      // Check if it's a couples booking to redirect to the appropriate staff selection page
      if (state.bookingData?.isCouplesBooking) {
        window.location.href = '/booking/staff-couples'
      } else {
        window.location.href = '/booking/staff'
      }
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
    const isCouplesBooking = currentState?.bookingData?.isCouplesBooking || false
    
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

  const proceedToPaymentOrConfirmation = async (data: CustomerFormData, isCouplesBooking: boolean) => {
    // Check customer status and redirect accordingly
    if (data.isNewCustomer) {
      // New customer needs to pay deposit
      // Import supabase client
      const { supabaseClient } = await import('@/lib/supabase')
      const { validateTimeForDatabase } = await import('@/lib/time-utils')
      
      try {
        // Get optimal room assignment
        let roomId = 1 // Default to Room 1
        try {
          const roomAssignment = await supabaseClient.getOptimalRoomAssignment(
            selectedService?.id || '',
            selectedStaff,
            selectedDate,
            selectedTime
          )
          
          if (roomAssignment && roomAssignment.assigned_room_id) {
            roomId = typeof roomAssignment.assigned_room_id === 'string' 
              ? parseInt(roomAssignment.assigned_room_id) 
              : roomAssignment.assigned_room_id
          }
        } catch (roomError) {
          console.error('Room assignment error:', roomError)
        }

        // Create the booking with pending payment status
        const bookingResult = await supabaseClient.createBooking({
          service_id: selectedService?.id || '',
          staff_id: selectedStaff,
          room_id: roomId,
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone || undefined,
          appointment_date: selectedDate,
          start_time: validateTimeForDatabase(selectedTime, 'start_time'),
          notes: data.specialRequests || undefined,
          payment_option: 'deposit',
          payment_status: 'pending' // Will be updated to 'paid' after payment
        })
        
        if (!bookingResult || !bookingResult.booking_id) {
          throw new Error('Failed to create booking')
        }

        // Store booking ID in localStorage as backup
        localStorage.setItem('pendingBookingId', bookingResult.booking_id)
        
        // Store full booking data as additional backup
        const pendingBooking = {
          bookingId: bookingResult.booking_id,
          customerInfo: data,
          selectedService,
          selectedDate,
          selectedTime,
          selectedStaff,
          isCouplesBooking,
          createdAt: new Date().toISOString()
        }
        localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking))
        
        // Redirect to payment with booking ID in return URL
        const baseUrl = window.location.origin
        const returnUrl = `${baseUrl}/booking/confirmation?booking_id=${bookingResult.booking_id}&payment=success`
        const paymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
        
        // Redirect in SAME WINDOW
        window.location.replace(paymentUrl)
      } catch (error) {
        console.error('Failed to create booking:', error)
        // Fallback to old approach if booking creation fails
        const pendingBooking = {
          customerInfo: data,
          selectedService,
          selectedDate,
          selectedTime,
          selectedStaff,
          isCouplesBooking,
          createdAt: new Date().toISOString()
        }
        localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking))
        
        const baseUrl = window.location.origin
        const returnUrl = `${baseUrl}/booking/confirmation?payment=success`
        const paymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
        window.location.replace(paymentUrl)
      }
    } else {
      // Existing customer - go directly to confirmation (payment on location)
      if (isCouplesBooking) {
        // For couples booking, go directly to couples confirmation
        window.location.href = '/booking/confirmation-couples'
      } else {
        // Single booking - go directly to confirmation
        window.location.href = '/booking/confirmation'
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
                  href="/booking/staff" 
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