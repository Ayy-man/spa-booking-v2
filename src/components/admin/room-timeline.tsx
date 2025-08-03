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
import { cn } from "@/lib/utils"
import { BookingWithRelations, ServiceCategory } from "@/types/booking"
import { isSpecialStaffRequest } from "@/lib/booking-utils"
import { Clock, RefreshCw, Calendar, Users, TrendingUp, AlertCircle, Star } from "lucide-react"

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
  start: 8, // 8 AM
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

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
      
      // Fetch today's bookings with related data and walk-in origin info
      const { data: bookingsData, error: bookingsError } = await supabase
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

      if (bookingsError) throw bookingsError

      // Fetch active rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, capabilities')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (roomsError) throw roomsError

      setBookings(bookingsData || [])
      setRooms(roomsData || [])
      setLastUpdated(new Date())
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Get booking for a specific room and time slot
  const getBookingForSlot = useCallback((roomId: number, timeString: string): BookingWithRelations | null => {
    return bookings.find(booking => {
      if (booking.room_id !== roomId) return false
      
      const bookingStart = booking.start_time.slice(0, 5) // HH:MM format
      const bookingEnd = booking.end_time.slice(0, 5)
      
      return timeString >= bookingStart && timeString < bookingEnd
    }) || null
  }, [bookings])

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
          <h3 className="font-medium text-gray-900 mb-3">Service Types</h3>
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
                    {BUSINESS_HOURS.start}:00 AM - {BUSINESS_HOURS.end > 12 ? BUSINESS_HOURS.end - 12 : BUSINESS_HOURS.end}:00 {BUSINESS_HOURS.end >= 12 ? 'PM' : 'AM'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {bookings.length} booking{bookings.length !== 1 ? 's' : ''} today
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
              {currentTimePosition >= 0 && (
                <div 
                  className="absolute left-16 right-0 z-50 flex items-center"
                  style={{ top: `${currentTimePosition}%` }}
                >
                  <div className="w-full h-0.5 bg-red-500 opacity-80"></div>
                  <div className="absolute -left-2 w-4 h-4 bg-red-500 rounded-full opacity-80"></div>
                  <div className="absolute -left-16 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
              
              {/* Header Row */}
              <div className="flex border-b-2 border-primary/20 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="w-16 flex items-center justify-center py-3 text-sm font-semibold text-primary border-r-2 border-primary/20 bg-primary/5">
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
                const isNextHour = index < timeSlots.length - 1 && timeSlots[index + 1]?.minute === 0
                
                return (
                  <React.Fragment key={`${slot.hour}-${slot.minute}`}>
                    {/* Hour Header - only show at the beginning of each hour */}
                    {isHourMark && (
                      <div className="flex border-b-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm">
                        <div className="w-16 flex items-center justify-center py-3 text-sm font-bold text-primary border-r bg-gradient-to-r from-primary/10 to-primary/5">
                          {slot.hour > 12 ? slot.hour - 12 : slot.hour === 0 ? 12 : slot.hour}
                          {slot.hour >= 12 ? ' PM' : ' AM'}
                        </div>
                        {rooms.map(room => (
                          <div key={`header-${room.id}-${slot.timeString}`} className="flex-1 min-w-[200px] border-r last:border-r-0 bg-gradient-to-r from-primary/5 to-primary/10" />
                        ))}
                      </div>
                    )}
                    
                    {/* Time Slot Row */}
                    <div className={cn(
                      "flex border-b transition-colors hover:bg-gray-25",
                      isHourMark ? "border-gray-200" : "border-gray-100",
                      isNextHour ? "border-b-primary/30 shadow-sm" : "",
                      // Enhanced visual separation for hour boundaries
                      isNextHour ? "mb-1" : ""
                    )}>
                      {/* Time Label */}
                      <div className={cn(
                        "w-16 flex items-center justify-center py-2 text-xs border-r transition-colors",
                        isHourMark ? "font-semibold text-primary bg-primary/5" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                      )}>
                        {!isHourMark && (
                          <span className="font-medium">:{slot.minute.toString().padStart(2, '0')}</span>
                        )}
                      </div>

                      {/* Room Columns */}
                      {rooms.map(room => {
                        const booking = getBookingForSlot(room.id, slot.timeString)
                        const isStart = booking && isBookingStart(booking, slot.timeString)
                        
                        return (
                          <div 
                            key={`${room.id}-${slot.timeString}`} 
                            className={cn(
                              "flex-1 min-w-[200px] border-r last:border-r-0 relative transition-all duration-200",
                              // Base styling with subtle room differentiation
                              parseInt(room.name.replace('Room ', '')) % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                              // Hour boundary styling
                              isHourMark && "border-t border-primary/10",
                              isNextHour && "border-b-2 border-primary/20 shadow-sm"
                            )}
                          >
                            {booking ? (
                              isStart ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={cn(
                                        "absolute inset-x-0 mx-1 rounded border p-2 transition-all hover:shadow-md z-10 group relative",
                                        getServiceColor(booking.service.category).bg,
                                        getServiceColor(booking.service.category).border,
                                        getServiceColor(booking.service.category).text,
                                        // Special request styling
                                        isSpecialStaffRequest(booking) && "ring-1 ring-amber-400 shadow-md"
                                      )}
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
                              ) : (
                                <div className="h-8" /> // Spacer for continuation of booking
                              )
                            ) : (
                              <div className="h-8" /> // Available slot
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </React.Fragment>
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

      </div>
    </TooltipProvider>
  )
}