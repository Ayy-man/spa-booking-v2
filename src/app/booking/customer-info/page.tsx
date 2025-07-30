'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerForm, { CustomerFormData } from '@/components/booking/CustomerForm'
import { staffNameMap } from '@/lib/staff-data'

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

  const handleSubmit = (data: CustomerFormData) => {
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
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking/staff" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Staff Selection
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Customer Information
          </h1>
          <p className="text-gray-600">
            Please provide your contact details
          </p>
        </div>

        {/* Booking Summary */}
        {selectedService && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-heading text-primary-dark mb-4">
              Booking Summary
            </h2>
            <div className="space-y-2 text-gray-600">
              <div><span className="font-medium">Service:</span> {selectedService.name}</div>
              <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
              <div><span className="font-medium">Time:</span> {selectedTime}</div>
              <div><span className="font-medium">Staff:</span> {staffNameMap[selectedStaff as keyof typeof staffNameMap]}</div>
              <div><span className="font-medium">Price:</span> ${selectedService.price}</div>
            </div>
          </div>
        )}

        {/* Customer Form */}
        <CustomerForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}