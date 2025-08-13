'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PaymentSimplePage() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Check if we're returning from payment with success
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status')
    const paymentSuccess = searchParams.get('payment') === 'success'
    
    if (paymentStatus === 'success' || paymentStatus === 'paid' || paymentSuccess) {
      // Payment successful! Mark booking as paid and redirect to confirmation
      handlePaymentSuccess()
    } else {
      // No success indicator - redirect to payment
      redirectToPayment()
    }
  }, [searchParams])
  
  const handlePaymentSuccess = async () => {
    // Get booking data from localStorage
    const bookingData = localStorage.getItem('pendingBooking')
    if (!bookingData) {
      window.location.href = '/booking/confirmation?payment=success'
      return
    }
    
    try {
      const booking = JSON.parse(bookingData)
      
      // Update booking status to paid (if we have booking ID)
      if (booking.bookingId) {
        await fetch(`/api/bookings/${booking.bookingId}/payment-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: 'paid' })
        })
      }
      
      // Clear storage
      localStorage.removeItem('pendingBooking')
      sessionStorage.removeItem('bookingIntent')
      
      // Redirect to confirmation
      window.location.href = '/booking/confirmation?payment=success'
    } catch (err) {
      // Even if update fails, still go to confirmation
      window.location.href = '/booking/confirmation?payment=success'
    }
  }
  
  const redirectToPayment = () => {
    // Simple redirect to payment with return URL
    const baseUrl = window.location.origin
    const returnUrl = `${baseUrl}/booking/payment-simple?payment_status=success`
    const paymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
    
    // Redirect in same window
    window.location.replace(paymentUrl)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing payment...</p>
      </div>
    </div>
  )
}