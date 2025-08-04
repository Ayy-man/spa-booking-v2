'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CreditCard as CreditCardIcon, Clock as ClockIcon, CheckCircle as CheckCircleIcon, Info as InformationCircleIcon } from 'lucide-react'
import { getPaymentLink, hasFullPaymentLink, generatePaymentUrl, DEPOSIT_PAYMENT_CONFIG } from '@/lib/payment-config'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

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
  const [selectedPaymentType, setSelectedPaymentType] = useState<'full' | 'deposit'>('full')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const customerData = localStorage.getItem('customerInfo')
    
    if (serviceData) {
      setSelectedService(JSON.parse(serviceData))
    }
    
    if (customerData) {
      const customer = JSON.parse(customerData)
      setCustomerInfo(customer)
      
      // Redirect new customers back to customer info page
      if (customer.isNewCustomer) {
        window.location.href = '/booking/customer-info'
        return
      }
    }
  }, [])

  const handlePaymentSubmit = async () => {
    if (!selectedService || !customerInfo) return
    
    setLoading(true)
    
    try {
      const baseUrl = window.location.origin
      const returnUrl = `${baseUrl}/booking/confirmation?payment=success`
      
      let paymentUrl: string
      
      if (selectedPaymentType === 'full') {
        const paymentLink = getPaymentLink(selectedService.name)
        paymentUrl = generatePaymentUrl(paymentLink.paymentUrl, returnUrl, {
          service_name: selectedService.name,
          customer_email: customerInfo.email,
          payment_type: 'full'
        })
      } else {
        // Use deposit payment
        paymentUrl = generatePaymentUrl(DEPOSIT_PAYMENT_CONFIG.paymentUrl, returnUrl, {
          service_name: selectedService.name,
          customer_email: customerInfo.email,
          payment_type: 'deposit'
        })
      }
      
      // Store payment type for confirmation page
      localStorage.setItem('paymentType', selectedPaymentType)
      
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

  const hasFullPayment = hasFullPaymentLink(selectedService.name)
  const fullPaymentLink = hasFullPayment ? getPaymentLink(selectedService.name) : null

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
              As an existing customer, you can pay in full or just the deposit
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

          {/* Payment Options */}
          <div className="space-y-4 mb-8">
            {/* Full Payment Option */}
            {hasFullPayment && fullPaymentLink && (
              <div 
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPaymentType === 'full' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-primary/50'
                }`}
                onClick={() => setSelectedPaymentType('full')}
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
                        Pay in Full Now
                      </h3>
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Pay the complete service amount now and your appointment is fully secured.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-primary">
                        ${fullPaymentLink.price.toFixed(2)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-green-700">
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>No balance due</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Guaranteed booking</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Payment Option */}
            <div 
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPaymentType === 'deposit' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-primary/50'
              }`}
              onClick={() => setSelectedPaymentType('deposit')}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <input
                    type="radio"
                    name="paymentType"
                    value="deposit"
                    checked={selectedPaymentType === 'deposit'}
                    onChange={() => setSelectedPaymentType('deposit')}
                    className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <ClockIcon className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Pay Deposit Only
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Pay a deposit now to secure your appointment. Pay the remaining balance at your appointment.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        ${DEPOSIT_PAYMENT_CONFIG.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance due: ${(selectedService.price - DEPOSIT_PAYMENT_CONFIG.price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info for services without full payment */}
            {!hasFullPayment && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      Deposit Payment Only
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This service currently only supports deposit payment. You can pay the remaining balance at your appointment.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                `Continue to Payment - $${
                  selectedPaymentType === 'full' 
                    ? (fullPaymentLink?.price || selectedService.price).toFixed(2)
                    : DEPOSIT_PAYMENT_CONFIG.price.toFixed(2)
                }`
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