'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { getAvailableStaff } from '@/lib/staff-data'
import { processTimeSlots, formatTimeToHHMM } from '@/lib/time-utils'
import { isTimeSlotBookable, createGuamDateTime } from '@/lib/timezone-utils'

import { InlineLoading } from '@/components/ui/loading-spinner'
import { TimeSlotSkeleton } from '@/components/ui/skeleton-loader'
import { analytics } from '@/lib/analytics'
import { loadBookingState, saveBookingState } from '@/lib/booking-state-manager'
import { validateAndRedirect } from '@/lib/booking-step-validation'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function DateTimePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<any>(null)
  const [bookingData, setBookingData] = useState<any>(null)
  const [loadingTimes, setLoadingTimes] = useState<boolean>(false)
  const [loadingService, setLoadingService] = useState<boolean>(true)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })) // Week starts on Monday
  const [weekDates, setWeekDates] = useState<Date[]>([])

  // Validate access and get booking data
  useEffect(() => {
    // Validate that user has selected a service (Step 1)
    if (!validateAndRedirect(2)) {
      return // Will redirect if validation fails
    }
    
    const state = loadBookingState()
    
    // We know state exists because validation passed
    if (state?.bookingData) {
      setBookingData(state.bookingData)
      setSelectedService(state.bookingData.primaryService)
    } else if (state?.selectedService) {
      // Convert individual service to booking data format
      const service = state.selectedService
      const bookingData = {
        isCouplesBooking: false,
        primaryService: service,
        totalPrice: service.price,
        totalDuration: service.duration
      }
      setBookingData(bookingData)
      setSelectedService(service)
      
      // Save the structured data for consistency
      saveBookingState({ bookingData })
    }
    
    setLoadingService(false)
  }, [])

  // Generate all available dates for reference (up to 4 weeks)
  useEffect(() => {
    if (!selectedService) return
    
    const dates = []
    for (let i = 0; i < 28; i++) { // 4 weeks = 28 days
      const date = addDays(new Date(), i)
      const dateString = format(date, 'yyyy-MM-dd')
      
      // Check if any staff are available for this service on this date
      const availableStaff = getAvailableStaff(selectedService.name, dateString)
      
      // Only include dates where at least one staff member is available
      if (availableStaff.length > 0) {
        dates.push(date)
      }
    }
    setAvailableDates(dates)
  }, [selectedService])

  // Generate week dates based on current week start
  useEffect(() => {
    if (!selectedService || availableDates.length === 0) return
    
    const weekStart = currentWeekStart
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    // Filter available dates for current week
    const currentWeekDates = availableDates.filter(date => 
      date >= weekStart && date <= weekEnd
    )
    
    setWeekDates(currentWeekDates)
  }, [currentWeekStart, availableDates, selectedService])

  // Additional validation - ensure we have service data after loading
  useEffect(() => {
    if (!loadingService && !selectedService) {
      window.location.href = '/booking'
    }
  }, [selectedService, loadingService])

  // Track page view
  useEffect(() => {
    if (!loadingService) {
      analytics.pageViewed('date_time_selection', 2)
    }
  }, [loadingService])

  // Navigation functions for week browsing
  const goToPreviousWeek = () => {
    const previousWeek = subWeeks(currentWeekStart, 1)
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    
    // Don't allow going to weeks before current week
    if (previousWeek >= today) {
      setCurrentWeekStart(previousWeek)
    }
  }

  const goToNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1)
    const maxWeek = startOfWeek(addDays(new Date(), 28), { weekStartsOn: 1 }) // 4 weeks ahead
    
    // Don't allow going beyond 4 weeks
    if (nextWeek <= maxWeek) {
      setCurrentWeekStart(nextWeek)
    }
  }

  // Check if navigation is available
  const canGoToPreviousWeek = () => {
    const previousWeek = subWeeks(currentWeekStart, 1)
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    return previousWeek >= today
  }

  const canGoToNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1)
    const maxWeek = startOfWeek(addDays(new Date(), 28), { weekStartsOn: 1 })
    return nextWeek <= maxWeek
  }

  // Format week range for display
  const getWeekRangeText = () => {
    const weekStart = currentWeekStart
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
    } else {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
  }

  const generateFallbackTimes = useCallback(() => {
    const times = []
    const serviceDuration = selectedService?.duration || 60
    const bufferMinutes = 15
    
    // Start at 9:00 AM
    let currentTime = new Date(selectedDate!)
    currentTime.setHours(9, 0, 0, 0)
    
    const closingTime = new Date(selectedDate!)
    closingTime.setHours(19, 0, 0, 0)
    
    while (currentTime < closingTime) {
      // Check if this time slot can fit before closing
      const endTime = new Date(currentTime)
      endTime.setMinutes(endTime.getMinutes() + serviceDuration)
      
      if (endTime <= closingTime) {
        const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
        
        // Check if this time slot meets the 2-hour advance booking requirement
        const slotDateTime = createGuamDateTime(format(selectedDate!, 'yyyy-MM-dd'), timeString)
        if (isTimeSlotBookable(slotDateTime)) {
          times.push(timeString)
        }
        
        // Move to next slot: For services 60 minutes or longer, increment by 30 minutes
        // For shorter services, increment by 15 minutes
        const incrementMinutes = serviceDuration >= 60 ? 30 : 15
        currentTime.setMinutes(currentTime.getMinutes() + incrementMinutes)
      } else {
        break
      }
    }
    
    setAvailableTimes(times)
    setLoadingTimes(false)
  }, [selectedDate, selectedService])

  const fetchAvailableTimeSlotsFromSupabase = useCallback(async () => {
    if (!selectedDate || !selectedService) return
    
    setLoadingTimes(true)
    try {
      const { supabaseClient } = await import('@/lib/supabase')
      
      // Get the service from Supabase to get the correct ID
      const services = await supabaseClient.getServices()
      const matchingService = services.find(s => 
        s.name.toLowerCase() === selectedService.name.toLowerCase()
      )
      
      if (!matchingService) {
        // Fallback to simple time generation
        generateFallbackTimes()
        setLoadingTimes(false)
        return
      }
      
      // Get existing bookings for the selected date
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      const existingBookings = await supabaseClient.getBookingsByDate(dateString)
      
      // Get all staff members
      const allStaff = await supabaseClient.getStaff()
      
      // Filter staff who can perform this service
      const availableStaff = getAvailableStaff(selectedService.name, dateString)
      
      // Generate time slots based on service duration and buffer
      const times = []
      
      // For couples bookings, use the total duration of both services
      let serviceDuration = matchingService.duration || 60
      if (bookingData?.isCouplesBooking && bookingData.secondaryService) {
        serviceDuration = Math.max(matchingService.duration, bookingData.secondaryService.duration) || 60
      }
      
      const bufferMinutes = 15
      
      // Start at 9:00 AM
      let currentTime = new Date(selectedDate)
      currentTime.setHours(9, 0, 0, 0)
      
      const closingTime = new Date(selectedDate)
      closingTime.setHours(19, 0, 0, 0) // 7 PM close
      
      // Generate slots with proper spacing
      while (currentTime < closingTime) {
        // Check if this time slot can fit before closing
        const endTime = new Date(currentTime)
        endTime.setMinutes(endTime.getMinutes() + serviceDuration)
        
        if (endTime <= closingTime) {
          const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
          
          // Check if this time slot meets the 2-hour advance booking requirement
          const slotDateTime = createGuamDateTime(format(selectedDate, 'yyyy-MM-dd'), timeString)
          if (!isTimeSlotBookable(slotDateTime)) {
            // Skip this slot as it doesn't meet the 2-hour advance requirement
            const incrementMinutes = serviceDuration >= 60 ? 30 : 15
            currentTime.setMinutes(currentTime.getMinutes() + incrementMinutes)
            continue
          }
          
          // Check if at least one staff member is available at this time
          let hasAvailableStaff = false
          
          for (const staff of availableStaff) {
            // Check if this staff member has any bookings at this time
            const staffBookings = existingBookings.filter(b => b.staff_id === staff.id)
            
            let isStaffAvailable = true
            for (const booking of staffBookings) {
              const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
              const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
              const slotStart = new Date(`2000-01-01T${timeString}:00`)
              const slotEnd = new Date(`2000-01-01T${timeString}:00`)
              slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)
              
              // Add buffer time to existing bookings
              bookingStart.setMinutes(bookingStart.getMinutes() - bufferMinutes)
              bookingEnd.setMinutes(bookingEnd.getMinutes() + bufferMinutes)
              
              // Check for overlap including buffer zones
              // If booking has buffer times, use those; otherwise fall back to calculated buffers
              const bufferStart = booking.buffer_start 
                ? new Date(`2000-01-01T${booking.buffer_start}`)
                : bookingStart
              const bufferEnd = booking.buffer_end
                ? new Date(`2000-01-01T${booking.buffer_end}`)
                : bookingEnd
              
              // Check if the new slot overlaps with the buffer zone
              if (slotStart < bufferEnd && slotEnd > bufferStart) {
                isStaffAvailable = false
                break
              }
            }
            
            if (isStaffAvailable) {
              // Check room availability - try to find ANY available room that can handle this service
              const requiresRoom3 = matchingService.requires_room_3 || 
                                   matchingService.category === 'body_scrub'
              
              let roomFound = false
              
              if (requiresRoom3) {
                // Body scrubs MUST use Room 3
                const roomBookings = existingBookings.filter(b => b.room_id === 3)
                
                let isRoom3Available = true
                for (const booking of roomBookings) {
                  const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
                  const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
                  const slotStart = new Date(`2000-01-01T${timeString}:00`)
                  const slotEnd = new Date(`2000-01-01T${timeString}:00`)
                  slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)
                  
                  // Check for overlap including buffer zones
                  // If booking has buffer times, use those; otherwise fall back to calculated buffers
                  const bufferStart = booking.buffer_start 
                    ? new Date(`2000-01-01T${booking.buffer_start}`)
                    : new Date(bookingStart.getTime() - bufferMinutes * 60000)
                  const bufferEnd = booking.buffer_end
                    ? new Date(`2000-01-01T${booking.buffer_end}`)
                    : new Date(bookingEnd.getTime() + bufferMinutes * 60000)
                  
                  // Check if the new slot overlaps with the buffer zone
                  if (slotStart < bufferEnd && slotEnd > bufferStart) {
                    isRoom3Available = false
                    break
                  }
                }
                roomFound = isRoom3Available
              } else {
                // For non-body-scrub services, check ALL rooms (1, 2, and 3) for availability
                const roomsToCheck = [1, 2, 3]
                
                for (const roomId of roomsToCheck) {
                  const roomBookings = existingBookings.filter(b => b.room_id === roomId)
                  
                  let isRoomAvailable = true
                  for (const booking of roomBookings) {
                    const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
                    const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
                    const slotStart = new Date(`2000-01-01T${timeString}:00`)
                    const slotEnd = new Date(`2000-01-01T${timeString}:00`)
                    slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)
                    
                    // Check for overlap including buffer zones
                    // If booking has buffer times, use those; otherwise fall back to calculated buffers
                    const bufferStart = booking.buffer_start 
                      ? new Date(`2000-01-01T${booking.buffer_start}`)
                      : new Date(bookingStart.getTime() - bufferMinutes * 60000)
                    const bufferEnd = booking.buffer_end
                      ? new Date(`2000-01-01T${booking.buffer_end}`)
                      : new Date(bookingEnd.getTime() + bufferMinutes * 60000)
                    
                    // Check if the new slot overlaps with the buffer zone
                    if (slotStart < bufferEnd && slotEnd > bufferStart) {
                      isRoomAvailable = false
                      break
                    }
                  }
                  
                  if (isRoomAvailable) {
                    roomFound = true
                    break // Found an available room, no need to check others
                  }
                }
              }
              
              if (roomFound) {
                hasAvailableStaff = true
                break
              }
            }
          }
          
          // Only add this time slot if at least one staff member and room is available
          if (hasAvailableStaff) {
            times.push(timeString)
          }
          
          // Move to next slot: For services 60 minutes or longer, increment by 30 minutes
          // For shorter services, increment by 15 minutes
          const incrementMinutes = serviceDuration >= 60 ? 30 : 15
          currentTime.setMinutes(currentTime.getMinutes() + incrementMinutes)
        } else {
          break
        }
      }
      
      setAvailableTimes(times)
      setLoadingTimes(false)
    } catch (error: any) {
      console.error('Error fetching available time slots:', error)
      
      // Log error to database for debugging via API
      try {
        await fetch('/api/booking-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error_type: 'date_time_selection',
            error_message: error.message || 'Failed to fetch available time slots',
            error_details: {
              error: error.toString(),
              stack: error.stack,
              code: error.code,
              details: error.details,
              step: 'date_time_selection'
            },
            booking_data: {
              service: selectedService,
              date: selectedDate,
              step: 'date_time_selection'
            },
            customer_name: bookingData?.customer?.name,
            customer_email: bookingData?.customer?.email,
            customer_phone: bookingData?.customer?.phone,
            service_name: selectedService?.name,
            service_id: selectedService?.id,
            appointment_date: selectedDate?.toISOString(),
            is_couples_booking: bookingData?.isCouplesBooking || false,
            session_id: localStorage.getItem('sessionId') || undefined
          })
        })
      } catch (logError) {
        console.error('Failed to log booking error:', logError)
      }
      
      // Fallback to simple time generation
      generateFallbackTimes()
    } finally {
      setLoadingTimes(false)
    }
  }, [selectedDate, selectedService, bookingData, generateFallbackTimes])

  // Generate available times based on selected date using Supabase
  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchAvailableTimeSlotsFromSupabase()
    }
  }, [selectedDate, selectedService, fetchAvailableTimeSlotsFromSupabase])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('') // Reset time when date changes
    // Track date selection
    if (selectedService) {
      analytics.dateTimeSelected(format(date, 'yyyy-MM-dd'), '', selectedService.name)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    // Track time selection
    if (selectedService && selectedDate) {
      analytics.dateTimeSelected(format(selectedDate, 'yyyy-MM-dd'), time, selectedService.name)
    }
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      // Store date and time using state manager - using YYYY-MM-DD format to avoid timezone issues
      saveBookingState({
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime: selectedTime
      })
      
      // Track date/time selection
      analytics.track('date_time_selected', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        service: selectedService?.name || 'unknown'
      })
      
      // Check if it's a couples booking
      if (bookingData?.isCouplesBooking) {
        window.location.href = '/booking/staff-couples'
        return
      }
      
      // Navigate to regular staff selection
      window.location.href = '/booking/staff'
    }
  }

  // Show loading screen while service is being loaded
  if (loadingService) {
    return (
      <>
        <BookingProgressIndicator />
        <div className="min-h-screen bg-background section-spacing">
          <div className="container mx-auto px-6 max-w-6xl">
            <InlineLoading text="Loading your service selection..." />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background dark:bg-gray-900 section-spacing transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center lg:text-left">
                <div className="flex justify-between items-start mb-6">
                  <Link 
                    href="/booking" 
                    className="btn-tertiary !w-auto px-6 inline-flex"
                  >
                    ← Back to Services
                  </Link>
                  <ThemeToggle className="flex-shrink-0 ml-4" />
                </div>
                <h1 className="text-4xl md:text-5xl font-heading text-primary dark:text-primary mb-4">
                  Select Date & Time
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Choose your preferred appointment date and time
                </p>
              </div>

              {/* Date Selection */}
              <div className="card dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-3xl font-heading font-bold text-primary dark:text-primary mb-8">
                  Select Date
                </h2>
                
                {/* Week Navigation Header */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={goToPreviousWeek}
                    disabled={!canGoToPreviousWeek()}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                      canGoToPreviousWeek()
                        ? 'bg-primary text-white hover:bg-primary-dark hover:scale-105 active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {getWeekRangeText()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Week {weekDates.length > 0 ? `(${weekDates.length} days available)` : '(no dates available)'}
                    </div>
                  </div>
                  
                  <button
                    onClick={goToNextWeek}
                    disabled={!canGoToNextWeek()}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                      canGoToNextWeek()
                        ? 'bg-primary text-white hover:bg-primary-dark hover:scale-105 active:scale-95'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                    aria-label="Next week"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Week Dates Grid */}
                {weekDates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <div className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                      No available dates this week
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Try navigating to a different week
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {weekDates.map((date) => {
                      const isSelected = selectedDate && isSameDay(date, selectedDate)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6 // Sunday = 0, Saturday = 6
                      const isToday = isSameDay(date, new Date())
                      
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => handleDateSelect(date)}
                          className={`relative p-4 rounded-xl transition-all duration-200 min-h-[80px] flex flex-col items-center justify-center ${
                            isSelected 
                              ? 'bg-primary text-white shadow-lg scale-105' 
                              : isToday
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-600 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                : isWeekend 
                                  ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-600 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                  : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-primary dark:hover:border-primary'
                          }`}
                        >
                          {isToday && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <div className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                            {format(date, 'EEE')}
                          </div>
                          <div className={`text-xl font-bold ${isSelected ? 'text-white' : ''}`}>
                            {format(date, 'd')}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {format(date, 'MMM')}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="card dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-3xl font-heading font-bold text-primary dark:text-primary mb-8">
                    Select Time for {format(selectedDate, 'EEEE, MMMM d')}
                  </h2>
                  
                  {loadingTimes ? (
                    <div className="py-8">
                      <InlineLoading text="Checking availability..." />
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <TimeSlotSkeleton key={i} />
                        ))}
                      </div>
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⏰</div>
                      <div className="text-xl text-gray-600 dark:text-gray-300 mb-2">
                        No available time slots
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {isSameDay(selectedDate, new Date()) 
                          ? 'Appointments must be booked at least 2 hours in advance'
                          : 'Please select a different date'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-base text-blue-800 dark:text-blue-300 font-medium">
                          📅 {format(selectedDate, 'EEEE, MMMM d')}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          {availableTimes.length} time slot{availableTimes.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {availableTimes.map((time) => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time)}
                            className={
                              selectedTime === time
                                ? 'time-slot-selected'
                                : 'time-slot-available'
                            }
                          >
                            {formatTimeToHHMM(time) || time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>


          </div>

          {/* Continue Button */}
          {selectedDate && selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-xl p-6 z-40">
              <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-gray-700 dark:text-gray-300">
                    <div className="font-semibold text-lg">Ready to Continue</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
                    </div>
                  </div>
                  <button 
                    onClick={handleContinue}
                    className="btn-primary sm:!w-auto px-8"
                  >
                    Continue to Staff Selection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}