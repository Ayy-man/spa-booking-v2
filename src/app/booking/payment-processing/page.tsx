'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PaymentProcessingRedirect() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Extract parameters from the URL
    const paymentStatus = searchParams.get('payment_status')
    const bookingId = searchParams.get('booking_id')
    
    // Build the redirect URL to the new confirmation page
    let redirectUrl = '/booking/confirmation'
    const params = new URLSearchParams()
    
    if (bookingId) {
      params.append('booking_id', bookingId)
    }
    
    if (paymentStatus === 'success') {
      params.append('payment', 'success')
    } else if (paymentStatus === 'failed') {
      params.append('payment', 'failed')
    } else if (paymentStatus) {
      params.append('payment_status', paymentStatus)
    }
    
    if (params.toString()) {
      redirectUrl += '?' + params.toString()
    }
    
    // Redirect to the new confirmation page
    window.location.replace(redirectUrl)
  }, [searchParams])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
        <p className="text-gray-600">Processing payment...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting you to confirmation page...</p>
      </div>
    </div>
  )
}