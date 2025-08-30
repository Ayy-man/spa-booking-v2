"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CouplesBookingIndicator } from "@/components/ui/couples-booking-indicator"
import { cn } from "@/lib/utils"
import { BookingWithRelations, ServiceCategory } from "@/types/booking"
import { isSpecialStaffRequest } from "@/lib/booking-utils"
import { FilterBar } from "@/components/admin/filter-bar"
import { BookingDetailsModal } from "@/components/admin/BookingDetailsModal"
import { Clock, RefreshCw, Calendar, Users, TrendingUp, AlertCircle, Star, RotateCw } from "lucide-react"

interface TimeSlot {
  hour: number
  minute: number
  timeString: string
}

interface RoomTimelineProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}


// Service category color mapping for visual distinction
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
  start: 9, // 9 AM (business starts at 9)
  end: 20,  // 8 PM
  slotDuration: 15 // 15 minutes
}

export function RoomTimeline({ 
  className, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: RoomTimelineProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [rooms, setRooms] = useState<Array<{ id: number; name: string; capabilities: string[] }>>([])
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Generate time slots for the timeline
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      for (let minute = 0; minute < 60; minute += BUSINESS_HOURS.slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push({ hour, minute, timeString })
      }
    }
    return slots
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      // Build the booking query with optional staff filtering
      let bookingQuery = supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          walk_in_origin:walk_ins!booking_id(id, customer_name, checked_in_at)
        `)
        .eq('appointment_date', today)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })

      // Apply staff filter if selected
      if (selectedStaff) {
        bookingQuery = bookingQuery.eq('staff_id', selectedStaff)
      }

      const { data: bookingsData, error: bookingsError } = await bookingQuery

      if (bookingsError) throw bookingsError

      // Fetch active rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, capabilities')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (roomsError) throw roomsError

      // Fetch active staff for the filter
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (staffError) throw staffError

      setBookings(bookingsData || [])
      setRooms(roomsData || [])
      setStaff(staffData || [])
      setLastUpdated(new Date())
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedStaff])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch data on component mount and set up auto-refresh
  useEffect(() => {
    fetchData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchData])

  // Handle staff filter changes
  const handleStaffFilter = useCallback((staffId: string | null) => {
    setSelectedStaff(staffId)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSelectedStaff(null)
  }, [])

  // Get booking for a specific room and time slot
  const getBookingForSlot = useCallback((roomId: number, timeString: string): BookingWithRelations | null => {
    return bookings.find(booking => {
      if (booking.room_id !== roomId) return false
      
      const bookingStart = booking.start_time.slice(0, 5) // HH:MM format
      const bookingEnd = booking.end_time.slice(0, 5)
      
      return timeString >= bookingStart && timeString < bookingEnd
    }) || null
  }, [bookings])
  
  // Check if a booking is a buffer appointment
  const isBufferBooking = useCallback((booking: BookingWithRelations): boolean => {
    return booking.booking_type === 'buffer' || booking.service?.name === 'Buffer Time'
  }, [])

  // Check if a time slot is within a booking's buffer zone
  const isInBufferZone = useCallback((roomId: number, timeString: string): { 
    isBuffer: boolean; 
    bufferType: 'pre' | 'post' | null;
    booking: BookingWithRelations | null;
  } => {
    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue
      if (booking.status === 'cancelled') continue
      if (isBufferBooking(booking)) continue // Skip actual buffer appointments
      
      // Check if this time slot falls in the buffer zones
      const bufferStart = booking.buffer_start || null
      const bufferEnd = booking.buffer_end || null
      
      if (bufferStart && bufferEnd) {
        const currentTime = timeString
        const serviceStart = booking.start_time.slice(0, 5)
        const serviceEnd = booking.end_time.slice(0, 5)
        
        // Check if we're in the pre-service buffer (before start_time)
        if (currentTime >= bufferStart && currentTime < serviceStart) {
          return { isBuffer: true, bufferType: 'pre', booking }
        }
        
        // Check if we're in the post-service buffer (after end_time)
        if (currentTime >= serviceEnd && currentTime < bufferEnd) {
          return { isBuffer: true, bufferType: 'post', booking }
        }
      }
    }
    
    return { isBuffer: false, bufferType: null, booking: null }
  }, [bookings, isBufferBooking])

  // Calculate room utilization percentage
  const getRoomUtilization = useCallback((roomId: number): number => {
    const roomBookings = bookings.filter(b => b.room_id === roomId)
    const totalBookedMinutes = roomBookings.reduce((total, booking) => total + (booking.service.duration || 60), 0)
    const totalBusinessMinutes = (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60
    return Math.round((totalBookedMinutes / totalBusinessMinutes) * 100)
  }, [bookings])

  // Get current time position for indicator
  const getCurrentTimePosition = useCallback((): number => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    if (currentHour < BUSINESS_HOURS.start || currentHour >= BUSINESS_HOURS.end) {
      return -1 // Outside business hours
    }
    
    const minutesFromStart = (currentHour - BUSINESS_HOURS.start) * 60 + currentMinute
    const totalSlots = timeSlots.length
    const totalMinutes = (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60
    
    return (minutesFromStart / totalMinutes) * 100
  }, [timeSlots])

  // Check if a time slot should show the booking start
  const isBookingStart = useCallback((booking: BookingWithRelations, timeString: string): boolean => {
    return booking.start_time.slice(0, 5) === timeString
  }, [])

  // Get service color
  const getServiceColor = useCallback((category: string) => {
    return SERVICE_COLORS[category as ServiceCategory] || SERVICE_COLORS.package
  }, [])


  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading room timeline...</p>
        </div>
      </div>
    )
  }

  const currentTimePosition = getCurrentTimePosition()

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Timeline</h2>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {selectedStaff && (
                <span className="ml-2 text-primary font-medium">
                  • Filtered by {staff.find(s => s.id === selectedStaff)?.name || 'Selected Staff'}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          onRoomFilter={() => {}} // Room filtering not needed for timeline
          onStaffFilter={handleStaffFilter}
          onStatusFilter={() => {}} // Status filtering not needed for timeline
          onClearFilters={handleClearFilters}
          rooms={[]} // Room filtering not needed for timeline
          staff={staff}
          selectedRoom={null}
          selectedStaff={selectedStaff}
          selectedStatus={null}
          size="sm"
          className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"
        />

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200 p-4">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Room Utilization Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rooms.map(room => (
            <Card key={room.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-500">Room {room.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {getRoomUtilization(room.id)}%
                  </div>
                  <p className="text-xs text-gray-500">Utilization</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Service Legend */}
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Service Types & Legend</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICE_COLORS).map(([category, colors]) => (
              <Badge
                key={category}
                className={cn(
                  "px-2 py-1 text-xs font-medium border",
                  colors.bg,
                  colors.border,
                  colors.text
                )}
              >
                {category.replace('_', ' ').toUpperCase()}
              </Badge>
            ))}
            <Badge
              className="px-2 py-1 text-xs font-medium border bg-gray-100 border-gray-300 text-gray-600"
            >
              BUFFER TIME (15 MIN)
            </Badge>
            <Badge
              className="px-2 py-1 text-xs font-medium border bg-orange-50 border-orange-300 text-orange-700"
            >
              🔧 PRE-SERVICE BUFFER
            </Badge>
            <Badge
              className="px-2 py-1 text-xs font-medium border bg-orange-100 border-orange-300 text-orange-800"
            >
              ✨ POST-SERVICE BUFFER
            </Badge>
          </div>
        </Card>

        {/* Timeline Grid */}
        <Card className="overflow-hidden shadow-lg border-primary/10">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b-2 border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Daily Timeline</h3>
                  <span className="text-sm text-gray-600">
                    {BUSINESS_HOURS.start}:00 AM - {BUSINESS_HOURS.end > 12 ? BUSINESS_HOURS.end - 12 : BUSINESS_HOURS.end}:00 PM
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {bookings.length} booking{bookings.length !== 1 ? 's' : ''} today
                  {selectedStaff && (
                    <span className="text-primary font-medium"> (filtered)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  View-only mode
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative overflow-x-auto">
            {/* Timeline Container */}
            <div className="min-w-[800px] relative">
              {/* Current Time Indicator */}
              {currentTimePosition >= 0 && (() => {
                // Get the current time
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                
                // Calculate position based on hours and minutes
                // Each hour has 4 rows (15-minute intervals)
                const hoursSinceStart = currentHour - BUSINESS_HOURS.start;
                const totalRowsToCurrentHour = hoursSinceStart * 4; // 4 rows per hour
                
                // Add fractional rows based on minutes (0-59 minutes maps to 0-4 rows)
                const minuteFraction = currentMinute / 60; // 0 to 1
                const additionalRows = minuteFraction * 4; // 0 to 4 rows
                
                const totalRows = totalRowsToCurrentHour + additionalRows;
                
                // Each row is exactly 33px (h-8 + 1px border)
                const rowHeight = 33;
                // Header: py-3 (24px) + content + border-b-2 (2px) ≈ 64px
                const headerHeight = 64;
                
                // Calculate the exact pixel position
                const pixelPosition = headerHeight + (totalRows * rowHeight);
                
                return (
                  <div 
                    className="absolute left-20 right-0 z-50 flex items-center pointer-events-none"
                    style={{ top: `${pixelPosition}px` }}
                  >
                    <div className="w-full h-0.5 bg-red-500 opacity-90"></div>
                    <div className="absolute -left-2 w-4 h-4 bg-red-500 rounded-full opacity-90"></div>
                    <div className="absolute -left-20 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg font-medium">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Header Row */}
              <div className="flex border-b-2 border-primary/20 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="w-20 flex items-center justify-center py-3 text-sm font-semibold text-primary border-r-2 border-primary/20 bg-primary/5">
                  Time
                </div>
                {rooms.map(room => (
                  <div key={room.id} className="flex-1 min-w-[200px] p-4 text-center border-r-2 border-primary/10 last:border-r-0 hover:bg-primary/5 transition-colors">
                    <div className="font-semibold text-gray-900">{room.name}</div>
                    <div className="text-sm text-gray-600 font-medium">Room {room.id}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getRoomUtilization(room.id)}% utilized
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {timeSlots.map((slot, index) => {
                const isHourMark = slot.minute === 0
                const isHalfHour = slot.minute === 30
                
                // Format time display
                const displayHour = slot.hour > 12 ? slot.hour - 12 : slot.hour === 0 ? 12 : slot.hour
                const ampm = slot.hour >= 12 ? 'PM' : 'AM'
                const timeDisplay = `${displayHour}:${slot.minute.toString().padStart(2, '0')}`
                
                return (
                  <div key={`${slot.hour}-${slot.minute}`} className={cn(
                    "flex border-b transition-colors hover:bg-gray-25",
                    isHourMark ? "border-gray-300" : "border-gray-100",
                    isHalfHour ? "border-gray-200" : ""
                  )}>
                    {/* Time Label - Show all times */}
                    <div className={cn(
                      "w-20 flex items-center justify-center h-8 text-xs border-r transition-colors",
                      isHourMark ? "font-bold text-primary bg-primary/10" : 
                      isHalfHour ? "font-semibold text-gray-700 bg-gray-100" :
                      "text-gray-600 bg-gray-50 hover:bg-gray-100"
                    )}>
                      <span className={isHourMark ? "text-sm" : ""}>
                        {timeDisplay}
                        {isHourMark && <span className="ml-1 text-xs">{ampm}</span>}
                      </span>
                    </div>

                    {/* Room Columns */}
                    {rooms.map(room => {
                      const booking = getBookingForSlot(room.id, slot.timeString)
                      const isStart = booking && isBookingStart(booking, slot.timeString)
                      const isBuffer = booking && isBufferBooking(booking)
                      const bufferZone = isInBufferZone(room.id, slot.timeString)
                      
                      return (
                        <div 
                          key={`${room.id}-${slot.timeString}`} 
                          className={cn(
                            "flex-1 min-w-[200px] border-r last:border-r-0 relative transition-all duration-200",
                            // Base styling with subtle room differentiation
                            parseInt(room.name.replace('Room ', '')) % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                            // Hour boundary styling
                            isHourMark && "border-t-2 border-primary/20",
                            // Buffer zone styling - light striped background
                            bufferZone.isBuffer && "bg-gradient-to-r from-orange-50/50 to-orange-100/50 bg-[length:8px_8px] bg-repeat"
                          )}
                          style={bufferZone.isBuffer ? {
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(251, 146, 60, 0.1) 2px, rgba(251, 146, 60, 0.1) 4px)'
                          } : undefined}
                        >
                            {booking ? (
                              isStart ? (
                                isBuffer ? (
                                  // Buffer appointment - simple off-white block
                                  <div 
                                    className="absolute inset-x-0 mx-1 rounded border p-1 bg-gray-100 border-gray-300"
                                    style={{
                                      height: `${(15 / BUSINESS_HOURS.slotDuration) * 32}px`,
                                    }}
                                  >
                                    <div className="text-xs text-gray-500 text-center">Buffer</div>
                                  </div>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={cn(
                                          "absolute inset-x-0 mx-1 rounded border p-2 transition-all hover:shadow-md z-10 group relative cursor-pointer",
                                          getServiceColor(booking.service.category).bg,
                                          getServiceColor(booking.service.category).border,
                                          getServiceColor(booking.service.category).text,
                                          // Special request styling
                                          isSpecialStaffRequest(booking) && "ring-1 ring-amber-400 shadow-md"
                                        )}
                                        onClick={() => {
                                          setSelectedBooking(booking)
                                          setShowBookingModal(true)
                                        }}
                                        style={{
                                          height: `${((booking.service.duration || 60) / BUSINESS_HOURS.slotDuration) * 32}px`,
                                        }}
                                      >
                                      {/* Walk-In Origin Indicator */}
                                      {booking.walk_in_origin && (
                                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                          <Users className="h-1.5 w-1.5 text-white" fill="currentColor" />
                                        </div>
                                      )}
                                      
                                      {/* Special Request Indicator */}
                                      {isSpecialStaffRequest(booking) && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                                          <Star className="h-1.5 w-1.5 text-white" fill="currentColor" />
                                        </div>
                                      )}
                                      
                                      {/* Couples Booking Indicator */}
                                      {booking.booking_type === 'couple' && (
                                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                                          <Users className="h-1.5 w-1.5 text-white" fill="currentColor" />
                                        </div>
                                      )}
                                      
                                      {/* Rescheduled Indicator */}
                                      {(booking as any).rescheduled_count > 0 && (
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                                          <RotateCw className="h-1.5 w-1.5 text-white" />
                                        </div>
                                      )}
                                      
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium truncate flex items-center">
                                            {booking.service.name}
                                            {isSpecialStaffRequest(booking) && (
                                              <Star className="h-2 w-2 text-amber-600 ml-1 flex-shrink-0" fill="currentColor" />
                                            )}
                                          </div>
                                          <div className="text-xs opacity-75 truncate">
                                            {booking.staff.name}
                                            {isSpecialStaffRequest(booking) && (
                                              <span className="text-amber-700 ml-1">(Requested)</span>
                                            )}
                                          </div>
                                          <div className="text-xs opacity-60">
                                            {booking.service.duration}min
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <div className="space-y-2">
                                      <div className="font-medium flex items-center">
                                        {booking.service.name}
                                        {isSpecialStaffRequest(booking) && (
                                          <Star className="h-3 w-3 text-amber-500 ml-2" fill="currentColor" />
                                        )}
                                      </div>
                                      
                                      {/* Walk-in Origin Badge */}
                                      {booking.walk_in_origin && (
                                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                          <Users className="h-3 w-3 mr-1" />
                                          Walk-In Customer
                                        </div>
                                      )}
                                      
                                      {/* Couples Booking Badge */}
                                      {booking.booking_type === 'couple' && (
                                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                          <Users className="h-3 w-3 mr-1" />
                                          Couples Booking
                                        </div>
                                      )}
                                      
                                      {/* Rescheduled Badge */}
                                      {(booking as any).rescheduled_count > 0 && (
                                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                          <RotateCw className="h-3 w-3 mr-1" />
                                          Rescheduled {(booking as any).rescheduled_count}x
                                        </div>
                                      )}
                                      
                                      <div className="text-sm space-y-1">
                                        <div>Staff: {booking.staff.name}
                                          {isSpecialStaffRequest(booking) && (
                                            <span className="text-amber-600 ml-1 font-medium">(Specifically Requested)</span>
                                          )}
                                        </div>
                                        <div>Time: {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</div>
                                        <div>Duration: {booking.service.duration} minutes</div>
                                        <div>Status: {booking.status}</div>
                                        <div>Price: ${booking.total_price}</div>
                                        
                                        {/* Walk-in Details */}
                                        {booking.walk_in_origin && (
                                          <div className="border-t border-gray-200 pt-2 mt-2">
                                            <div className="text-blue-700 font-medium">Walk-In Details:</div>
                                            <div>Customer: {booking.walk_in_origin.customer_name}</div>
                                            {booking.walk_in_origin.checked_in_at && (
                                              <div>Checked in: {new Date(booking.walk_in_origin.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            )}
                                          </div>
                                        )}
                                        
                                        <div className="text-xs text-gray-500 mt-2">
                                          Display-only mode
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                )
                              ) : (
                                <div className="h-8" /> // Spacer for continuation of booking
                              )
                            ) : bufferZone.isBuffer ? (
                              // Buffer zone indicator - show which appointment this buffer belongs to
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="h-8 flex items-center justify-center cursor-help">
                                    <div className="text-xs text-orange-600 font-medium opacity-75">
                                      {bufferZone.bufferType === 'pre' ? '🔧' : '✨'} Buffer
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-2">
                                    <div className="font-medium text-orange-700">
                                      {bufferZone.bufferType === 'pre' ? 'Pre-Service Buffer' : 'Post-Service Buffer'}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      15-minute {bufferZone.bufferType === 'pre' ? 'setup' : 'cleanup'} time for:
                                    </div>
                                    <div className="font-medium">
                                      {bufferZone.booking?.service.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {bufferZone.booking?.start_time} - {bufferZone.booking?.end_time}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Staff: {bufferZone.booking?.staff.name}
                                    </div>
                                    <div className="text-xs text-orange-600 mt-2 italic">
                                      This time is blocked for room preparation
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="h-8" /> // Available slot
                            )}
                          </div>
                        )
                      })}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {bookings.length}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 mr-1" />
              Total Appointments
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Users className="h-4 w-4 mr-1" />
              Confirmed
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {Math.round(bookings.reduce((sum, b) => sum + (b.service.duration || 60), 0) / 60)}h
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Clock className="h-4 w-4 mr-1" />
              Total Hours
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {Math.round(rooms.reduce((sum, room) => sum + getRoomUtilization(room.id), 0) / rooms.length)}%
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Avg Utilization
            </div>
          </Card>
        </div>

        {/* Booking Details Modal */}
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            open={showBookingModal}
            onOpenChange={(open) => {
              setShowBookingModal(open)
              if (!open) setSelectedBooking(null)
            }}
            onActionComplete={fetchData}
          />
        )}

      </div>
    </TooltipProvider>
  )
}