'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerForm, { CustomerFormData } from '@/components/booking/CustomerForm'
import { staffNameMap } from '@/lib/staff-data'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import BookingSummary from '@/components/booking/BookingSummary'
import { analytics } from '@/lib/analytics'

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
    // Get data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')
    const staffData = localStorage.getItem('selectedStaff')

    if (serviceData) setSelectedService(JSON.parse(serviceData))
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    if (staffData) setSelectedStaff(staffData)
  }, [])

  // Track page view
  useEffect(() => {
    analytics.pageViewed('customer_info', 4)
  }, [])

  const handleSubmit = (data: CustomerFormData) => {
    // Track customer info submission
    analytics.customerInfoSubmitted(data.isNewCustomer, !!data.phone)
    
    // Track payment initiation for new customers
    if (data.isNewCustomer && selectedService) {
      analytics.paymentInitiated(true, selectedService.price)
    }
    
    // Store customer info
    localStorage.setItem('customerInfo', JSON.stringify(data))
    
    // Check if it's a couples booking
    const bookingDataStr = localStorage.getItem('bookingData')
    const isCouplesBooking = bookingDataStr ? JSON.parse(bookingDataStr).isCouplesBooking : false
    
    // Check customer status and redirect accordingly
    if (data.isNewCustomer) {
      // New customer - redirect to GoHighLevel payment link with return URL
      const baseUrl = window.location.origin
      const confirmationPage = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
      const returnUrl = `${baseUrl}${confirmationPage}?payment=success`
      const ghlPaymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
      window.location.href = ghlPaymentUrl
    } else {
      // Existing customer - go to appropriate confirmation page
      window.location.href = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
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


  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
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

            {/* Sidebar - Booking Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <BookingSummary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}