'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { staffNameMap } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface Service {
  id?: string
  name: string
  price: number
  duration: number
}

interface BookingData {
  isCouplesBooking: boolean
  primaryService: Service
  secondaryService?: Service
  totalPrice: number
  totalDuration: number
}

interface CustomerInfo {
  name: string
  email: string
  phone?: string
  isNewCustomer?: boolean
  specialRequests?: string
}

export default function CouplesConfirmationPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [secondaryStaff, setSecondaryStaff] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [bookingResults, setBookingResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get all booking data from localStorage
    const bookingDataStr = localStorage.getItem('bookingData')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')
    const staffData = localStorage.getItem('selectedStaff')
    const secondaryStaffData = localStorage.getItem('secondaryStaff')
    const customerData = localStorage.getItem('customerInfo')

    if (bookingDataStr) {
      const parsedBookingData = JSON.parse(bookingDataStr)
      setBookingData(parsedBookingData)
    }
    
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    if (staffData) setSelectedStaff(staffData)
    if (secondaryStaffData) setSecondaryStaff(secondaryStaffData)
    
    if (customerData) {
      setCustomerInfo(JSON.parse(customerData))
    }
    
    // Set loading to false after attempting to load data
    setIsLoading(false)
  }, [])

  const handleConfirmBooking = async () => {
    if (!bookingData || !customerInfo) return

    setIsSubmitting(true)
    setError('')

    try {
      // Get services from database
      const services = await supabaseClient.getServices()
      
      // Map service names to IDs
      const primaryServiceData = services.find(s => 
        s.name.toLowerCase() === bookingData.primaryService.name.toLowerCase()
      )
      
      if (!primaryServiceData) {
        throw new Error('Primary service not found in database')
      }

      if (bookingData.isCouplesBooking) {
        // Handle couples booking
        const secondaryServiceData = bookingData.secondaryService 
          ? services.find(s => s.name.toLowerCase() === bookingData.secondaryService!.name.toLowerCase())
          : primaryServiceData // Same service for both

        if (!secondaryServiceData) {
          throw new Error('Secondary service not found in database')
        }

        // Use process_couples_booking function
        const couplesResult = await supabaseClient.processCouplesBooking({
          primary_service_id: primaryServiceData.id,
          secondary_service_id: secondaryServiceData.id,
          primary_staff_id: selectedStaff,
          secondary_staff_id: secondaryStaff || selectedStaff,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          appointment_date: selectedDate,
          start_time: selectedTime,
          notes: customerInfo.specialRequests
        })

        
        if (!couplesResult || couplesResult.length === 0) {
          throw new Error('Couples booking failed - no bookings created')
        }

        // Handle different possible result structures
        let bookingResults = []
        if (couplesResult[0] && couplesResult[0].booking_id) {
          // New structure from process_couples_booking_v2
          bookingResults = couplesResult
        } else if (couplesResult[0] && couplesResult[0].booking1_id) {
          // Old structure from process_couples_booking
          bookingResults = [
            {
              booking_id: couplesResult[0].booking1_id,
              room_id: couplesResult[0].room_id,
              booking_group_id: couplesResult[0].booking_group_id
            }
          ]
          if (couplesResult[0].booking2_id) {
            bookingResults.push({
              booking_id: couplesResult[0].booking2_id,
              room_id: couplesResult[0].room_id,
              booking_group_id: couplesResult[0].booking_group_id
            })
          }
        } else {
          throw new Error('Invalid booking result - unexpected format')
        }

        // Use the processed booking results
        const processedResults = bookingResults

        setBookingResults(processedResults)
        
        // Send booking confirmation webhooks to GHL for both bookings
        try {
          const serviceCategory1 = getServiceCategory(bookingData.primaryService.name)
          const serviceCategory2 = bookingData.secondaryService 
            ? getServiceCategory(bookingData.secondaryService.name)
            : serviceCategory1
          
          // Send webhook for primary booking
          const result1 = await ghlWebhookSender.sendBookingConfirmationWebhook(
            processedResults[0].booking_id,
            {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone || '',
              isNewCustomer: customerInfo.isNewCustomer || false
            },
            {
              service: bookingData.primaryService.name,
              serviceId: primaryServiceData.id,
              serviceCategory: serviceCategory1,
              date: selectedDate,
              time: selectedTime,
              duration: bookingData.primaryService.duration,
              price: bookingData.primaryService.price,
              staff: (staffNameMap as any)[selectedStaff] || selectedStaff,
              staffId: selectedStaff,
              room: `Room ${processedResults[0].room_id || '11111111-1111-1111-1111-111111111111'}`,
              roomId: (processedResults[0].room_id || 1).toString()
            }
          )
          
          // Send webhook for secondary booking if different service
          if (bookingData.secondaryService && bookingData.secondaryService.name !== bookingData.primaryService.name && processedResults.length > 1) {
            const result2 = await ghlWebhookSender.sendBookingConfirmationWebhook(
              processedResults[1].booking_id,
              {
                name: customerInfo.name + ' (Partner)',
                email: customerInfo.email,
                phone: customerInfo.phone || '',
                isNewCustomer: customerInfo.isNewCustomer || false
              },
              {
                service: bookingData.secondaryService.name,
                serviceId: secondaryServiceData.id,
                serviceCategory: serviceCategory2,
                date: selectedDate,
                time: selectedTime,
                duration: bookingData.secondaryService.duration,
                price: bookingData.secondaryService.price,
                staff: (staffNameMap as any)[secondaryStaff || selectedStaff] || secondaryStaff || selectedStaff,
                staffId: secondaryStaff || selectedStaff,
                room: `Room ${processedResults[1].room_id || 2}`,
                roomId: (processedResults[1].room_id || 2).toString()
              }
            )
          }
          
        } catch (error) {
          // Don't fail the booking if GHL webhook fails
          // Error is logged in the webhook sender
        }
  
      } else {
        // Handle single booking
        const roomAssignment = await supabaseClient.getOptimalRoomAssignment(
          primaryServiceData.id,
          selectedStaff,
          selectedDate,
          selectedTime
        )
        
        const roomId = roomAssignment?.assigned_room_id || 1

        const bookingResult = await supabaseClient.createBooking({
          service_id: primaryServiceData.id,
          staff_id: selectedStaff,
          room_id: roomId,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          appointment_date: selectedDate,
          start_time: selectedTime,
          notes: customerInfo.specialRequests
        })
        
        if (!bookingResult || !bookingResult.booking_id) {
          throw new Error('Booking was not created properly')
        }
        
        setBookingResults([bookingResult])
        
        // Send booking confirmation webhook to GHL for single booking
        try {
          const serviceCategory = getServiceCategory(bookingData.primaryService.name)
          const result = await ghlWebhookSender.sendBookingConfirmationWebhook(
            bookingResult.booking_id,
            {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone || '',
              isNewCustomer: customerInfo.isNewCustomer || false
            },
            {
              service: bookingData.primaryService.name,
              serviceId: primaryServiceData.id,
              serviceCategory,
              date: selectedDate,
              time: selectedTime,
              duration: bookingData.primaryService.duration,
              price: bookingData.primaryService.price,
              staff: (staffNameMap as any)[selectedStaff] || selectedStaff,
              staffId: selectedStaff,
              room: `Room ${roomId}`,
              roomId: roomId.toString()
            }
          )
          
        } catch (error) {
          // Don't fail the booking if GHL webhook fails
          // Error is logged in the webhook sender
        }
        
        // Track successful couples booking confirmation
        analytics.bookingConfirmed(
          bookingResult.booking_id,
          bookingData.totalPrice,
          `${bookingData.primaryService.name} + ${bookingData.secondaryService?.name || bookingData.primaryService.name}`,
          true // isCouples
        )
      }
      
      setIsSuccess(true)
      
      // Clear booking flow data
      localStorage.removeItem('bookingData')
      localStorage.removeItem('selectedService')
      localStorage.removeItem('selectedDate')
      localStorage.removeItem('selectedTime')
      localStorage.removeItem('selectedStaff')
      localStorage.removeItem('secondaryStaff')
      localStorage.removeItem('customerInfo')
      
    } catch (err: any) {
      
      // Track booking error
      analytics.bookingError(
        'couples_booking_confirmation_failed',
        err.message || 'Unknown error',
        'couples_confirmation'
      )
      
      let errorMessage = 'Failed to confirm booking. '
      if (err.message?.includes('staff_not_available')) {
        errorMessage = 'One or more staff members are not available at this time. Please go back and select different staff.'
      } else if (err.message?.includes('no_couples_room')) {
        errorMessage = 'No couples rooms are available at this time. Please select a different time.'
      } else if (err.message?.includes('duplicate')) {
        errorMessage = 'A booking already exists for this time slot.'
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
  if (!bookingData || !customerInfo) {
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
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-heading text-primary-dark mb-4">
              {bookingData.isCouplesBooking ? 'Couples Booking Confirmed!' : 'Booking Confirmed!'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              Your appointment{bookingData.isCouplesBooking ? 's have' : ' has'} been successfully booked. 
              You will receive a confirmation email shortly.
            </p>
            
            <div className="bg-accent rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-primary-dark mb-4">Booking Details</h2>
              
              {bookingData.isCouplesBooking ? (
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-primary mb-2">Person 1</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Service:</span> {bookingData.primaryService.name}</div>
                      <div><span className="font-medium">Staff:</span> {staffNameMap[selectedStaff as keyof typeof staffNameMap]}</div>
                    </div>
                  </div>
                  
                  <div className="pb-4">
                    <h3 className="font-medium text-primary mb-2">Person 2</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Service:</span> {bookingData.secondaryService?.name || bookingData.primaryService.name}</div>
                      <div><span className="font-medium">Staff:</span> {staffNameMap[(secondaryStaff || selectedStaff) as keyof typeof staffNameMap]}</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
                    <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
                    <div><span className="font-medium">Time:</span> {selectedTime}</div>
                    <div><span className="font-medium">Room:</span> Couples Room</div>
                    <div><span className="font-medium">Total Price:</span> ${bookingData.totalPrice}</div>
                    <div><span className="font-medium">Customer:</span> {customerInfo.name}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Service:</span> {bookingData.primaryService.name}</div>
                  <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
                  <div><span className="font-medium">Time:</span> {selectedTime}</div>
                  <div><span className="font-medium">Staff:</span> {staffNameMap[selectedStaff as keyof typeof staffNameMap]}</div>
                  <div><span className="font-medium">Price:</span> ${bookingData.primaryService.price}</div>
                  <div><span className="font-medium">Customer:</span> {customerInfo.name}</div>
                </div>
              )}
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
            Confirm Your {bookingData?.isCouplesBooking ? 'Couples ' : ''}Booking
          </h1>
          <p className="text-gray-600">
            Please review your booking details before confirming
          </p>
        </div>
        
        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-heading text-primary-dark mb-6">
            Booking Summary
          </h2>
          
          <div className="space-y-6">
            {/* Service Details */}
            {bookingData.isCouplesBooking ? (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-primary-dark mb-3">Services</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Person 1: {bookingData.primaryService.name}</p>
                      <p className="text-sm text-gray-600">
                        {bookingData.primaryService.duration} minutes • 
                        {staffNameMap[selectedStaff as keyof typeof staffNameMap]}
                      </p>
                    </div>
                    <p className="text-xl font-semibold">${bookingData.primaryService.price}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        Person 2: {bookingData.secondaryService?.name || bookingData.primaryService.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {(bookingData.secondaryService?.duration || bookingData.primaryService.duration)} minutes • 
                        {staffNameMap[(secondaryStaff || selectedStaff) as keyof typeof staffNameMap]}
                      </p>
                    </div>
                    <p className="text-xl font-semibold">
                      ${bookingData.secondaryService?.price || bookingData.primaryService.price}
                    </p>
                  </div>
                  
                  <div className="border-t pt-3 flex justify-between items-center">
                    <p className="font-semibold">Total</p>
                    <p className="text-2xl font-semibold text-primary">${bookingData.totalPrice}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-primary-dark mb-2">Service</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{bookingData.primaryService.name}</p>
                    <p className="text-sm text-gray-600">{bookingData.primaryService.duration} minutes</p>
                  </div>
                  <p className="text-2xl font-semibold text-primary">${bookingData.primaryService.price}</p>
                </div>
              </div>
            )}

            {/* Appointment Details */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-primary-dark mb-2">Appointment</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Date:</span> {formatDate(selectedDate)}</p>
                <p><span className="font-medium">Time:</span> {selectedTime}</p>
                {bookingData.isCouplesBooking && (
                  <p><span className="font-medium">Room:</span> Couples Room (Room 2 or 3)</p>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-primary-dark mb-2">Customer Information</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Name:</span> {customerInfo.name}</p>
                <p><span className="font-medium">Email:</span> {customerInfo.email}</p>
                {customerInfo.phone && (
                  <p><span className="font-medium">Phone:</span> {customerInfo.phone}</p>
                )}
                {customerInfo.specialRequests && (
                  <p><span className="font-medium">Special Requests:</span> {customerInfo.specialRequests}</p>
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