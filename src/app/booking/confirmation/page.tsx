'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ConfettiExplosion from 'react-confetti-explosion'
import { staffNameMap } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'
import { loadBookingState, recoverBookingBySessionId, clearBookingState } from '@/lib/booking-state-manager'
import { validateTimeForDatabase, parseTimeString } from '@/lib/time-utils'

export default function ConfirmationPage() {
  const [bookingData, setBookingData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [paymentType, setPaymentType] = useState<'deposit' | 'full' | 'location'>('deposit')
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const loadBookingData = async () => {
      // Check URL parameters for session recovery
      const urlParams = new URLSearchParams(window.location.search)
      const bookingIdParam = urlParams.get('booking_id')
      const sessionId = urlParams.get('session')
      const paymentSuccess = urlParams.get('payment') === 'success'
      const paymentLocation = urlParams.get('payment') === 'location'
      
      let state = null
      let existingBookingId = null
      
      // FIRST: Check if we have a booking ID in URL (returning from payment)
      if (bookingIdParam && paymentSuccess) {
        try {
          // Fetch booking details from database
          const response = await fetch(`/api/bookings/${bookingIdParam}`)
          if (response.ok) {
            const bookingDetails = await response.json()
            
            // Update booking status to paid
            await fetch(`/api/bookings/${bookingIdParam}/payment-complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payment_status: 'paid' })
            })
            
            // Reconstruct state from booking details
            state = {
              selectedService: {
                id: bookingDetails.service_id,
                name: bookingDetails.service_name || bookingDetails.service?.name,
                price: bookingDetails.service_price || bookingDetails.service?.price || 0,
                duration: bookingDetails.service_duration || bookingDetails.service?.duration || 60
              },
              selectedDate: bookingDetails.appointment_date,
              selectedTime: bookingDetails.start_time,
              selectedStaff: bookingDetails.staff_id,
              customerInfo: {
                name: bookingDetails.customer_name,
                email: bookingDetails.customer_email,
                phone: bookingDetails.customer_phone,
                isNewCustomer: true, // Assume new customer if they went through payment
                specialRequests: bookingDetails.notes
              }
            }
            existingBookingId = bookingIdParam
            
            // Clear any pending booking data
            localStorage.removeItem('pendingBooking')
            localStorage.removeItem('pendingBookingId')
          }
        } catch (error) {
          console.error('Failed to fetch booking details:', error)
        }
      }
      
      // SECOND: Check if returning from payment without booking ID (fallback)
      if (!state && paymentSuccess) {
        // Try to get pending booking from localStorage
        const pendingBookingStr = localStorage.getItem('pendingBooking')
        if (pendingBookingStr) {
          try {
            const pendingBooking = JSON.parse(pendingBookingStr)
            // Reconstruct state from pending booking
            state = {
              selectedService: pendingBooking.selectedService,
              selectedDate: pendingBooking.selectedDate,
              selectedTime: pendingBooking.selectedTime,
              selectedStaff: pendingBooking.selectedStaff,
              customerInfo: pendingBooking.customerInfo,
              bookingData: pendingBooking.bookingData
            }
            existingBookingId = pendingBooking.bookingId
            // Clear pending booking
            localStorage.removeItem('pendingBooking')
            localStorage.removeItem('pendingBookingId')
          } catch (e) {
            console.error('Failed to parse pending booking:', e)
          }
        }
      }
      
      // Try to recover state by session ID if provided (for payment returns)
      if (!state && sessionId) {
        state = recoverBookingBySessionId(sessionId)
      }
      
      // Try to load normal state
      if (!state) {
        state = loadBookingState()
      }
      
      if (!state) {
        window.location.href = '/booking'
        return
      }
      
      // Validate we have all required data
      const service = state.bookingData?.primaryService || state.selectedService
      const customer = state.customerInfo
      
      if (service && state.selectedDate && state.selectedTime && state.selectedStaff && customer) {
        // Parse and validate the time to prevent "Invalid" errors
        const parsedTime = parseTimeString(state.selectedTime)
        
        setBookingData({
          service,
          date: state.selectedDate,
          time: parsedTime,
          staff: state.selectedStaff,
          customer,
          existingBookingId // Store the booking ID if we already have one
        })
        
        // Determine if payment was completed
        if (customer.isNewCustomer || paymentSuccess) {
          // New customer paid deposit
          setPaymentCompleted(true)
          setPaymentType('deposit')
        } else {
          // Existing customer - pay on location
          setPaymentCompleted(false)
          setPaymentType('location')
        }
      } else {
        // Redirect back to start if missing critical data
        window.location.href = '/booking'
        return
      }
      
      setIsLoading(false)
    }
    
    loadBookingData()
  }, [])

  const handleConfirmBooking = async () => {
    if (!bookingData) return

    setIsSubmitting(true)
    setError('')

    try {
      let bookingResult = null
      let bookingId = bookingData.existingBookingId

      // Check if we already have a booking (returning from payment)
      if (bookingId) {
        // Booking already exists, just use the existing ID
        bookingResult = { booking_id: bookingId }
      } else {
        // No existing booking, create a new one
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

        // Determine payment option and status
        // New customers = deposit paid, Existing customers = pay on location
        let paymentOption = 'pay_on_location'
        let paymentStatus = 'pending'
        
        if (bookingData.customer.isNewCustomer) {
          // New customer - deposit was paid
          paymentOption = 'deposit'
          paymentStatus = 'paid'
        } else {
          // Existing customer - pay on location
          paymentOption = 'pay_on_location'
          paymentStatus = 'pending'
        }

        // Create the booking in Supabase
        bookingResult = await supabaseClient.createBooking({
          service_id: bookingData.service.id,
          staff_id: bookingData.staff,
          room_id: roomId,
          customer_name: bookingData.customer.name,
          customer_email: bookingData.customer.email,
          customer_phone: bookingData.customer.phone || undefined,
          appointment_date: bookingData.date,
          start_time: validateTimeForDatabase(bookingData.time, 'start_time'),
          notes: bookingData.customer.specialRequests || undefined,
          payment_option: paymentOption,
          payment_status: paymentStatus
        })
        
        if (!bookingResult || !bookingResult.booking_id) {
          throw new Error('Booking was not created properly - no booking ID returned')
        }
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
      
      // Send booking confirmation webhook to GHL (only if it's a new booking)
      if (!bookingData.existingBookingId) {
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
              room: '1', // Default room for webhook
              roomId: '1' // Default room for webhook
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
      }
      
      setIsSuccess(true)
      
      // Trigger confetti animation with a slight delay for better UX
      setTimeout(() => {
        setShowConfetti(true)
      }, 500)
      
      // For full payment customers, add a second burst for extra celebration
      if (paymentType === 'full') {
        setTimeout(() => {
          setShowConfetti(false)
          setTimeout(() => setShowConfetti(true), 100) // Quick reset and retrigger
        }, 2000)
      }
      
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
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="bg-white rounded-xl shadow-md p-8 relative">
            {/* Confetti Animation */}
            {showConfetti && (
              <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <ConfettiExplosion
                  force={0.8}
                  duration={2800}
                  particleCount={paymentType === 'full' ? 120 : 80}
                  width={1200}
                  colors={[
                    '#10B981', // Emerald (success green)
                    '#3B82F6', // Blue  
                    '#8B5CF6', // Purple (spa luxury)
                    '#F59E0B', // Amber (gold accent)
                    '#EF4444', // Rose (warm accent)
                    '#06B6D4', // Cyan (spa blue)
                    '#84CC16'  // Lime (fresh green)
                  ]}
                />
              </div>
            )}
            
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    ✅ BOOKING CONFIRMED
                  </p>
                  <p className="text-sm">
                    Your appointment has been successfully scheduled.
                  </p>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-heading text-primary-dark mb-4">
              Booking Confirmed!
            </h1>
            
            <p className="text-gray-600 mb-4">
              Your appointment has been successfully booked. You will receive a confirmation email shortly.
            </p>
            
            {paymentCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                {paymentType === 'full' ? (
                  <p className="text-green-800 text-sm">
                    <strong>Full payment processed:</strong> Your ${bookingData.service.price} payment has been completed. 
                    No additional payment required at your appointment.
                  </p>
                ) : (
                  <p className="text-green-800 text-sm">
                    <strong>Deposit processed:</strong> Your $30 deposit has been applied to this booking. 
                    The remaining balance of ${bookingData.service.price - 30} will be due at your appointment.
                  </p>
                )}
              </div>
            )}

            {paymentType === 'location' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>No payment required now:</strong> Your appointment is confirmed with $0 payment. 
                  Please bring ${bookingData.service.price} to pay at the spa when you arrive for your appointment.
                </p>
              </div>
            )}
            
            <div className="bg-accent rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-primary-dark mb-4">Booking Details</h2>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Service:</span> {bookingData.service.name}</div>
                <div><span className="font-medium">Date:</span> {formatDate(bookingData.date)}</div>
                <div><span className="font-medium">Time:</span> {formatTimeRange(bookingData.time, bookingData.service.duration)}</div>
                <div><span className="font-medium">Staff:</span> {staffNameMap[bookingData.staff as keyof typeof staffNameMap] || bookingData.staff || 'Any Available Staff'}</div>
                <div><span className="font-medium">Price:</span> ${bookingData.service.price}</div>
                <div><span className="font-medium">Customer:</span> {bookingData.customer.name}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Link href="/" className="btn-primary block">
                Return to Home
              </Link>
              <Link href="/booking" className="btn-secondary block">
                Book Another Appointment
              </Link>
            </div>
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
                <p><span className="font-medium">Staff:</span> {staffNameMap[bookingData.staff as keyof typeof staffNameMap] || bookingData.staff || 'Any Available Staff'}</p>
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