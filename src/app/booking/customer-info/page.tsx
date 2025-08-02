'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerForm, { CustomerFormData } from '@/components/booking/CustomerForm'
import { staffNameMap } from '@/lib/staff-data'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'
import { generatePaymentUrl, PaymentType } from '@/lib/payment-config'
import { hasWaiverRequirements, areAllWaiversCompleted } from '@/lib/waiver-logic'

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
    // Get data from localStorage - check both single and couples booking formats
    const serviceData = localStorage.getItem('selectedService')
    const bookingDataStr = localStorage.getItem('bookingData')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')
    const staffData = localStorage.getItem('selectedStaff')

    // Handle couples booking data structure
    if (bookingDataStr) {
      const bookingData = JSON.parse(bookingDataStr)
      if (bookingData.primaryService) {
        setSelectedService(bookingData.primaryService)
      }
    } else if (serviceData) {
      // Handle regular booking data structure
      setSelectedService(JSON.parse(serviceData))
    }
    
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    if (staffData) setSelectedStaff(staffData)
  }, [])

  // Track page view
  useEffect(() => {
    analytics.pageViewed('customer_info', 4)
  }, [])

  const handleSubmit = async (data: CustomerFormData) => {
    // Track customer info submission
    analytics.customerInfoSubmitted(data.isNewCustomer, !!data.phone)
    
    // Track payment initiation for new customers
    if (data.isNewCustomer && selectedService) {
      analytics.paymentInitiated(true, selectedService.price)
    }
    
    // Store customer info
    localStorage.setItem('customerInfo', JSON.stringify(data))
    
    // Send new customer webhook to GHL if it's a new customer
    if (data.isNewCustomer && selectedService) {
      try {
        const serviceCategory = getServiceCategory(selectedService.name)
        const ghlCategory = getGHLServiceCategory(selectedService.name)
        const result = await ghlWebhookSender.sendNewCustomerWebhook(
          {
            name: data.name,
            email: data.email,
            phone: data.phone,
            isNewCustomer: true
          },
          {
            service: selectedService.name,
            serviceCategory,
            ghlCategory,
            date: selectedDate,
            time: selectedTime,
            duration: selectedService.duration,
            price: selectedService.price,
            staff: selectedStaff ? (staffNameMap as any)[selectedStaff] || selectedStaff : 'Any Available'
          }
        )
        
        if (result.success) {
        } else {
          // Failed to send new customer data to GHL
        }
      } catch (error) {
        // Don't block the booking flow if GHL webhook fails
        // Error is logged in the webhook sender
      }
    }
    
    // Check if it's a couples booking
    const bookingDataStr = localStorage.getItem('bookingData')
    const isCouplesBooking = bookingDataStr ? JSON.parse(bookingDataStr).isCouplesBooking : false
    
    // Ensure proper data structure before redirecting
    if (isCouplesBooking) {
      // For couples booking, ensure bookingData is properly structured with all necessary info
      const existingBookingData = bookingDataStr ? JSON.parse(bookingDataStr) : null
      if (existingBookingData && selectedService) {
        // Update bookingData with current service info to ensure consistency
        const updatedBookingData = {
          ...existingBookingData,
          primaryService: selectedService,
          // Ensure secondary service exists (same as primary if not different)
          secondaryService: existingBookingData.secondaryService || selectedService,
          totalPrice: existingBookingData.totalPrice || (selectedService.price * (existingBookingData.secondaryService ? 2 : 1))
        }
        localStorage.setItem('bookingData', JSON.stringify(updatedBookingData))
      }
    } else {
      // For regular booking, ensure selectedService is saved
      if (selectedService) {
        localStorage.setItem('selectedService', JSON.stringify(selectedService))
      }
    }

    // Store customer data for waiver step
    localStorage.setItem('customerData', JSON.stringify(data))

    // Get booking data to check for waiver requirements
    const currentBookingData = bookingDataStr ? JSON.parse(bookingDataStr) : 
      (selectedService ? { 
        isCouplesBooking: false, 
        primaryService: selectedService, 
        totalPrice: selectedService.price, 
        totalDuration: selectedService.duration 
      } : null)

    // Check if waivers are required
    if (currentBookingData && hasWaiverRequirements(currentBookingData)) {
      // Check if waivers are already completed
      if (!areAllWaiversCompleted(currentBookingData)) {
        // Redirect to waiver page
        window.location.href = '/booking/waiver'
        return
      }
    }

    // Calculate payment amount based on selection
    const paymentAmount = data.paymentType === 'full' ? (selectedService?.price || 0) : 25

    // Check customer status and redirect accordingly
    if (data.isNewCustomer || data.paymentType === 'full') {
      // Redirect to payment with selected amount
      const baseUrl = window.location.origin
      const confirmationPage = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
      const returnUrl = `${baseUrl}${confirmationPage}?payment=success&amount=${paymentAmount}&type=${data.paymentType}`
      const ghlPaymentUrl = generatePaymentUrl(paymentAmount, returnUrl)
      window.location.href = ghlPaymentUrl
    } else {
      // Existing customer choosing deposit - go to appropriate confirmation page  
      const confirmationPage = isCouplesBooking ? '/booking/confirmation-couples' : '/booking/confirmation'
      window.location.href = `${confirmationPage}?payment=none&amount=0&type=none`
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


  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div>
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
              <CustomerForm 
                onSubmit={handleSubmit} 
                servicePrice={selectedService?.price || 0}
              />
            </div>


          </div>
        </div>
      </div>
    </>
  )
}