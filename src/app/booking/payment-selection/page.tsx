'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CreditCard as CreditCardIcon, Clock as ClockIcon, CheckCircle as CheckCircleIcon, Info as InformationCircleIcon } from 'lucide-react'
import { getPaymentLink, generatePaymentUrl, DEPOSIT_PAYMENT_CONFIG } from '@/lib/payment-config'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { loadBookingState, saveBookingState, getBookingSessionId } from '@/lib/booking-state-manager'

interface Service {
  name: string
  price: number
  duration: number
}

interface CustomerInfo {
  name: string
  email: string
  phone?: string
  isNewCustomer: boolean
}

export default function PaymentSelectionPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [selectedPaymentType, setSelectedPaymentType] = useState<'deposit' | 'location'>('deposit')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get data from state manager
    const state = loadBookingState()
    
    if (!state) {
      console.log('[PaymentSelectionPage] No booking state found, redirecting to service selection')
      window.location.href = '/booking'
      return
    }
    
    // Get service data
    if (state.bookingData?.primaryService) {
      setSelectedService(state.bookingData.primaryService)
    } else if (state.selectedService) {
      setSelectedService(state.selectedService)
    }
    
    // Get customer data
    if (state.customerInfo) {
      setCustomerInfo(state.customerInfo)
      
      // Redirect new customers back to customer info page
      if (state.customerInfo.isNewCustomer) {
        window.location.href = '/booking/customer-info'
        return
      }
    } else {
      console.log('[PaymentSelectionPage] No customer info found, redirecting to customer info')
      window.location.href = '/booking/customer-info'
      return
    }
  }, [])

  const handlePaymentSubmit = async () => {
    if (!selectedService || !customerInfo) return
    
    setLoading(true)
    
    try {
      // Store payment type using state manager
      saveBookingState({ paymentType: selectedPaymentType })
      
      if (selectedPaymentType === 'location') {
        // Pay on location - skip external payment and go straight to confirmation
        window.location.href = '/booking/confirmation?payment=location'
        return
      }
      
      const baseUrl = window.location.origin
      const sessionId = getBookingSessionId()
      const returnUrl = `${baseUrl}/booking/confirmation?payment=success&session=${sessionId}`
      
      // Always use deposit payment
      const paymentUrl = generatePaymentUrl(DEPOSIT_PAYMENT_CONFIG.paymentUrl, returnUrl, {
        service_name: selectedService.name,
        customer_email: customerInfo.email,
        payment_type: 'deposit'
      })
      
      // Redirect to payment
      window.location.href = paymentUrl
      
    } catch (error) {
      console.error('Error processing payment:', error)
      setLoading(false)
    }
  }

  if (!selectedService || !customerInfo) {
    return (
      <div className="min-h-screen bg-background section-spacing flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment options...</p>
        </div>
      </div>
    )
  }

  // Always use deposit payment

  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-8">
            <Link 
              href="/booking/customer-info" 
              className="btn-tertiary !w-auto px-6 mb-6 inline-flex"
            >
              ← Back to Customer Info
            </Link>
            <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
              Choose Payment Option
            </h1>
            <p className="text-xl text-gray-600">
              Choose how you would like to handle payment for your appointment
            </p>
          </div>

          {/* Service Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Booking</h2>
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-lg">{selectedService.name}</h3>
              <p className="text-gray-600">{selectedService.duration} minutes</p>
              <p className="text-2xl font-bold text-primary">${selectedService.price.toFixed(2)}</p>
            </div>
          </div>

          {/* Payment Options for Existing Customers */}
          <div className="space-y-4 mb-8">
            {/* Full Payment Option - Always show for existing customers */}
            <label 
              className={`block border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPaymentType === 'full' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <input
                    type="radio"
                    name="paymentType"
                    value="full"
                    checked={selectedPaymentType === 'full'}
                    onChange={() => setSelectedPaymentType('full')}
                    className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CreditCardIcon className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Pay in Full Now (${selectedService.price.toFixed(2)})
                    </h3>
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Pay the complete service amount now online. Your appointment is fully secured with no balance due.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      ${selectedService.price.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-green-700">
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Secure online payment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>No balance due</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </label>

            {/* Pay on Location Option */}
            <label 
              className={`block border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPaymentType === 'location' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <input
                    type="radio"
                    name="paymentType"
                    value="location"
                    checked={selectedPaymentType === 'location'}
                    onChange={() => setSelectedPaymentType('location')}
                    className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <ClockIcon className="w-6 h-6 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Pay on Location (${selectedService.price.toFixed(2)})
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Pay nothing now. Full payment of ${selectedService.price.toFixed(2)} will be collected when you arrive at the spa.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        $0.00 Now
                      </div>
                      <div className="text-sm text-gray-500">
                        Pay ${selectedService.price.toFixed(2)} at the spa
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>No advance payment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Flexible payment</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handlePaymentSubmit}
              disabled={loading}
              className="btn-primary px-12 py-4 text-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                selectedPaymentType === 'location' 
                  ? 'Complete Booking ($0 Now)' 
                  : `Continue to Payment - $${selectedService.price.toFixed(2)}`
              )}
            </button>
          </div>

          {/* Payment Security Notice */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              🔒 Secure payment processing by FastPayDirect
            </p>
            <p className="mt-1">
              Your payment information is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </>
  )
}