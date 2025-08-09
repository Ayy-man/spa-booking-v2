'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { BookingPageWrapper, useBookingNavigation } from '@/components/booking/BookingPageWrapper'
import { getAvailableStaff } from '@/lib/staff-data'

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
  const [weekTransitioning, setWeekTransitioning] = useState(false)
  const [loadingWeekDates, setLoadingWeekDates] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [focusedTimeSlotIndex, setFocusedTimeSlotIndex] = useState<number>(-1)
  const weekGridRef = useRef<HTMLDivElement>(null)
  const timeSlotGridRef = useRef<HTMLDivElement>(null)
  const { navigateWithTransition, isNavigating } = useBookingNavigation()

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

  // Navigation functions for week browsing with premium animations
  const goToPreviousWeek = async () => {
    const previousWeek = subWeeks(currentWeekStart, 1)
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    
    // Don't allow going to weeks before current week
    if (previousWeek >= today && !weekTransitioning) {
      setWeekTransitioning(true)
      setLoadingWeekDates(true)
      
      // Add transition animation
      if (weekGridRef.current) {
        weekGridRef.current.style.opacity = '0'
        weekGridRef.current.style.transform = 'translateX(20px)'
      }
      
      // Wait for animation
      setTimeout(() => {
        setCurrentWeekStart(previousWeek)
        setTimeout(() => {
          if (weekGridRef.current) {
            weekGridRef.current.style.opacity = '1'
            weekGridRef.current.style.transform = 'translateX(0)'
          }
          setLoadingWeekDates(false)
          setWeekTransitioning(false)
        }, 150)
      }, 300)
    }
  }

  const goToNextWeek = async () => {
    const nextWeek = addWeeks(currentWeekStart, 1)
    const maxWeek = startOfWeek(addDays(new Date(), 28), { weekStartsOn: 1 }) // 4 weeks ahead
    
    // Don't allow going beyond 4 weeks
    if (nextWeek <= maxWeek && !weekTransitioning) {
      setWeekTransitioning(true)
      setLoadingWeekDates(true)
      
      // Add transition animation
      if (weekGridRef.current) {
        weekGridRef.current.style.opacity = '0'
        weekGridRef.current.style.transform = 'translateX(-20px)'
      }
      
      // Wait for animation
      setTimeout(() => {
        setCurrentWeekStart(nextWeek)
        setTimeout(() => {
          if (weekGridRef.current) {
            weekGridRef.current.style.opacity = '1'
            weekGridRef.current.style.transform = 'translateX(0)'
          }
          setLoadingWeekDates(false)
          setWeekTransitioning(false)
        }, 150)
      }, 300)
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
        // Extract unique times from the results
        const uniqueTimes = Array.from(new Set(availableSlots.map((slot: any) => slot.available_time))) as string[]
        setAvailableTimes(uniqueTimes.sort())
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
    // Add selection animation feedback
    const dateButton = document.querySelector(`[data-date="${date.toISOString()}"]`) as HTMLElement
    if (dateButton) {
      dateButton.style.transform = 'scale(0.95)'
      setTimeout(() => {
        dateButton.style.transform = 'scale(1.05)'
        setTimeout(() => {
          dateButton.style.transform = ''
        }, 150)
      }, 100)
    }
    
    setSelectedDate(date)
    setSelectedTime('') // Reset time when date changes
    
    // Announce selection to screen readers
    const announcement = `Selected ${format(date, 'EEEE, MMMM d, yyyy')}. Please choose a time slot.`
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    setTimeout(() => document.body.removeChild(liveRegion), 1000)
    
    // Track date selection
    if (selectedService) {
      analytics.dateTimeSelected(format(date, 'yyyy-MM-dd'), '', selectedService.name)
    }
  }

  const handleTimeSelect = (time: string) => {
    // Simplify feedback to avoid delayed wobble
    const timeButton = document.querySelector(`[data-time="${time}"]`) as HTMLElement
    if (timeButton) {
      timeButton.classList.add('ring-4', 'ring-primary/30')
      setTimeout(() => timeButton.classList.remove('ring-4', 'ring-primary/30'), 200)
    }

    setSelectedTime(time)
    
    // Enhanced announcement to screen readers with context
    if (selectedDate) {
      const announcement = `Time ${time} selected for ${format(selectedDate, 'EEEE, MMMM d')}. Ready to continue to staff selection.`
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.textContent = announcement
      document.body.appendChild(liveRegion)
      setTimeout(() => document.body.removeChild(liveRegion), 1000)
    }
    
    // Track time selection with enhanced analytics
    if (selectedService && selectedDate) {
      analytics.dateTimeSelected(format(selectedDate, 'yyyy-MM-dd'), time, selectedService.name)
      analytics.track('time_slot_interaction', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: time,
        service: selectedService.name,
        total_slots_available: availableTimes.length,
        selection_index: availableTimes.indexOf(time)
      })
    }
  }

  // Enhanced keyboard navigation for time slots
  const handleTimeSlotKeyNavigation = (event: React.KeyboardEvent, currentIndex: number) => {
    if (!availableTimes.length) return
    
    const { key } = event
    let newIndex = currentIndex
    
    switch (key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, availableTimes.length - 1)
        break
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0)
        break
      case 'ArrowDown':
        // Navigate to next row (assuming 4 columns on lg screens)
        const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2
        newIndex = Math.min(currentIndex + cols, availableTimes.length - 1)
        break
      case 'ArrowUp':
        // Navigate to previous row
        const colsUp = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2
        newIndex = Math.max(currentIndex - colsUp, 0)
        break
      case 'Home':
        newIndex = 0
        break
      case 'End':
        newIndex = availableTimes.length - 1
        break
      default:
        return
    }
    
    if (newIndex !== currentIndex) {
      event.preventDefault()
      setFocusedTimeSlotIndex(newIndex)
      
      // Focus the new time slot button
      const newButton = document.querySelector(`[data-time="${availableTimes[newIndex]}"]`) as HTMLElement
      if (newButton) {
        newButton.focus()
        
        // Announce navigation to screen readers
        const announcement = `${availableTimes[newIndex]}, ${newIndex + 1} of ${availableTimes.length}`
        const liveRegion = document.createElement('div')
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className = 'sr-only'
        liveRegion.textContent = announcement
        document.body.appendChild(liveRegion)
        setTimeout(() => document.body.removeChild(liveRegion), 1000)
      }
    }
  }

  const handleContinue = async () => {
    if (selectedDate && selectedTime && !isNavigating) {
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
      
      // Check if it's a couples booking and navigate with smooth transition
      const targetPath = bookingData?.isCouplesBooking ? '/booking/staff-couples' : '/booking/staff'
      await navigateWithTransition(targetPath, 'forward')
    }
  }

  // Show loading screen while service is being loaded
  if (loadingService) {
    return (
      <BookingPageWrapper 
        step={2} 
        title="Select Date & Time"
        subtitle="Choose your preferred appointment date and time"
        showBackButton={false}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <InlineLoading text="Loading your service selection..." />
        </div>
      </BookingPageWrapper>
    )
  }

  return (
    <BookingPageWrapper 
      step={2} 
      title="Select Date & Time"
      subtitle="Choose your preferred appointment date and time"
      backButtonText="← Back to Services"
      backButtonHref="/booking"
    >
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Date Selection */}
          <div className="card">
            <h2 className="text-3xl font-heading font-bold text-primary mb-8">
              Select Date
            </h2>
                
            {/* Week Navigation Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousWeek}
                disabled={!canGoToPreviousWeek() || weekTransitioning}
                className={`calendar-nav-arrow group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  canGoToPreviousWeek() && !weekTransitioning
                    ? 'bg-primary text-white hover:bg-primary-dark hover:scale-110 hover:shadow-lg hover:shadow-primary/25 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                aria-label="Previous week"
              >
                <ChevronLeft className={`w-6 h-6 transition-transform duration-300 ${
                  canGoToPreviousWeek() && !weekTransitioning ? 'group-hover:-translate-x-0.5' : ''
                }`} />
                {weekTransitioning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
              
              <div className="text-center relative">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-primary animate-pulse" />
                  <div className="text-lg font-semibold text-gray-900 transition-all duration-300">
                    {getWeekRangeText()}
                  </div>
                </div>
                <div className={`text-sm transition-all duration-300 ${
                  weekDates.length > 0 ? 'text-primary' : 'text-gray-500'
                }`}>
                  {loadingWeekDates ? (
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      <span>Loading dates...</span>
                    </div>
                  ) : (
                    `Week ${weekDates.length > 0 ? `(${weekDates.length} days available)` : '(no dates available)'}`
                  )}
                </div>
                
                {/* Swipe indicator for mobile */}
                <div className="mt-2 md:hidden text-xs text-gray-400 flex items-center justify-center gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  <span>Swipe to navigate weeks</span>
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                </div>
              </div>
              
              <button
                onClick={goToNextWeek}
                disabled={!canGoToNextWeek() || weekTransitioning}
                className={`calendar-nav-arrow group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  canGoToNextWeek() && !weekTransitioning
                    ? 'bg-primary text-white hover:bg-primary-dark hover:scale-110 hover:shadow-lg hover:shadow-primary/25 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                aria-label="Next week"
              >
                <ChevronRight className={`w-6 h-6 transition-transform duration-300 ${
                  canGoToNextWeek() && !weekTransitioning ? 'group-hover:translate-x-0.5' : ''
                }`} />
                {weekTransitioning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
            </div>
                
            {/* Week Dates Grid */}
            {weekDates.length === 0 && !loadingWeekDates ? (
              <div className="text-center py-8 animate-fade-slide-in">
                <div className="text-4xl mb-4">📅</div>
                <div className="text-lg text-gray-600 mb-2">
                  No available dates this week
                </div>
                <div className="text-sm text-gray-500">
                  Try navigating to a different week
                </div>
              </div>
            ) : loadingWeekDates ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="date-button-skeleton relative p-4 rounded-xl min-h-[80px] flex flex-col items-center justify-center bg-gray-100 animate-pulse overflow-hidden"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Skeleton shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 opacity-60 animate-shimmer" />
                    
                    <div className="skeleton-shimmer w-8 h-4 rounded-md mb-2 bg-gray-200" />
                    <div className="skeleton-shimmer w-6 h-6 rounded-md mb-1 bg-gray-300" />
                    <div className="skeleton-shimmer w-6 h-3 rounded-md bg-gray-200" />
                    
                    {/* Skeleton highlight */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div 
                ref={weekGridRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 transition-all duration-300 ease-out"
                onTouchStart={(e) => {
                  setTouchStartX(e.touches[0].clientX)
                }}
                onTouchEnd={(e) => {
                  if (touchStartX !== null) {
                    const touchEndX = e.changedTouches[0].clientX
                    const touchDiff = touchStartX - touchEndX
                    
                    // Swipe threshold of 50px
                    if (Math.abs(touchDiff) > 50) {
                      if (touchDiff > 0 && canGoToNextWeek()) {
                        // Swipe left - go to next week
                        goToNextWeek()
                      } else if (touchDiff < 0 && canGoToPreviousWeek()) {
                        // Swipe right - go to previous week
                        goToPreviousWeek()
                      }
                    }
                    setTouchStartX(null)
                  }
                }}
              >
                {weekDates.map((date, index) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6 // Sunday = 0, Saturday = 6
                  const isToday = isSameDay(date, new Date())
                  
                  return (
                    <button
                      key={date.toISOString()}
                      data-date={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
                      aria-label={`Select ${format(date, 'EEEE, MMMM d, yyyy')}${isToday ? ' (Today)' : ''}${isSelected ? ' (Selected)' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleDateSelect(date)
                        }
                      }}
                      className={`calendar-date-button calendar-date-entrance group relative p-4 rounded-xl transition-all duration-300 ease-out min-h-[80px] flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 ${
                        isSelected 
                          ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-105 border-2 border-primary-dark calendar-date-selected-animation' 
                          : isToday
                            ? 'bg-blue-50 border-2 border-blue-300 text-blue-800 hover:bg-blue-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/50 hover:scale-105 hover:-translate-y-1 calendar-date-today-pulse'
                            : isWeekend 
                              ? 'bg-amber-50 border-2 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-200/50 hover:scale-105 hover:-translate-y-1 calendar-date-weekend-glow'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-accent/30 hover:border-primary hover:text-primary-dark hover:shadow-lg hover:shadow-primary/20 hover:scale-105 hover:-translate-y-1'
                      }`}
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {/* Today indicator with pulse animation */}
                      {isToday && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
                          <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-75" />
                        </div>
                      )}
                      
                      {/* Selection ring for selected dates */}
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 rounded-xl border-2 border-white/50 animate-pulse" />
                          <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/20 to-primary-dark/20 -z-10 animate-pulse" />
                        </>
                      )}
                      
                      {/* Date content with smooth transitions */}
                      <div className={`text-sm font-semibold transition-all duration-200 group-hover:scale-110 ${
                        isSelected ? 'text-white' : ''
                      }`}>
                        {format(date, 'EEE')}
                      </div>
                      <div className={`text-xl font-bold transition-all duration-200 group-hover:scale-110 ${
                        isSelected ? 'text-white' : ''
                      }`}>
                        {format(date, 'd')}
                      </div>
                      <div className={`text-xs transition-all duration-200 group-hover:scale-110 ${
                        isSelected ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {format(date, 'MMM')}
                      </div>
                      
                      {/* Hover glow effect */}
                      <div className={`absolute inset-0 rounded-xl opacity-0 transition-all duration-300 group-hover:opacity-100 ${
                        isSelected 
                          ? '' 
                          : isToday 
                            ? 'bg-gradient-to-br from-blue-400/20 to-blue-600/20'
                            : isWeekend
                              ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20'
                              : 'bg-gradient-to-br from-primary/20 to-primary-dark/20'
                      }`} />
                      
                      {/* Premium ripple effect on click */}
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-radial from-white/30 to-transparent opacity-0 scale-0 transition-all duration-500 group-active:opacity-100 group-active:scale-110" />
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
                  <div className="text-center mb-8">
                    <InlineLoading text="Checking availability..." />
                    <p className="text-sm text-gray-500 mt-2">
                      Finding perfect time slots for you
                    </p>
                  </div>
                  
                  {/* Enhanced Loading Time Slot Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="time-slot-loading-premium h-14 flex items-center justify-center"
                        style={{
                          animationDelay: `${i * 75}ms`
                        }}
                      >
                        <div className="w-8 h-3 bg-gray-300/30 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Loading progress indicator */}
                  <div className="mt-6 flex items-center justify-center">
                    <div className="flex space-x-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="ml-3 text-xs text-gray-400">
                      Loading slots...
                    </span>
                  </div>
                </div>
              ) : availableTimes.length === 0 ? (
                <div className="text-center py-12 animate-fade-slide-in">
                  <div className="text-6xl mb-4 animate-bounce-in">⏰</div>
                  <div className="text-xl text-gray-600 mb-2">
                    No available time slots
                  </div>
                  <div className="text-gray-500">
                    Please select a different date
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fade-slide-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base text-blue-800 font-medium flex items-center gap-2">
                          📅 {format(selectedDate, 'EEEE, MMMM d')}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          {availableTimes.length} time slot{availableTimes.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <div className="text-blue-500/30 text-xs">
                        Tap to select
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Time Slot Grid with Staggered Animations */}
                  <div 
                    ref={timeSlotGridRef}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-slide-in"
                    style={{
                      animation: 'time-slot-grid-entrance 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    role="grid"
                    aria-label="Available time slots"
                  >
                    {availableTimes.map((time, timeIndex) => {
                      const isSelected = selectedTime === time
                      const isFocused = focusedTimeSlotIndex === timeIndex
                      
                      return (
                        <button
                          key={time}
                          data-time={time}
                          onClick={() => handleTimeSelect(time)}
                          onKeyDown={(e) => {
                            // Handle selection
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleTimeSelect(time)
                              return
                            }
                            // Handle navigation
                            handleTimeSlotKeyNavigation(e, timeIndex)
                          }}
                          onFocus={() => setFocusedTimeSlotIndex(timeIndex)}
                          onBlur={() => setFocusedTimeSlotIndex(-1)}
                          aria-label={`Select time ${time}${isSelected ? ' (Currently selected)' : ''}. ${timeIndex + 1} of ${availableTimes.length}`}
                          aria-selected={isSelected}
                          aria-describedby="time-slot-instructions"
                          role="gridcell"
                          tabIndex={timeIndex === 0 ? 0 : -1}
                          className={`${
                            isSelected
                              ? 'time-slot-selected-premium'
                              : 'time-slot-available-premium'
                          } time-slot-entrance focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 ${
                            isFocused ? 'ring-4 ring-primary/40' : ''
                          }`}
                          style={{
                            animationDelay: `${timeIndex * 50}ms`
                          }}
                        >
                          <span className="relative z-10 font-semibold text-base">
                            {time}
                          </span>
                          
                          {/* Enhanced Selection State Indicators */}
                          {isSelected && (
                            <>
                              {/* Selection glow ring */}
                              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/30 to-primary-dark/30 -z-10 animate-pulse" />
                              
                              {/* Checkmark indicator for selected state */}
                              <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                              </div>
                            </>
                          )}
                          
                          {/* Focus indicator for keyboard navigation */}
                          {isFocused && !isSelected && (
                            <div className="absolute -inset-1 rounded-xl border-2 border-primary/50 animate-pulse" />
                          )}
                          
                          {/* Hover ripple effect container */}
                          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent opacity-0 scale-0 transition-all duration-500 group-active:opacity-100 group-active:scale-110" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Enhanced Time Selection Instructions for Accessibility */}
                  <div 
                    id="time-slot-instructions" 
                    className="mt-6 space-y-4 animate-fade-slide-in" 
                    style={{ animationDelay: `${availableTimes.length * 50 + 200}ms` }}
                  >
                    {/* Visual Legend */}
                    <div className="text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-6 flex-wrap">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                          <span className="font-medium">Selected</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
                          <span>Available</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 border-2 border-primary/50 rounded-full animate-pulse"></div>
                          <span>Focused</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Keyboard Navigation Instructions */}
                    <div className="text-center text-xs text-gray-400 space-y-1">
                      <div className="hidden md:block">
                        <span className="font-medium">Keyboard Navigation:</span>
                        <span className="mx-2">•</span>
                        <span>Arrow keys to navigate</span>
                        <span className="mx-2">•</span>
                        <span>Enter/Space to select</span>
                        <span className="mx-2">•</span>
                        <span>Home/End for first/last</span>
                      </div>
                      <div className="md:hidden">
                        <span>Tap to select time slots</span>
                      </div>
                    </div>
                    
                    {/* Screen Reader Only Instructions */}
                    <div className="sr-only">
                      Time slot grid with {availableTimes.length} available options. 
                      Use arrow keys to navigate between time slots. 
                      Press Enter or Space to select a time slot. 
                      Press Home to go to the first slot, End to go to the last slot.
                    </div>
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
                disabled={isNavigating}
                className="btn-primary-premium sm:!w-auto px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Navigating...
                  </>
                ) : (
                  'Continue to Staff Selection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </BookingPageWrapper>
  )
}