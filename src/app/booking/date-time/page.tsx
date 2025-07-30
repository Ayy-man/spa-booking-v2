'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'

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

  // Generate available times based on selected date using Supabase
  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchAvailableTimeSlotsFromSupabase()
    }
  }, [selectedDate, selectedService])

  const fetchAvailableTimeSlotsFromSupabase = async () => {
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
  }

  const generateFallbackTimes = () => {
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
  }

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
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
              <p className="text-gray-600">Loading your service selection...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Services
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Select Date & Time
          </h1>
          <p className="text-gray-600">
            Choose your preferred appointment date and time
          </p>
          {selectedService && (
            <div className="mt-4 p-4 bg-accent/20 rounded-lg">
              <p className="text-sm text-gray-600">Booking for:</p>
              <p className="text-lg font-semibold text-primary-dark">{selectedService.name}</p>
              <p className="text-sm text-gray-600">{selectedService.duration} minutes • ${selectedService.price}</p>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-heading text-primary-dark mb-6">
            Select Date
          </h2>
          <div className="flex space-x-2 overflow-x-auto pb-4">
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
                  <div className="text-sm font-medium">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-xs">
                    {format(date, 'MMM d')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-heading text-primary-dark mb-6">
              Select Time for {format(selectedDate, 'EEEE, MMMM d')}
            </h2>
            
            {loadingTimes ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto"></div>
                  Checking availability...
                </div>
              </div>
            ) : availableTimes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  No available time slots for this date
                </div>
                <div className="text-sm text-gray-400">
                  Please select a different date
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Available time slots for {format(selectedDate, 'EEEE, MMMM d')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {availableTimes.length} time slot{availableTimes.length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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

        {/* Continue Button */}
        {selectedDate && selectedTime && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Selected:</span> {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
                </div>
              </div>
              <button 
                onClick={handleContinue}
                className="btn-primary w-full"
              >
                Continue to Staff Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}