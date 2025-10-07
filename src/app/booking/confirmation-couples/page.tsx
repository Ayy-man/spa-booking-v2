'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { staffNameMap } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { validateTimeForDatabase, parseTimeString } from '@/lib/time-utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
  marketingConsent?: boolean
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
    
    // Parse and validate time to prevent corruption
    const validatedTime = timeData ? parseTimeString(timeData) : null
    const staffData = localStorage.getItem('selectedStaff')
    const secondaryStaffData = localStorage.getItem('secondaryStaff')
    const customerData = localStorage.getItem('customerInfo')

    if (bookingDataStr) {
      const parsedBookingData = JSON.parse(bookingDataStr)
      setBookingData(parsedBookingData)
    }
    
    if (dateData) setSelectedDate(dateData)
    if (validatedTime) setSelectedTime(validatedTime)
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

        // Check availability first
        try {
          const availabilityCheck = await supabaseClient.checkCouplesAvailability({
            primary_service_id: primaryServiceData.id,
            secondary_service_id: secondaryServiceData.id,
            primary_staff_id: selectedStaff,
            secondary_staff_id: secondaryStaff || selectedStaff,
            booking_date: selectedDate,
            start_time: validateTimeForDatabase(selectedTime, 'start_time')
          })

          if (availabilityCheck && availabilityCheck[0] && !availabilityCheck[0].is_available) {
            console.error('Availability check failed:', availabilityCheck[0])
            throw new Error(availabilityCheck[0].error_message || 'Time slot is not available')
          }
        } catch (availError) {
          console.warn('Availability check failed or not available:', availError)
          // Continue anyway - the booking function will do its own checks
        }

        // Try to create the booking with retry logic
        let couplesResult = null
        let attempts = 0
        const maxAttempts = 3
        
        while (attempts < maxAttempts && !couplesResult) {
          attempts++
          try {
            
            couplesResult = await supabaseClient.processCouplesBooking({
              primary_service_id: primaryServiceData.id,
              secondary_service_id: secondaryServiceData.id,
              primary_staff_id: selectedStaff,
              secondary_staff_id: secondaryStaff || selectedStaff,
              customer_name: customerInfo.name,
              customer_email: customerInfo.email,
              customer_phone: customerInfo.phone,
              appointment_date: selectedDate,
              start_time: validateTimeForDatabase(selectedTime, 'start_time'),
              notes: customerInfo.specialRequests
            })
            
            if (!couplesResult || couplesResult.length === 0) {
              throw new Error('Couples booking failed - no bookings created')
            }

            // Check if any booking failed 
            const failedBooking = couplesResult.find((result: any) => result.success === false)
            if (failedBooking) {
              // If it's a staff availability issue and we have more attempts, wait and retry
              if (failedBooking.error_message?.includes('staff') && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)) // Exponential backoff
                couplesResult = null // Reset to trigger retry
                continue
              }
              throw new Error(failedBooking.error_message || 'Booking failed')
            }
            
            break // Success!
            
          } catch (error: any) {
            console.error(`Booking attempt ${attempts} failed:`, error)
            
            if (attempts === maxAttempts) {
              // Final attempt failed
              throw error
            }
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
            couplesResult = null // Reset for retry
          }
        }
        
        if (!couplesResult || couplesResult.length === 0) {
          throw new Error('Couples booking failed after all retry attempts')
        }

        // Filter successful bookings and format them
        const successfulBookings = couplesResult.filter((result: any) => result.success === true)
        if (successfulBookings.length === 0) {
          throw new Error('No successful bookings created')
        }

        // Format the results for frontend use
        const processedResults = successfulBookings.map((result: any) => ({
          booking_id: result.booking_id,
          room_id: result.room_id,
          booking_group_id: result.booking_group_id
        }))

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
          start_time: validateTimeForDatabase(selectedTime, 'start_time'),
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
      console.error('Couples booking error:', err)
      
      // Track booking error
      analytics.bookingError(
        'couples_booking_confirmation_failed',
        err.message || 'Unknown error',
        'couples_confirmation'
      )
      
      // Log error to database for debugging
      try {
        await fetch('/api/booking-errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error_type: 'couples_booking',
            error_message: err.message || 'Unknown error',
            error_details: {
              error: err.toString(),
              stack: err.stack,
              code: err.code,
              details: err.details
            },
            booking_data: {
              bookingData,
              selectedDate,
              selectedTime,
              selectedStaff,
              secondaryStaff,
              customerInfo
            },
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            customer_phone: customerInfo.phone,
            service_name: bookingData.primaryService?.name,
            service_id: bookingData.primaryService?.id,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            staff_name: selectedStaff,
            staff_id: selectedStaff,
            is_couples_booking: true,
            secondary_service_name: bookingData.secondaryService?.name,
            secondary_service_id: bookingData.secondaryService?.id,
            secondary_staff_name: secondaryStaff,
            secondary_staff_id: secondaryStaff,
            session_id: localStorage.getItem('sessionId') || undefined
          })
        })
      } catch (logError) {
        console.error('Failed to log booking error:', logError)
      }
      
      let errorMessage = 'Failed to confirm booking. '
      
      // Parse error message for better user feedback
      if (err.message?.includes('staff_not_available') || err.message?.includes('staff members are not available')) {
        errorMessage = 'One or more staff members are not available at this time. Please go back and select different staff.'
      } else if (err.message?.includes('No couples room available')) {
        errorMessage = 'Both couples rooms (Room 2 and Room 3) are booked at this time. Please select a different time slot.'
      } else if (err.message?.includes('Room is already booked') || err.message?.includes('Rooms 2 and 3 are both occupied')) {
        errorMessage = 'The couples rooms are not available at your selected time. This often happens during peak hours. Please try a different time slot.'
      } else if (err.message?.includes('no_couples_room')) {
        errorMessage = 'No couples rooms are available at this time. Please select a different time.'
      } else if (err.message?.includes('duplicate')) {
        errorMessage = 'A booking already exists for this time slot.'
      } else if (err.message?.includes('Failed to create primary booking')) {
        errorMessage = 'Unable to create the first booking. The selected time slot may no longer be available. Please try again.'
      } else if (err.message?.includes('Failed to create secondary booking')) {
        errorMessage = 'Unable to create the second booking. Please ensure both services can be accommodated at the selected time.'
      } else {
        // Show the actual error message if it's specific enough
        errorMessage = err.message || 'An unexpected error occurred. Please try again or contact support if the issue persists.'
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
    // Handle YYYY-MM-DD format by adding time component to avoid timezone issues
    const date = dateString.includes('T') 
      ? new Date(dateString)
      : new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTimeRange = (startTime: string, duration: number) => {
    if (!startTime || !duration) return startTime
    
    // Parse start time
    const [hours, minutes] = startTime.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes, 0, 0)
    
    // Calculate end time
    const end = new Date(start.getTime() + duration * 60000)
    
    // Format both times
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      })
    }
    
    return `${formatTime(start)} to ${formatTime(end)}`
  }

  // Show loading state while data is being loaded from localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 py-8 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-heading text-primary-dark dark:text-primary mb-4">
            Loading your booking details...
          </h1>
        </div>
      </div>
    )
  }

  // Show missing information only after loading is complete and data is actually missing
  if (!bookingData || !customerInfo) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 py-8 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl font-heading text-primary-dark dark:text-primary mb-4">
            Booking Information Missing
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
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
      <div className="min-h-screen bg-background dark:bg-gray-900 py-8 transition-colors duration-300">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-heading text-primary-dark dark:text-primary mb-4">
              {bookingData.isCouplesBooking ? 'Couples Booking Confirmed!' : 'Booking Confirmed!'}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your appointment{bookingData.isCouplesBooking ? 's have' : ' has'} been successfully booked. 
              You will receive a confirmation email shortly.
            </p>
            
            <div className="bg-accent dark:bg-gray-700 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-primary-dark dark:text-primary mb-4">Booking Details</h2>
              
              {bookingData.isCouplesBooking ? (
                <div className="space-y-4">
                  <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                    <h3 className="font-medium text-primary mb-2">Person 1</h3>
                    <div className="space-y-1 text-sm dark:text-gray-300">
                      <div><span className="font-medium">Service:</span> {bookingData.primaryService.name}</div>
                      <div><span className="font-medium">Staff:</span> {staffNameMap[selectedStaff as keyof typeof staffNameMap]}</div>
                    </div>
                  </div>
                  
                  <div className="pb-4">
                    <h3 className="font-medium text-primary mb-2">Person 2</h3>
                    <div className="space-y-1 text-sm dark:text-gray-300">
                      <div><span className="font-medium">Service:</span> {bookingData.secondaryService?.name || bookingData.primaryService.name}</div>
                      <div><span className="font-medium">Staff:</span> {staffNameMap[(secondaryStaff || selectedStaff) as keyof typeof staffNameMap]}</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-1 text-sm dark:text-gray-300">
                    <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
                    <div><span className="font-medium">Time:</span> {formatTimeRange(selectedTime, bookingData.primaryService.duration)}</div>
                    <div><span className="font-medium">Room:</span> Couples Room</div>
                    <div><span className="font-medium">Total Price:</span> ${bookingData.totalPrice}</div>
                    <div><span className="font-medium">Customer:</span> {customerInfo.name}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm dark:text-gray-300">
                  <div><span className="font-medium">Service:</span> {bookingData.primaryService.name}</div>
                  <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
                  <div><span className="font-medium">Time:</span> {formatTimeRange(selectedTime, bookingData.primaryService.duration)}</div>
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
    <div className="min-h-screen bg-background dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-start mb-6">
            <Link href="/booking/customer-info" className="text-primary hover:text-primary-dark transition-colors">
              ← Back to Customer Info
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark dark:text-primary mt-4 mb-2">
            Confirm Your {bookingData?.isCouplesBooking ? 'Couples ' : ''}Booking
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please review your booking details before confirming
          </p>
        </div>
        
        {/* Booking Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-heading text-primary-dark dark:text-primary mb-6">
            Booking Summary
          </h2>
          
          <div className="space-y-6">
            {/* Service Details */}
            {bookingData.isCouplesBooking ? (
              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                <h3 className="font-semibold text-primary-dark dark:text-primary mb-3">Services</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium dark:text-gray-100">Person 1: {bookingData.primaryService.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {bookingData.primaryService.duration} minutes • 
                        {staffNameMap[selectedStaff as keyof typeof staffNameMap]}
                      </p>
                    </div>
                    <p className="text-xl font-semibold">${bookingData.primaryService.price}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium dark:text-gray-100">
                        Person 2: {bookingData.secondaryService?.name || bookingData.primaryService.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
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
              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                <h3 className="font-semibold text-primary-dark dark:text-primary mb-2">Service</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium dark:text-gray-100">{bookingData.primaryService.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{bookingData.primaryService.duration} minutes</p>
                  </div>
                  <p className="text-2xl font-semibold text-primary">${bookingData.primaryService.price}</p>
                </div>
              </div>
            )}

            {/* Appointment Details */}
            <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
              <h3 className="font-semibold text-primary-dark dark:text-primary mb-2">Appointment</h3>
              <div className="space-y-1 dark:text-gray-300">
                <p><span className="font-medium">Date:</span> {formatDate(selectedDate)}</p>
                <p><span className="font-medium">Time:</span> {formatTimeRange(selectedTime, bookingData.primaryService.duration)}</p>
                {bookingData.isCouplesBooking && (
                  <p><span className="font-medium">Room:</span> Couples Room (Room 2 or 3)</p>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-primary-dark dark:text-primary mb-2">Customer Information</h3>
              <div className="space-y-1 dark:text-gray-300">
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
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-300">{error}</p>
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
                href="https://demo-spa.com/services" 
                className="text-primary hover:text-primary-dark transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                🌐 Explore More Services
              </a>
              <a 
                href="https://demo-spa.com" 
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