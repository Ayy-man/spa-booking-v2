"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { BookingWithRelations, ServiceCategory } from "@/types/booking"
import { Calendar, Clock, Printer, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

// Service category colors (matching existing color scheme)
const SERVICE_COLORS: Record<ServiceCategory, { bg: string; border: string; text: string }> = {
  facial: { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  massage: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  body_treatment: { bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  body_scrub: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
  waxing: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  package: { bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800" },
  membership: { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800" }
}

// Business hours configuration
const BUSINESS_HOURS = {
  start: 8,  // 8 AM
  end: 20,   // 8 PM  
  slotDuration: 15 // 15 minutes
}

interface TimeSlot {
  hour: number
  minute: number
  timeString: string
  displayTime: string
}

interface StaffMember {
  id: string
  name: string
  work_days: number[]
  is_active: boolean
}

interface StaffScheduleViewProps {
  className?: string
  selectedDate?: Date
  autoRefresh?: boolean
  refreshInterval?: number
}

export function StaffScheduleView({ 
  className,
  selectedDate = new Date(),
  autoRefresh = true,
  refreshInterval = 30000
}: StaffScheduleViewProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate)
  // Get current time in Guam timezone (UTC+10)
  const getGuamTime = () => {
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const guamTime = new Date(utc + (3600000 * 10)) // UTC+10 for Guam
    return guamTime
  }
  
  const [currentTime, setCurrentTime] = useState<Date>(getGuamTime())
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSlot, setQuickAddSlot] = useState<{ staffId: string; time: string } | null>(null)
  const [draggedBooking, setDraggedBooking] = useState<BookingWithRelations | null>(null)
  const [dropTarget, setDropTarget] = useState<{ staffId: string; time: string } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Generate time slots
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      for (let minute = 0; minute < 60; minute += BUSINESS_HOURS.slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayHour = hour % 12 || 12
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
        slots.push({ hour, minute, timeString, displayTime })
      }
    }
    return slots
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, work_days, is_active')
        .eq('is_active', true)
        .neq('id', 'any') // Exclude "Any Available Staff"
        .order('name')

      if (staffError) throw staffError
      
      // Debug: Log staff data to check work_days
      console.log('Staff data from database:', staffData)
      
      setStaff(staffData || [])

      // Fetch bookings for the day
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(first_name, last_name, phone)
        `)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled')
        .order('start_time')

      if (bookingsError) throw bookingsError
      setBookings(bookingsData || [])
      
      setError('')
    } catch (err: any) {
      setError(`Failed to load schedule: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  // Auto-refresh
  useEffect(() => {
    fetchData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, autoRefresh, refreshInterval])

  // Update current time every minute (in Guam timezone)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getGuamTime())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Check if staff is working on current day
  const isStaffWorking = (staffMember: StaffMember): boolean => {
    const dayOfWeek = currentDate.getDay()
    
    // Fallback schedules if work_days is empty or undefined
    if (!staffMember.work_days || staffMember.work_days.length === 0) {
      // Use known schedules as fallback
      const schedules: Record<string, number[]> = {
        'Selma Villaver': [0,1,2,3,4,5,6], // All 7 days
        'Robyn Camacho': [0,3,4,5,6],      // OFF Mon & Tue
        'Tanisha Harris': [0,1,3,5,6],     // OFF Tue & Thu
        'Leonel Sidon': [0,3,4,5,6]        // OFF Mon & Tue (same as Robyn)
      }
      
      const fallbackDays = schedules[staffMember.name]
      if (fallbackDays) {
        return fallbackDays.includes(dayOfWeek)
      }
    }
    
    return staffMember.work_days.includes(dayOfWeek)
  }

  // Get bookings for a specific staff and time slot
  const getBookingForSlot = (staffId: string, timeSlot: TimeSlot): BookingWithRelations | null => {
    return bookings.find(booking => {
      if (booking.staff_id !== staffId) return false
      
      const bookingStart = booking.start_time.split(':')
      const bookingStartHour = parseInt(bookingStart[0])
      const bookingStartMinute = parseInt(bookingStart[1])
      
      const bookingEnd = booking.end_time.split(':')
      const bookingEndHour = parseInt(bookingEnd[0])
      const bookingEndMinute = parseInt(bookingEnd[1])
      
      const slotMinutes = timeSlot.hour * 60 + timeSlot.minute
      const startMinutes = bookingStartHour * 60 + bookingStartMinute
      const endMinutes = bookingEndHour * 60 + bookingEndMinute
      
      return slotMinutes >= startMinutes && slotMinutes < endMinutes
    }) || null
  }

  // Calculate booking span (how many 15-minute slots it covers)
  const getBookingSpan = (booking: BookingWithRelations): number => {
    const duration = booking.service.duration || 60
    return Math.ceil(duration / BUSINESS_HOURS.slotDuration)
  }

  // Check if this is the start of a booking
  const isBookingStart = (booking: BookingWithRelations, timeSlot: TimeSlot): boolean => {
    const [startHour, startMinute] = booking.start_time.split(':').map(Number)
    return startHour === timeSlot.hour && startMinute === timeSlot.minute
  }

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle quick add appointment click
  const handleQuickAdd = (staffId: string, timeSlot: TimeSlot) => {
    // Check if slot is available
    const existingBooking = getBookingForSlot(staffId, timeSlot)
    if (existingBooking) return
    
    setQuickAddSlot({ staffId, time: timeSlot.timeString })
    setShowQuickAdd(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, booking: BookingWithRelations) => {
    setDraggedBooking(booking)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, staffId: string, time: string) => {
    e.preventDefault()
    setDropTarget({ staffId, time })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) {
      setDropTarget(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, staffId: string, timeSlot: TimeSlot) => {
    e.preventDefault()
    setDropTarget(null)
    
    if (!draggedBooking) return
    
    // Check if the drop target is valid (no existing booking)
    const existingBooking = getBookingForSlot(staffId, timeSlot)
    if (existingBooking) {
      setError('Cannot move booking to occupied time slot')
      setDraggedBooking(null)
      return
    }
    
    // Here you would update the booking in the database
    // For now, just show a message
    console.log(`Would move booking ${draggedBooking.id} to staff ${staffId} at ${timeSlot.timeString}`)
    
    // Refresh data to show the update
    await fetchData()
    setDraggedBooking(null)
  }

  // Format customer name
  const formatCustomerName = (booking: BookingWithRelations): string => {
    if (booking.customer) {
      return `${booking.customer.first_name} ${booking.customer.last_name[0]}.`
    }
    return 'Customer'
  }

  // Get current time position for the red line
  const getCurrentTimePosition = (): number | null => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Check if current time is within business hours
    if (currentHour < BUSINESS_HOURS.start || currentHour >= BUSINESS_HOURS.end) {
      return null
    }
    
    // Calculate position as percentage
    const totalMinutes = (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60
    const currentMinutes = (currentHour - BUSINESS_HOURS.start) * 60 + currentMinute
    return (currentMinutes / totalMinutes) * 100
  }

  // Check if we're viewing today
  const isToday = currentDate.toDateString() === new Date().toDateString()

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading staff schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2 px-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-lg">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {!isToday && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToToday}
                  className="ml-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Schedule Grid */}
      <Card className="overflow-hidden printable-content" ref={printRef}>
        <div className="overflow-x-auto">
          <div className="min-w-[800px] relative">
            {/* Current Time Indicator */}
            {isToday && getCurrentTimePosition() !== null && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none print:hidden"
                style={{ 
                  top: `calc(3.5rem + ${getCurrentTimePosition()}% * (100% - 3.5rem))` 
                }}
              >
                <div className="absolute -left-1 -top-2 bg-red-500 text-white text-xs px-1 rounded">
                  {format(currentTime, 'h:mm a')} GMT+10
                </div>
              </div>
            )}
            
            {/* Header Row */}
            <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 font-medium text-gray-700 border-r bg-white">
                Time
              </div>
              {staff.map(member => (
                <div 
                  key={member.id} 
                  className={cn(
                    "p-3 font-medium text-center border-r",
                    !isStaffWorking(member) && "bg-gray-100 text-gray-400"
                  )}
                >
                  <div>{member.name}</div>
                  {!isStaffWorking(member) && (
                    <div className="text-xs font-normal mt-1">Off today</div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Time Slots */}
            <div>
              {timeSlots.map((slot, slotIndex) => {
                const isHourStart = slot.minute === 0
                
                return (
                  <div 
                    key={slot.timeString}
                    className={cn(
                      "grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))]",
                      isHourStart && "border-t-2",
                      !isHourStart && "border-t"
                    )}
                  >
                    {/* Time Column */}
                    <div className={cn(
                      "p-2 text-sm border-r bg-gray-50",
                      isHourStart ? "font-medium" : "text-gray-500"
                    )}>
                      {isHourStart ? slot.displayTime : ''}
                    </div>
                    
                    {/* Staff Columns */}
                    {staff.map(member => {
                      const booking = getBookingForSlot(member.id, slot)
                      const isStart = booking && isBookingStart(booking, slot)
                      const isWorking = isStaffWorking(member)
                      
                      // Skip rendering if this slot is covered by a previous booking
                      if (booking && !isStart) {
                        return <div key={member.id} className="border-r" />
                      }
                      
                      if (booking && isStart) {
                        const span = getBookingSpan(booking)
                        const serviceColors = SERVICE_COLORS[booking.service.category as ServiceCategory] || 
                                           { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-800" }
                        
                        return (
                          <div 
                            key={member.id}
                            className="border-r relative"
                            style={{ gridRow: `span ${span}` }}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute inset-x-1 inset-y-1 p-2 rounded cursor-pointer transition-all hover:shadow-md",
                                      serviceColors.bg,
                                      serviceColors.border,
                                      serviceColors.text,
                                      "border-2",
                                      draggedBooking?.id === booking.id && "opacity-50"
                                    )}
                                    onClick={() => setSelectedBooking(booking)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, booking)}
                                  >
                                    <div className="text-xs font-medium truncate">
                                      {formatCustomerName(booking)}
                                    </div>
                                    <div className="text-xs truncate mt-1 opacity-90">
                                      {booking.service.name}
                                    </div>
                                    {booking.service.duration > 60 && (
                                      <div className="text-xs mt-1 opacity-75">
                                        {booking.service.duration} min
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <div className="space-y-1">
                                    <p className="font-medium">{booking.service.name}</p>
                                    <p>{formatCustomerName(booking)}</p>
                                    <p>{booking.start_time} - {booking.end_time}</p>
                                    <p>Room {booking.room?.name}</p>
                                    {booking.notes && <p className="text-xs">Note: {booking.notes}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )
                      }
                      
                      return (
                        <div 
                          key={member.id}
                          className={cn(
                            "border-r h-8 hover:bg-gray-50 cursor-pointer transition-colors",
                            !isWorking && "bg-gray-100 cursor-not-allowed hover:bg-gray-100",
                            dropTarget?.staffId === member.id && dropTarget?.time === slot.timeString && "bg-blue-100"
                          )}
                          onClick={() => isWorking && handleQuickAdd(member.id, slot)}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => isWorking && handleDragEnter(e, member.id, slot.timeString)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => isWorking && handleDrop(e, member.id, slot)}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Service Categories:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SERVICE_COLORS).map(([category, colors]) => (
                <div key={category} className="flex items-center space-x-1">
                  <div className={cn("w-3 h-3 rounded", colors.bg, colors.border)} />
                  <span className="text-xs text-gray-600 capitalize">
                    {category.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {isToday && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-0.5 bg-red-500" />
              <span className="text-xs text-gray-600">Current Time (Guam)</span>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Add Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Appointment</DialogTitle>
            <DialogDescription>
              Add a new appointment for {quickAddSlot && staff.find(s => s.id === quickAddSlot.staffId)?.name} at {quickAddSlot?.time}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Quick add form would go here */}
            <p className="text-sm text-gray-600">Quick add functionality coming soon...</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selected Booking Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Service:</span>
                <p className="font-medium">{selectedBooking.service.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Time:</span>
                <p className="font-medium">
                  {selectedBooking.start_time} - {selectedBooking.end_time} ({selectedBooking.service.duration} min)
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Staff:</span>
                <p className="font-medium">{selectedBooking.staff?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Room:</span>
                <p className="font-medium">Room {selectedBooking.room?.name}</p>
              </div>
              {selectedBooking.notes && (
                <div>
                  <span className="text-sm text-gray-500">Notes:</span>
                  <p className="font-medium">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-content, .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Portrait orientation, fit on one page */
          @page {
            size: portrait;
            margin: 0.25in;
          }
          /* Compact styles for printing */
          .printable-content .grid > div {
            height: 20px !important;
            min-height: 20px !important;
            padding: 2px !important;
            font-size: 10px !important;
          }
          .printable-content .text-xs {
            font-size: 9px !important;
          }
          .printable-content .p-3 {
            padding: 4px !important;
          }
          .printable-content .p-2 {
            padding: 2px !important;
          }
          /* Hide non-essential elements */
          .printable-content .border-t-2 {
            border-top-width: 1px !important;
          }
          /* Ensure it fits on one page */
          .printable-content {
            transform: scale(0.75);
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  )
}