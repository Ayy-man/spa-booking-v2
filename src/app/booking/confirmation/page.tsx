'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SuccessConfetti } from '@/components/ui/success-confetti'
import { BookingConfirmationCard } from '@/components/ui/success-confirmation-card'
import { useToast, showSuccessToast } from '@/components/ui/toast-notification'
import { staffNameMap } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'
import { loadBookingState, recoverBookingBySessionId, clearBookingState } from '@/lib/booking-state-manager'

export default function ConfirmationPage() {
  const [bookingData, setBookingData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [paymentType, setPaymentType] = useState<'deposit' | 'full' | 'location'>('deposit')
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const { showToast } = useToast()

  // Ensure page starts at the top of the viewport on mount
  useEffect(() => {
    // Use rAF to run after paint for reliability on mobile browsers
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      } catch {
        // Fallbacks for older browsers
        window.scrollTo(0, 0)
      }
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    })
  }, [])

  useEffect(() => {
    // Check URL parameters for session recovery
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session')
    const paymentSuccess = urlParams.get('payment') === 'success'
    const paymentLocation = urlParams.get('payment') === 'location'
    
    let state = null
    
    // Try to recover state by session ID if provided (for payment returns)
    if (sessionId) {
      state = recoverBookingBySessionId(sessionId)
      console.log('[ConfirmationPage] Recovered state by session ID:', sessionId, state)
    } else {
      // Try to load normal state
      state = loadBookingState()
    }
    
    if (!state) {
      console.log('[ConfirmationPage] No booking state found, redirecting to service selection')
      window.location.href = '/booking'
      return
    }
    
    // Validate we have all required data
    const service = state.bookingData?.primaryService || state.selectedService
    const customer = state.customerInfo
    
    if (service && state.selectedDate && state.selectedTime && state.selectedStaff && customer) {
      setBookingData({
        service,
        date: state.selectedDate,
        time: state.selectedTime,
        staff: state.selectedStaff,
        customer
      })
      
      // Set payment type from state
      if (state.paymentType) {
        setPaymentType(state.paymentType)
      }
      
      // Determine if payment was completed
      if (customer.isNewCustomer || paymentSuccess) {
        setPaymentCompleted(true)
      }
      
      // For pay on location, payment is not completed yet
      if (paymentLocation || state.paymentType === 'location') {
        setPaymentCompleted(false)
      }
    } else {
      console.log('[ConfirmationPage] Missing required booking data:', { service, customer, date: state.selectedDate, time: state.selectedTime, staff: state.selectedStaff })
      // Redirect back to start if missing critical data
      window.location.href = '/booking'
      return
    }
    
    setIsLoading(false)
  }, [])

  const handleConfirmBooking = async () => {
    if (!bookingData) return

    setIsSubmitting(true)
    setError('')

    try {

      // First, get optimal room assignment
      let roomId = 1; // Default fallback to Room 1 (integer)
      try {
        const roomAssignment = await supabaseClient.getOptimalRoomAssignment(
          bookingData.service.id,
          bookingData.staff,
          bookingData.date,
          bookingData.time
        )
        
        if (roomAssignment && roomAssignment.assigned_room_id) {
          // Convert to integer if needed
          roomId = typeof roomAssignment.assigned_room_id === 'string' 
            ? parseInt(roomAssignment.assigned_room_id) 
            : roomAssignment.assigned_room_id
        }
      } catch (roomError) {
        // Continue with default room
      }

      // Determine payment option and status based on payment type
      let paymentOption = 'deposit'
      let paymentStatus = 'pending'
      
      if (paymentType === 'location') {
        paymentOption = 'pay_on_location'
        paymentStatus = 'pending' // Will be paid at location
      } else if (paymentType === 'full') {
        paymentOption = 'full_payment'
        paymentStatus = 'paid' // Already paid online
      } else {
        paymentOption = 'deposit'
        paymentStatus = 'paid' // Deposit already paid online
      }

      // Create the booking in Supabase
      const bookingResult = await supabaseClient.createBooking({
        service_id: bookingData.service.id,
        staff_id: bookingData.staff,
        room_id: roomId,
        customer_name: bookingData.customer.name,
        customer_email: bookingData.customer.email,
        customer_phone: bookingData.customer.phone || undefined,
        appointment_date: bookingData.date,
        start_time: bookingData.time,
        notes: bookingData.customer.specialRequests || undefined,
        payment_option: paymentOption,
        payment_status: paymentStatus
      })
      

      
      if (!bookingResult || !bookingResult.booking_id) {
        throw new Error('Booking was not created properly - no booking ID returned')
      }
      
      // Store booking result
      const booking = {
        id: bookingResult.booking_id,
        ...bookingData,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
      
      // Store last booking and clear current booking state
      localStorage.setItem('lastBooking', JSON.stringify(booking))
      clearBookingState()
      
      // Track successful booking confirmation
      analytics.bookingConfirmed(
        bookingResult.booking_id,
        bookingData.service.price,
        bookingData.service.name,
        false // isCouples
      )
      
      // Send booking confirmation webhook to GHL
      try {
        const serviceCategory = getServiceCategory(bookingData.service.name)
        const ghlCategory = getGHLServiceCategory(bookingData.service.name)
        const result = await ghlWebhookSender.sendBookingConfirmationWebhook(
          bookingResult.booking_id,
          {
            name: bookingData.customer.name,
            email: bookingData.customer.email,
            phone: bookingData.customer.phone || '',
            isNewCustomer: bookingData.customer.isNewCustomer || false
          },
          {
            service: bookingData.service.name,
            serviceId: bookingData.service.id,
            serviceCategory,
            ghlCategory,
            date: bookingData.date,
            time: bookingData.time,
            duration: bookingData.service.duration,
            price: bookingData.service.price,
            staff: (staffNameMap as any)[bookingData.staff] || bookingData.staff,
            staffId: bookingData.staff,
            room: roomId.toString(),
            roomId: roomId.toString()
          }
        )
        
        if (result.success) {
        } else {
          // Failed to send booking confirmation to GHL
        }
      } catch (error) {
        // Don't fail the booking if GHL webhook fails
        // Error is logged in the webhook sender
      }
      
      setIsSuccess(true)
      
      // Show success toast notification
      showSuccessToast(showToast)('Booking confirmed successfully!', {
        title: 'Success!',
        duration: 4000
      })
      
      // Trigger confetti animation with a slight delay for better UX
      setTimeout(() => {
        setShowConfetti(true)
      }, 500)
      
      // Show success card animation
      setTimeout(() => {
        setShowSuccessCard(true)
      }, 800)
      
      // Auto-hide confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false)
      }, 3500)
      
      // Clear booking flow data
      localStorage.removeItem('selectedService')
      localStorage.removeItem('selectedDate')
      localStorage.removeItem('selectedTime')
      localStorage.removeItem('selectedStaff')
      localStorage.removeItem('customerInfo')
      localStorage.removeItem('paymentType')
      
    } catch (err: any) {
      
      // Track booking error
      analytics.bookingError(
        'booking_confirmation_failed',
        err.message || 'Unknown error',
        'confirmation'
      )
      
      // Show more helpful error messages
      let errorMessage = 'Failed to confirm booking. '
      if (err.message?.includes('RPC')) {
        errorMessage += 'Database functions not configured. Please contact support.'
      } else if (err.message?.includes('duplicate')) {
        errorMessage += 'A booking already exists for this time slot.'
      } else if (err.message?.includes('permission')) {
        errorMessage += 'Permission denied. Please check your credentials.'
      } else {
        errorMessage += err.message || 'Please try again.'
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
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

  const formatTimeRange = (startTime: string, duration: number) => {
    if (!startTime || !duration) return startTime
    
    // Parse start time
    const [hours, minutes] = startTime.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes, 0, 0)
    
    // Calculate end time
    const end = new Date(start.getTime() + duration * 60000)
    
    // Format both times
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      })
    }
    
    return `${formatTime(start)} to ${formatTime(end)}`
  }


  // Show loading state while data is being loaded from localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-heading text-primary-dark mb-4">
            Loading your booking details...
          </h1>
        </div>
      </div>
    )
  }

  // Show missing information only after loading is complete and data is actually missing
  if (!bookingData) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl font-heading text-primary-dark mb-4">
            Booking Information Missing
          </h1>
          <p className="text-gray-600 mb-6">
            It looks like your booking session has expired or the booking data is incomplete.
          </p>
          <Link href="/booking" className="text-primary hover:text-primary-dark">
            ← Start New Booking
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    const getPaymentStatus = () => {
      if (paymentType === 'full') return 'paid'
      if (paymentType === 'location') return 'pending'
      return 'deposit'
    }
    
    return (
      <div className="min-h-screen bg-background py-8">
        {/* Enhanced Confetti Animation */}
        <SuccessConfetti
          isActive={showConfetti}
          duration={3000}
          particleCount={paymentType === 'full' ? 120 : 80}
          colors={[
            '#10B981', // Success green
            '#C36678', // Spa primary
            '#F6C7CF', // Spa accent
            '#3B82F6', // Blue
            '#8B5CF6', // Purple
            '#F59E0B', // Amber
            '#EF4444', // Rose
            '#06B6D4'  // Cyan
          ]}
          shapes={['circle', 'square', 'heart', 'star']}
        />
        
        <div className="container mx-auto px-4 max-w-2xl">
          <BookingConfirmationCard
            bookingData={{
              serviceName: bookingData.service.name,
              date: formatDate(bookingData.date),
              time: formatTimeRange(bookingData.time, bookingData.service.duration),
              staff: staffNameMap[bookingData.staff as keyof typeof staffNameMap] || bookingData.staff || 'Any Available Staff',
              price: bookingData.service.price,
              customerName: bookingData.customer.name
            }}
            paymentStatus={getPaymentStatus()}
            showAnimation={showSuccessCard}
            className="mb-8"
          />
          
          <div className="text-center space-y-4">
            <Link href="/" className="btn-primary block animate-gentle-bounce">
              Return to Home
            </Link>
            <Link href="/booking" className="btn-secondary block">
              Book Another Appointment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking/customer-info" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Customer Info
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Confirm Your Booking
          </h1>
          <p className="text-gray-600">
            Please review your booking details before confirming
          </p>
        </div>

        {/* Payment Status Banner (if applicable) */}
        {paymentCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">Payment Successful!</p>
                {paymentType === 'full' ? (
                  <p className="text-sm text-green-700">Your full payment of ${bookingData.service.price} has been processed.</p>
                ) : (
                  <p className="text-sm text-green-700">Your $30 deposit has been processed.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-heading text-primary-dark mb-6">
            Booking Summary
          </h2>
          
          <div className="space-y-6">
            {/* Service Details */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-primary-dark mb-2">Service</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{bookingData.service.name}</p>
                  <p className="text-sm text-gray-600">{bookingData.service.duration} minutes</p>
                </div>
                <p className="text-2xl font-semibold text-primary">${bookingData.service.price}</p>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-primary-dark mb-2">Appointment</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Date:</span> {formatDate(bookingData.date)}</p>
                <p><span className="font-medium">Time:</span> {formatTimeRange(bookingData.time, bookingData.service.duration)}</p>
                <p>
                  <span className="font-medium">Staff:</span> {staffNameMap[bookingData.staff as keyof typeof staffNameMap] || bookingData.staff || 'Any Available Staff'}
                  {(bookingData.staff === 'any' || bookingData.staff === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Staff will be assigned
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-primary-dark mb-2">Customer Information</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Name:</span> {bookingData.customer.name}</p>
                <p><span className="font-medium">Email:</span> {bookingData.customer.email}</p>
                {bookingData.customer.phone && (
                  <p><span className="font-medium">Phone:</span> {bookingData.customer.phone}</p>
                )}
                <p><span className="font-medium">Customer Type:</span> {bookingData.customer.isNewCustomer ? 'New Customer' : 'Returning Customer'}</p>
                <p><span className="font-medium">Payment Status:</span> 
                  {paymentCompleted ? (
                    paymentType === 'full' ? (
                      <span className="text-green-600 font-medium">Paid in Full (${bookingData.service.price})</span>
                    ) : (
                      <span className="text-green-600 font-medium">Deposit Paid ($30)</span>
                    )
                  ) : paymentType === 'location' ? (
                    <span className="text-blue-600 font-medium">Pay on Location (${bookingData.service.price})</span>
                  ) : (
                    <span className="text-gray-600 font-medium">Pending</span>
                  )}
                </p>
                {bookingData.customer.specialRequests && (
                  <p><span className="font-medium">Special Requests:</span> {bookingData.customer.specialRequests}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Special note for "any staff" bookings */}
        {(bookingData?.staff === 'any' || bookingData?.staff === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-900 mb-1">Staff Assignment</p>
                <p className="text-sm text-blue-800">
                  You selected &quot;Any Available Staff&quot; - our team will assign the best qualified staff member for your service. 
                  You&apos;ll receive confirmation with your assigned staff member details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Confirm Button */}
        <div className="space-y-4">
          <button
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900'
            }`}
          >
            {isSubmitting ? 'Confirming Booking...' : 'Confirm Booking'}
          </button>
          
          <Link href="/booking/customer-info" className="btn-secondary block text-center">
            Make Changes
          </Link>
          
          {/* Website Links */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm">
              <a 
                href="https://dermalskinclinicspa.com/services" 
                className="text-primary hover:text-primary-dark transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                🌐 Explore More Services
              </a>
              <a 
                href="https://dermalskinclinicspa.com" 
                className="text-gray-600 hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Our Website
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}