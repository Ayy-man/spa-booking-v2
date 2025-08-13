'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'
import { validateTimeForDatabase } from '@/lib/time-utils'
import { staffNameMap } from '@/lib/staff-data'

export default function PaymentProcessingPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'creating' | 'redirecting' | 'polling' | 'success' | 'error'>('creating')
  const [error, setError] = useState<string>('')
  const [bookingId, setBookingId] = useState<string>('')
  const [paymentUrl, setPaymentUrl] = useState<string>('')
  const [pollCount, setPollCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxPollAttempts = 60 // 2 minutes (60 * 2 seconds)

  useEffect(() => {
    createBookingAndRedirect()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const createBookingAndRedirect = async () => {
    try {
      // Get booking intent from session storage
      const bookingIntentStr = sessionStorage.getItem('bookingIntent')
      if (!bookingIntentStr) {
        setError('Booking information not found. Please start over.')
        setStatus('error')
        setTimeout(() => {
          window.location.href = '/booking'
        }, 3000)
        return
      }

      const bookingIntent = JSON.parse(bookingIntentStr)
      const { customerInfo, selectedService, selectedDate, selectedTime, selectedStaff, isCouplesBooking } = bookingIntent

      // Get optimal room assignment
      let roomId = 1 // Default to Room 1
      try {
        const roomAssignment = await supabaseClient.getOptimalRoomAssignment(
          selectedService.id,
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
        service_id: selectedService.id,
        staff_id: selectedStaff,
        room_id: roomId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || undefined,
        appointment_date: selectedDate,
        start_time: validateTimeForDatabase(selectedTime, 'start_time'),
        notes: customerInfo.specialRequests || undefined,
        payment_option: 'deposit',
        payment_status: 'pending' // Will be updated to 'paid' after webhook
      })
      
      if (!bookingResult || !bookingResult.booking_id) {
        throw new Error('Failed to create booking')
      }

      setBookingId(bookingResult.booking_id)
      
      // Store booking ID in session for recovery
      sessionStorage.setItem('currentBookingId', bookingResult.booking_id)
      
      // Build payment URL with booking_id and success parameters
      const baseUrl = window.location.origin
      
      // Success URL - marks payment as complete immediately
      const successUrl = `${baseUrl}/booking/payment-processing?booking_id=${bookingResult.booking_id}&payment_status=success`
      
      // Cancel/return URL - will poll for status
      const cancelUrl = `${baseUrl}/booking/payment-processing?booking_id=${bookingResult.booking_id}&status=return`
      
      // Add booking_id and return URLs to the payment link
      const depositPaymentUrl = `https://link.fastpaydirect.com/payment-link/688fd64ad6ab80e9dae7162b` +
        `?success_url=${encodeURIComponent(successUrl)}` +
        `&cancel_url=${encodeURIComponent(cancelUrl)}` +
        `&return_url=${encodeURIComponent(successUrl)}` +
        `&booking_id=${bookingResult.booking_id}`
      
      setPaymentUrl(depositPaymentUrl)
      setStatus('redirecting')
      
      // Redirect to payment after a short delay
      setTimeout(() => {
        window.location.href = depositPaymentUrl
      }, 2000)
      
    } catch (err) {
      console.error('Error creating booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      setStatus('error')
    }
  }

  // Check if returning from payment
  useEffect(() => {
    const bookingIdParam = searchParams.get('booking_id')
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status')
    const paymentSuccess = searchParams.get('payment') === 'success'
    
    // Try to get booking ID from URL or session storage
    const actualBookingId = bookingIdParam || sessionStorage.getItem('currentBookingId')
    
    if (!actualBookingId) {
      // No booking ID found anywhere
      setError('Booking information lost. Please contact support.')
      setStatus('error')
      return
    }
    
    // If we have clear success indicators from URL params, mark as paid immediately
    if (paymentStatus === 'success' || paymentStatus === 'paid' || paymentSuccess) {
      handlePaymentSuccess(actualBookingId)
    } else if (paymentStatus === 'return' || paymentStatus === 'cancelled') {
      // Fallback to polling if unclear or cancelled
      setBookingId(actualBookingId)
      setStatus('polling')
      startPollingPaymentStatus(actualBookingId)
    }
  }, [searchParams])

  const handlePaymentSuccess = async (bookingId: string) => {
    try {
      // Update booking status to paid
      const response = await fetch(`/api/bookings/${bookingId}/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_status: 'paid',
          payment_method: 'online',
          verification_source: 'url_params'
        })
      })
      
      if (response.ok) {
        setStatus('success')
        setBookingId(bookingId)
        
        // Clear session storage
        sessionStorage.removeItem('bookingIntent')
        sessionStorage.removeItem('currentBookingId')
        
        // Redirect to confirmation page
        setTimeout(() => {
          window.location.href = `/booking/confirmation?booking_id=${bookingId}&payment=success`
        }, 2000)
      } else {
        throw new Error('Failed to update booking status')
      }
    } catch (err) {
      console.error('Error updating payment status:', err)
      // Fallback to polling
      setBookingId(bookingId)
      setStatus('polling')
      startPollingPaymentStatus(bookingId)
    }
  }

  const startPollingPaymentStatus = (bookingId: string) => {
    // Poll every 2 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/payment-status`)
        if (!response.ok) throw new Error('Failed to check payment status')
        
        const data = await response.json()
        
        if (data.payment_status === 'paid') {
          // Payment confirmed!
          setStatus('success')
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          
          // Clear session storage
          sessionStorage.removeItem('bookingIntent')
          sessionStorage.removeItem('currentBookingId')
          
          // Redirect to confirmation page
          setTimeout(() => {
            window.location.href = `/booking/confirmation?booking_id=${bookingId}&payment=success`
          }, 2000)
        } else {
          // Still pending, continue polling
          setPollCount(prev => {
            const newCount = prev + 1
            if (newCount >= maxPollAttempts) {
              // Timeout after 2 minutes
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
              }
              setStatus('error')
              setError('Payment verification timed out. Please contact support if you completed the payment.')
            }
            return newCount
          })
        }
      } catch (err) {
        console.error('Error polling payment status:', err)
      }
    }, 2000)
  }

  const handleManualCheck = async () => {
    if (!bookingId) return
    
    setPollCount(0)
    setStatus('polling')
    startPollingPaymentStatus(bookingId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Creating Booking */}
        {status === 'creating' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Creating Your Booking</h2>
              <p className="text-gray-600">Please wait while we reserve your appointment...</p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          </div>
        )}

        {/* Redirecting to Payment */}
        {status === 'redirecting' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Created!</h2>
              <p className="text-gray-600 mb-2">Redirecting you to secure payment...</p>
              {bookingId && (
                <p className="text-sm text-gray-500">Booking ID: {bookingId}</p>
              )}
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </div>
        )}

        {/* Polling for Payment Status */}
        {status === 'polling' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600 mb-4">Please wait while we confirm your payment...</p>
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((pollCount / maxPollAttempts) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  Checking... ({Math.floor((maxPollAttempts - pollCount) * 2)} seconds remaining)
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Confirmed!</h2>
              <p className="text-gray-600">Your booking has been confirmed. Redirecting...</p>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">All set!</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h2>
              <p className="text-gray-600 mb-4">{error || 'An unexpected error occurred'}</p>
            </div>
            
            {bookingId && (
              <div className="space-y-3">
                <button
                  onClick={handleManualCheck}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Check Payment Status Again
                </button>
                <p className="text-sm text-gray-500">
                  Booking ID: {bookingId}
                </p>
                <p className="text-xs text-gray-400">
                  If you completed the payment, please click the button above or contact support.
                </p>
              </div>
            )}
            
            {!bookingId && (
              <button
                onClick={() => window.location.href = '/booking'}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Start Over
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}