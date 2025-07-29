'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns'
import { generateTimeSlots, canAccommodateService, calculateEndTime } from '@/lib/booking-logic'
import TimeSlot from './TimeSlot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface DateTimePickerProps {
  selectedDate: Date | null
  selectedTime: string | null
  serviceDuration: number
  onDateSelect: (date: Date) => void
  onTimeSelect: (time: string) => void
  availableSlots: string[]
  loading?: boolean
}

export default function DateTimePicker({
  selectedDate,
  selectedTime,
  serviceDuration,
  onDateSelect,
  onTimeSelect,
  availableSlots,
  loading = false
}: DateTimePickerProps) {
  const [dates, setDates] = useState<Date[]>([])

  useEffect(() => {
    // Generate next 30 days
    const today = startOfDay(new Date())
    const generatedDates = Array.from({ length: 30 }, (_, i) => addDays(today, i))
    setDates(generatedDates)
  }, [])

  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
  }

  const generateAvailableTimeSlots = (date: Date) => {
    if (!date) return []
    
    const allSlots = generateTimeSlots(date)
    return allSlots.filter(time => {
      // Check if slot can accommodate service duration
      if (!canAccommodateService(time, serviceDuration, date)) {
        return false
      }
      
      // Check if slot is available (from Supabase data)
      return availableSlots.includes(time)
    })
  }

  const timeSlots = selectedDate ? generateAvailableTimeSlots(selectedDate) : []

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          Select Date
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {dates.slice(0, 14).map((date) => (
            <Button
              key={date.toISOString()}
              variant={selectedDate && isSameDay(date, selectedDate) ? "default" : "outline"}
              className={`
                flex flex-col h-auto py-3 px-2 min-h-[64px]
                ${selectedDate && isSameDay(date, selectedDate) 
                  ? 'bg-primary text-white border-primary hover:bg-primary-dark' 
                  : 'bg-white border-gray-200 hover:bg-accent hover:border-primary text-gray-900'
                }
              `}
              onClick={() => onDateSelect(date)}
            >
              <span className="text-xs font-medium mb-1">
                {formatDateDisplay(date)}
              </span>
              <span className="text-lg font-semibold">
                {format(date, 'd')}
              </span>
            </Button>
          ))}
        </div>
        
        {dates.length > 14 && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              className="text-primary border-primary hover:bg-accent"
            >
              View More Dates
            </Button>
          </div>
        )}
      </Card>

      {/* Time Selection */}
      {selectedDate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-primary-dark mb-4">
            Available Times - {formatDateDisplay(selectedDate)}
          </h3>
          
          {timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">
                No available appointments for this date
              </div>
              <div className="text-sm text-gray-400">
                Please select a different date
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-4">
                Service duration: {serviceDuration} minutes
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map((time) => {
                  const endTime = calculateEndTime(time, serviceDuration)
                  return (
                    <TimeSlot
                      key={time}
                      time={time}
                      endTime={endTime}
                      available={true}
                      selected={selectedTime === time}
                      onClick={() => onTimeSelect(time)}
                    />
                  )
                })}
              </div>
              
              {selectedTime && (
                <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-accent">
                  <div className="text-sm font-medium text-primary-dark">
                    Selected: {formatDateDisplay(selectedDate)} at {selectedTime} - {calculateEndTime(selectedTime, serviceDuration)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Duration: {serviceDuration} minutes
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}