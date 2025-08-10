'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SuccessConfetti } from '@/components/ui/success-confetti'
import { CouplesBookingConfirmationCard } from '@/components/ui/success-confirmation-card'
import { useToast, showSuccessToast } from '@/components/ui/toast-notification'
import { staffNameMap } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { analytics } from '@/lib/analytics'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { resolveStaffForCouplesBooking } from '@/lib/booking-utils'

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
  const [showConfetti, setShowConfetti] = useState(false)
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const { showToast } = useToast()

  // Ensure page starts at the top of the viewport on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      } catch {
        window.scrollTo(0, 0)
      }
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    })
  }, [])

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
        // Handle couples booking with pre-validation
        const secondaryServiceData = bookingData.secondaryService 
          ? services.find(s => s.name.toLowerCase() === bookingData.secondaryService!.name.toLowerCase())
          : primaryServiceData // Same service for both

        if (!secondaryServiceData) {
          throw new Error('Secondary service not found in database')
        }

        // Pre-booking validation: Resolve staff assignments
        console.log('[CouplesBooking] Resolving staff for couples booking:', {
          selectedStaff,
          secondaryStaff,
          primaryService: bookingData.primaryService.name,
          secondaryService: bookingData.secondaryService?.name || bookingData.primaryService.name,
          selectedDate,
          selectedTime,
          primaryDuration: bookingData.primaryService.duration,
          secondaryDuration: bookingData.secondaryService?.duration || bookingData.primaryService.duration
        })

        const staffResolution = await resolveStaffForCouplesBooking(
          selectedStaff,
          secondaryStaff || selectedStaff,
          bookingData.primaryService.name,
          bookingData.secondaryService?.name || bookingData.primaryService.name,
          selectedDate,
          selectedTime,
          bookingData.primaryService.duration,
          bookingData.secondaryService?.duration || bookingData.primaryService.duration
        )

        console.log('[CouplesBooking] Staff resolution result:', staffResolution)

        if (!staffResolution.isValid) {
          const detailedError = staffResolution.error || 'Staff assignment validation failed'
          console.error('[CouplesBooking] Staff validation failed:', detailedError)
          
          // If the error is about same staff member and we don't have a secondary staff,
          // let the database function handle the error with better messaging
          if (detailedError.includes('Cannot book the same staff member') && !secondaryStaff) {
            console.log('[CouplesBooking] Bypassing same-staff validation - letting database function handle it')
            // Continue with the booking attempt - the database function will provide better error handling
          } else {
            // Try to provide more helpful error messages for other cases
            let userFriendlyError = detailedError
            if (detailedError.includes('already booked during this time')) {
              userFriendlyError = 'One or more staff members are not available at the requested time. Please select a different time slot or different staff members.'
            } else if (detailedError.includes('not available on')) {
              userFriendlyError = 'One or more staff members do not work on the selected date. Please choose a different date.'
            } else if (detailedError.includes('cannot perform')) {
              userFriendlyError = 'The selected staff members cannot perform the requested services. Please select different staff or services.'
            }
            
            throw new Error(userFriendlyError)
          }
        }

        // Use the resolved staff IDs instead of the original selections, or fallback to original if resolution failed
        const resolvedPrimaryStaffId = staffResolution.isValid ? staffResolution.primaryStaff.id : selectedStaff
        const resolvedSecondaryStaffId = staffResolution.isValid ? staffResolution.secondaryStaff.id : (secondaryStaff || selectedStaff)

        console.log('[CouplesBooking] Resolved staff IDs:', {
          original: { primary: selectedStaff, secondary: secondaryStaff },
          resolved: { primary: resolvedPrimaryStaffId, secondary: resolvedSecondaryStaffId },
          names: staffResolution.isValid ? 
            { primary: staffResolution.primaryStaff.name, secondary: staffResolution.secondaryStaff.name } :
            { primary: 'Unresolved', secondary: 'Unresolved' },
          validationPassed: staffResolution.isValid
        })

        // Only validate different staff if resolution was successful
        if (staffResolution.isValid && resolvedPrimaryStaffId === resolvedSecondaryStaffId) {
          throw new Error(`Cannot book the same staff member (${staffResolution.primaryStaff.name}) for both people. Please select different staff or different time slots.`)
        }

        // Use process_couples_booking function with resolved staff
        console.log('[CouplesBooking] Calling database function with:', {
          primary_service_id: primaryServiceData.id,
          secondary_service_id: secondaryServiceData.id,
          primary_staff_id: resolvedPrimaryStaffId,
          secondary_staff_id: resolvedSecondaryStaffId,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          appointment_date: selectedDate,
          start_time: selectedTime,
          notes: customerInfo.specialRequests,
          payment_option: 'deposit'
        })

        const couplesResult = await supabaseClient.processCouplesBooking({
          primary_service_id: primaryServiceData.id,
          secondary_service_id: secondaryServiceData.id,
          primary_staff_id: resolvedPrimaryStaffId,
          secondary_staff_id: resolvedSecondaryStaffId,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          appointment_date: selectedDate,
          start_time: selectedTime,
          notes: customerInfo.specialRequests,
          payment_option: 'deposit'  // Default to deposit for couples bookings
        })

        console.log('[CouplesBooking] Database function result:', couplesResult)

        
        if (!couplesResult || couplesResult.length === 0) {
          throw new Error('Couples booking failed - no bookings created')
        }

        // Check if any booking failed 
        const failedBooking = couplesResult.find((result: any) => result.success === false)
        if (failedBooking) {
          throw new Error(failedBooking.error_message || 'Booking failed')
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
              staff: staffResolution.primaryStaff.name,
              staffId: resolvedPrimaryStaffId,
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
                staff: staffResolution.secondaryStaff.name,
                staffId: resolvedSecondaryStaffId,
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
      
      // Show success toast notification
      showSuccessToast(showToast)('Couples booking confirmed successfully!', {
        title: 'Success!',
        duration: 4000
      })
      
      // Trigger confetti animation
      setTimeout(() => {
        setShowConfetti(true)
      }, 500)
      
      // Show success card animation
      setTimeout(() => {
        setShowSuccessCard(true)
      }, 800)
      
      // Auto-hide confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false)
      }, 3500)
      
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
      
      // Enhanced error message mapping for specific scenarios
      const errorText = err.message || ''
      
      if (errorText.includes('staff_not_available') || errorText.includes('is already booked')) {
        errorMessage = 'One or more staff members are not available at this time. Please go back and select different staff or a different time slot.'
      } else if (errorText.includes('no_couples_room') || errorText.includes('No couples rooms available')) {
        errorMessage = 'No couples rooms (Room 2 or Room 3) are available at this time. Please select a different time slot.'
      } else if (errorText.includes('Cannot book the same staff member')) {
        errorMessage = errorText + ' Please select different staff members or different time slots.'
      } else if (errorText.includes('must be resolved to actual staff member')) {
        errorMessage = 'There was an issue with staff assignment. Please go back and reselect your preferred staff members.'
      } else if (errorText.includes('cannot perform') || errorText.includes('not available who can perform')) {
        errorMessage = errorText + ' Please go back and select different staff members who can perform these services.'
      } else if (errorText.includes('does not work on')) {
        errorMessage = errorText + ' Please select a different date or different staff members.'
      } else if (errorText.includes('Selected room does not have capacity')) {
        errorMessage = 'The selected room cannot accommodate couples booking. Please try a different time slot.'
      } else if (errorText.includes('violates check constraint') || errorText.includes('check_duration_matches_times')) {
        errorMessage = 'There was a scheduling conflict with the service durations. Please try booking again or contact support.'
      } else if (errorText.includes('duplicate')) {
        errorMessage = 'A booking already exists for this time slot. Please select a different time.'
      } else if (errorText.includes('service not found')) {
        errorMessage = 'One of the selected services is no longer available. Please go back and reselect your services.'
      } else if (errorText.includes('Primary service not found') || errorText.includes('Secondary service not found')) {
        errorMessage = 'Selected service is no longer available. Please go back and reselect your services.'
      } else {
        // Default error with the original message if it's user-friendly, otherwise generic
        if (errorText.length > 0 && errorText.length < 200 && !errorText.includes('undefined') && !errorText.includes('null')) {
          errorMessage = errorText
        } else {
          errorMessage = 'Unable to confirm your booking at this time. Please try again or contact us for assistance.'
        }
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
        {/* Enhanced Confetti Animation */}
        <SuccessConfetti
          isActive={showConfetti}
          duration={3500}
          particleCount={150} // More particles for couples celebration
          colors={[
            '#10B981', // Success green
            '#C36678', // Spa primary
            '#F6C7CF', // Spa accent
            '#3B82F6', // Blue
            '#8B5CF6', // Purple
            '#F59E0B', // Amber
            '#EF4444', // Rose
            '#06B6D4', // Cyan
            '#84CC16'  // Lime
          ]}
          shapes={['circle', 'square', 'heart', 'star']}
        />
        
        <div className="container mx-auto px-4 max-w-2xl">
          <CouplesBookingConfirmationCard
            bookingData={{
              primaryService: bookingData.primaryService.name,
              secondaryService: bookingData.secondaryService?.name || bookingData.primaryService.name,
              date: formatDate(selectedDate),
              time: formatTimeRange(selectedTime, bookingData.primaryService.duration),
              primaryStaff: selectedStaff === 'any' ? 'Any Available Staff' : (staffNameMap[selectedStaff as keyof typeof staffNameMap] || 'Any Available Staff'),
              secondaryStaff: (secondaryStaff === 'any' || !secondaryStaff) ? 'Any Available Staff' : (staffNameMap[secondaryStaff as keyof typeof staffNameMap] || 'Any Available Staff'),
              totalPrice: bookingData.totalPrice,
              customerName: customerInfo.name
            }}
            showAnimation={showSuccessCard}
            className="mb-8"
          />
          
          <div className="text-center space-y-4">
            <Link href="/" className="btn-primary block animate-gentle-bounce">
              Return to Home
            </Link>
            <Link href="/booking" className="btn-secondary block">
              Book Another Appointment
            </Link>
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
                <p><span className="font-medium">Time:</span> {formatTimeRange(selectedTime, bookingData.primaryService.duration)}</p>
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