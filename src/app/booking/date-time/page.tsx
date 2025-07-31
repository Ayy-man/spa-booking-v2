'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import BookingSummary from '@/components/booking/BookingSummary'
import { InlineLoading } from '@/components/ui/loading-spinner'
import { TimeSlotSkeleton } from '@/components/ui/skeleton-loader'

export default function DateTimePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<any>(null)
  const [bookingData, setBookingData] = useState<any>(null)
  const [loadingTimes, setLoadingTimes] = useState<boolean>(false)
  const [loadingService, setLoadingService] = useState<boolean>(true)

  // Get booking data from localStorage
  useEffect(() => {
    const bookingDataStr = localStorage.getItem('bookingData')
    const serviceDataStr = localStorage.getItem('selectedService')
    
    if (bookingDataStr) {
      try {
        const parsedBookingData = JSON.parse(bookingDataStr)
        setBookingData(parsedBookingData)
        setSelectedService(parsedBookingData.primaryService)
      } catch (error) {
        localStorage.removeItem('bookingData')
      }
    } else if (serviceDataStr) {
      // Fallback to old format for backward compatibility
      try {
        const parsedService = JSON.parse(serviceDataStr)
        setSelectedService(parsedService)
        setBookingData({
          isCouplesBooking: false,
          primaryService: parsedService,
          totalPrice: parsedService.price,
          totalDuration: parsedService.duration
        })
      } catch (error) {
        localStorage.removeItem('selectedService')
      }
    }
    setLoadingService(false)
  }, [])

  // Generate next 30 days
  useEffect(() => {
    const dates = []
    for (let i = 0; i < 30; i++) {
      const date = addDays(new Date(), i)
      // Skip Tuesdays and Thursdays (Tanisha's off days)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 2 && dayOfWeek !== 4) { // Tuesday = 2, Thursday = 4
        dates.push(date)
      }
    }
    setAvailableDates(dates)
  }, [])

  // If no service is selected after loading, redirect to service selection
  useEffect(() => {
    if (!loadingService && !selectedService) {
      window.location.href = '/booking'
    }
  }, [selectedService, loadingService])

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
  }, [selectedDate, selectedService])

  const generateFallbackTimes = useCallback(() => {
    const times = []
    for (let hour = 9; hour <= 19; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      
      // Check if this time allows enough duration before closing
      const serviceDuration = selectedService?.duration || 60
      const endTime = new Date(selectedDate!)
      endTime.setHours(hour, 0, 0, 0)
      endTime.setMinutes(endTime.getMinutes() + serviceDuration)
      const closingTime = new Date(selectedDate!)
      closingTime.setHours(19, 0, 0, 0)
      
      if (endTime <= closingTime) {
        times.push(time)
      }
    }
    
    setAvailableTimes(times)
    setLoadingTimes(false)
  }, [selectedDate, selectedService])

  // Generate available times based on selected date using Supabase
  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchAvailableTimeSlotsFromSupabase()
    }
  }, [selectedDate, selectedService, fetchAvailableTimeSlotsFromSupabase])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('') // Reset time when date changes
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      // Store in localStorage or state management
      localStorage.setItem('selectedDate', selectedDate.toISOString())
      localStorage.setItem('selectedTime', selectedTime)
      
      // Check if it's a couples booking
      const bookingDataStr = localStorage.getItem('bookingData')
      if (bookingDataStr) {
        const bookingData = JSON.parse(bookingDataStr)
        if (bookingData.isCouplesBooking) {
          window.location.href = '/booking/staff-couples'
          return
        }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
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
                <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
                  {availableDates.map((date) => {
                    const isSelected = selectedDate && isSameDay(date, selectedDate)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6 // Sunday = 0, Saturday = 6
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDateSelect(date)}
                        className={`${
                          isSelected 
                            ? 'date-button-selected' 
                            : isWeekend 
                              ? 'date-button-available date-button-weekend'
                              : 'date-button-available'
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {format(date, 'EEE')}
                        </div>
                        <div className="text-lg font-bold">
                          {format(date, 'd')}
                        </div>
                        <div className="text-xs">
                          {format(date, 'MMM')}
                        </div>
                      </button>
                    )
                  })}
                </div>
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
                            {time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar - Booking Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <BookingSummary />
              </div>
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