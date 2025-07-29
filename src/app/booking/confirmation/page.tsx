'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ConfirmationPage() {
  const [bookingData, setBookingData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  useEffect(() => {
    // Get all booking data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')
    const staffData = localStorage.getItem('selectedStaff')
    const customerData = localStorage.getItem('customerInfo')

    if (serviceData && dateData && timeData && staffData && customerData) {
      const customer = JSON.parse(customerData)
      setBookingData({
        service: JSON.parse(serviceData),
        date: dateData,
        time: timeData,
        staff: staffData,
        customer: customer
      })
      
      // Check if this customer was marked as new (indicating they went through payment)
      // Also check URL parameters for payment success indicators
      const urlParams = new URLSearchParams(window.location.search)
      const paymentSuccess = urlParams.get('payment') === 'success'
      
      if (customer.isNewCustomer || paymentSuccess) {
        setPaymentCompleted(true)
      }
    }
  }, [])

  const handleConfirmBooking = async () => {
    if (!bookingData) return

    setIsSubmitting(true)
    setError('')

    try {
      // Simulate API call - in real app, this would save to Supabase
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate booking ID
      const bookingId = 'BK' + Date.now().toString().slice(-6)
      
      // Store booking in localStorage for demo
      const booking = {
        id: bookingId,
        ...bookingData,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem('lastBooking', JSON.stringify(booking))
      setIsSuccess(true)
      
      // Clear booking flow data
      localStorage.removeItem('selectedService')
      localStorage.removeItem('selectedDate')
      localStorage.removeItem('selectedTime')
      localStorage.removeItem('selectedStaff')
      localStorage.removeItem('customerInfo')
      
    } catch (err) {
      setError('Failed to confirm booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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

  const staffMembers = {
    'any': 'Any Available Staff',
    'selma': 'Selma Villaver',
    'robyn': 'Robyn Camacho',
    'tanisha': 'Tanisha Harris',
    'leonel': 'Leonel Sidon'
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl font-heading text-primary-dark mb-4">
            Booking Information Missing
          </h1>
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
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    🚨 DEMO BOOKING - NOT A REAL APPOINTMENT
                  </p>
                  <p className="text-sm">
                    This is a prototype system. No actual appointment has been scheduled.
                  </p>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-heading text-primary-dark mb-4">
              Demo Booking Confirmed!
            </h1>
            
            <p className="text-gray-600 mb-4">
              This demo booking has been recorded in your browser's local storage. In a production system, you would receive a confirmation email.
            </p>
            
            {paymentCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  <strong>Payment processed:</strong> Your $25 deposit has been applied to this booking. 
                  The remaining balance of ${bookingData.service.price - 25} will be due at your appointment.
                </p>
              </div>
            )}
            
            <div className="bg-accent rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-primary-dark mb-4">Booking Details</h2>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Service:</span> {bookingData.service.name}</div>
                <div><span className="font-medium">Date:</span> {formatDate(bookingData.date)}</div>
                <div><span className="font-medium">Time:</span> {bookingData.time}</div>
                <div><span className="font-medium">Staff:</span> {staffMembers[bookingData.staff as keyof typeof staffMembers]}</div>
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
                <p className="text-sm text-green-700">Your $25 deposit has been processed.</p>
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
                <p><span className="font-medium">Time:</span> {bookingData.time}</p>
                <p><span className="font-medium">Staff:</span> {staffMembers[bookingData.staff as keyof typeof staffMembers]}</p>
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
                {paymentCompleted && (
                  <p><span className="font-medium">Deposit Status:</span> <span className="text-green-600 font-medium">Paid ($25)</span></p>
                )}
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
        </div>
      </div>
    </div>
  )
}