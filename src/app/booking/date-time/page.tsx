'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { getAvailableStaff } from '@/lib/staff-data'
import { processTimeSlots, formatTimeToHHMM } from '@/lib/time-utils'

import { InlineLoading } from '@/components/ui/loading-spinner'
import { TimeSlotSkeleton } from '@/components/ui/skeleton-loader'
import { analytics } from '@/lib/analytics'
import { loadBookingState, saveBookingState } from '@/lib/booking-state-manager'
import { validateAndRedirect } from '@/lib/booking-step-validation'

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
      console.log('[DateTimePage] Service data missing after load, redirecting to service selection')
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
        times.push(timeString)
        
        // Move to next slot: add service duration + 15-minute buffer
        currentTime.setMinutes(currentTime.getMinutes() + serviceDuration + bufferMinutes)
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
        return
      }
      
      // Call Supabase function to get available time slots
      const dateString = selectedDate.toISOString().split('T')[0]
      const availableSlots = await supabaseClient.getAvailableTimeSlots(
        dateString,
        matchingService.id
      )
      
      if (availableSlots && availableSlots.length > 0) {
        // Process time slots with proper validation
        const validTimes = processTimeSlots(availableSlots)
        // Remove duplicates and sort
        const uniqueTimes = Array.from(new Set(validTimes)).sort()
        setAvailableTimes(uniqueTimes)
      } else {
        setAvailableTimes([])
      }
    } catch (error: any) {
      // Fallback to simple time generation
      generateFallbackTimes()
    } finally {
      setLoadingTimes(false)
    }
  }, [selectedDate, selectedService, generateFallbackTimes])

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
      // Store date and time using state manager
      saveBookingState({
        selectedDate: selectedDate.toISOString(),
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
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center lg:text-left">
                <Link 
                  href="/booking" 
                  className="btn-tertiary !w-auto px-6 mb-6 inline-flex"
                >
                  ← Back to Services
                </Link>
                <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
                  Select Date & Time
                </h1>
                <p className="text-xl text-gray-600">
                  Choose your preferred appointment date and time
                </p>
              </div>

              {/* Date Selection */}
              <div className="card">
                <h2 className="text-3xl font-heading font-bold text-primary mb-8">
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
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {getWeekRangeText()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Week {weekDates.length > 0 ? `(${weekDates.length} days available)` : '(no dates available)'}
                    </div>
                  </div>
                  
                  <button
                    onClick={goToNextWeek}
                    disabled={!canGoToNextWeek()}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                      canGoToNextWeek()
                        ? 'bg-primary text-white hover:bg-primary-dark hover:scale-105 active:scale-95'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                    <div className="text-lg text-gray-600 mb-2">
                      No available dates this week
                    </div>
                    <div className="text-sm text-gray-500">
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
                                ? 'bg-blue-50 border-2 border-blue-200 text-blue-800 hover:bg-blue-100'
                                : isWeekend 
                                  ? 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                                  : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-primary'
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
                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
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
                <div className="card">
                  <h2 className="text-3xl font-heading font-bold text-primary mb-8">
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
                      <div className="text-xl text-gray-600 mb-2">
                        No available time slots
                      </div>
                      <div className="text-gray-500">
                        Please select a different date
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-base text-blue-800 font-medium">
                          📅 {format(selectedDate, 'EEEE, MMMM d')}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
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
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl p-6 z-40">
              <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-gray-700">
                    <div className="font-semibold text-lg">Ready to Continue</div>
                    <div className="text-sm text-gray-500">
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