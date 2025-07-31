"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BookingWithRelations } from "@/types/booking"
import { 
  getStaffSchedule, 
  getAllActiveStaff, 
  getServiceCategoryColor 
} from "@/lib/admin-booking-logic"
import { isSpecialStaffRequest } from "@/lib/booking-utils"

type ViewMode = "day" | "week"

interface StaffOption {
  id: string
  name: string
  default_room_id: number | null
}

interface StaffScheduleProps {
  className?: string
}

export function StaffSchedule({ className }: StaffScheduleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [selectedStaff, setSelectedStaff] = useState<string>("")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const fetchActiveStaff = useCallback(async () => {
    try {
      const result = await getAllActiveStaff()
      if (result.success && result.data) {
        // Filter out "any" staff member for individual staff schedules
        const realStaff = result.data.filter(member => member.id !== 'any')
        setStaff(realStaff)
        if (realStaff.length > 0 && !selectedStaff) {
          setSelectedStaff(realStaff[0].id)
        }
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err: any) {
      setError(`Failed to load staff: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedStaff])

  const getDateRange = useCallback(() => {
    if (viewMode === "day") {
      const dateStr = currentDate.toISOString().split("T")[0]
      return { startDate: dateStr, endDate: dateStr }
    } else {
      // Week view - get Monday to Sunday
      const monday = new Date(currentDate)
      const dayOfWeek = monday.getDay()
      const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      monday.setDate(diff)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      return {
        startDate: monday.toISOString().split("T")[0],
        endDate: sunday.toISOString().split("T")[0]
      }
    }
  }, [viewMode, currentDate])

  const fetchStaffSchedule = useCallback(async () => {
    if (!selectedStaff) return

    setLoading(true)
    setError("")

    const { startDate, endDate } = getDateRange()
    const result = await getStaffSchedule(selectedStaff, startDate, endDate)

    if (result.success && result.data) {
      setBookings(result.data)
    } else if (result.error) {
      setError(result.error)
    }

    setLoading(false)
  }, [selectedStaff, getDateRange])

  useEffect(() => {
    fetchActiveStaff()
  }, [fetchActiveStaff])

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffSchedule()
    }
  }, [selectedStaff, fetchStaffSchedule])

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

    const getDateTitle = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    } else {
      const { startDate, endDate } = getDateRange()
      const start = new Date(startDate)
      const end = new Date(endDate)
      return `${start.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      })} - ${end.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      })}`
    }
  }

  const selectedStaffName = staff.find(s => s.id === selectedStaff)?.name || ""

  const renderDayView = () => {
    const todayBookings = bookings.filter(
      booking => booking.appointment_date === currentDate.toISOString().split("T")[0]
    )

    if (todayBookings.length === 0) {
      return (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-4xl">📅</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No appointments scheduled
              </h3>
              <p className="text-gray-600">
                {selectedStaffName} has no appointments on this day.
              </p>
            </div>
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {todayBookings.map((booking) => {
          const isSpecialRequest = isSpecialStaffRequest(booking)
          
          return (
            <Card 
              key={booking.id} 
              className={cn(
                "p-4 border-l-4 border-l-blue-500 relative",
                isSpecialRequest && "ring-2 ring-amber-300 bg-gradient-to-r from-amber-50 to-white"
              )}
            >
              {/* Special Request Indicator */}
              {isSpecialRequest && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-bold text-gray-900">
                    {formatTime(booking.start_time)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({booking.duration}min)
                  </span>
                  {isSpecialRequest && (
                    <span className="text-amber-600 text-xs font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                      Special Request
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    getServiceCategoryColor(booking.service.category)
                  )}>
                    {booking.service.category.replace("_", " ")}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                    booking.status === "completed" ? "bg-blue-100 text-blue-800" :
                    booking.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  )}>
                    {booking.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 flex items-center">
                  {booking.service.name}
                  {isSpecialRequest && (
                    <svg className="w-4 h-4 text-amber-500 ml-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Room:</span>
                    <span className="ml-2 font-medium">#{booking.room.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End Time:</span>
                    <span className="ml-2 font-medium">{formatTime(booking.end_time)}</span>
                  </div>
                </div>

                {isSpecialRequest && (
                  <div className="text-sm bg-amber-50 p-2 rounded border border-amber-200">
                    <span className="text-amber-700 font-medium">Customer specifically requested this staff member</span>
                  </div>
                )}

                {booking.internal_notes && (
                  <div className="text-sm">
                    <span className="text-gray-500">Notes:</span>
                    <span className="ml-2 text-gray-700">{booking.internal_notes}</span>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const weekDays = []

    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      weekDays.push(day)
    }

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayStr = day.toISOString().split("T")[0]
          const dayBookings = bookings.filter(
            booking => booking.appointment_date === dayStr
          )

          return (
            <Card key={dayStr} className="p-3">
              <div className="text-center mb-3">
                <div className="font-medium text-gray-900">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="text-sm text-gray-600">
                  {day.getDate()}
                </div>
              </div>

              <div className="space-y-2">
                {dayBookings.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-2">
                    No appointments
                  </div>
                ) : (
                  dayBookings.map((booking) => {
                    const isSpecialRequest = isSpecialStaffRequest(booking)
                    
                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          "p-2 rounded text-xs border-l-2 relative",
                          getServiceCategoryColor(booking.service.category),
                          isSpecialRequest && "ring-1 ring-amber-400 bg-amber-50"
                        )}
                      >
                        {/* Special Request Indicator for Week View */}
                        {isSpecialRequest && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full">
                            <svg className="w-1 h-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="font-medium mb-1 flex items-center">
                          {formatTime(booking.start_time)}
                          {isSpecialRequest && (
                            <svg className="w-2 h-2 text-amber-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          {booking.service.name}
                        </div>
                        <div className="text-gray-600 mt-1">
                          Room {booking.room.name}
                        </div>
                        {isSpecialRequest && (
                          <div className="text-amber-700 text-xs mt-1 font-medium">
                            Requested
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

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
    <Card className={cn("space-y-6", className)}>
      <div className="p-6 border-b border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Staff Schedule
            </h2>
            <p className="text-gray-600">
              View individual staff member schedules and appointments
            </p>
          </div>
          
          <Button
            onClick={fetchStaffSchedule}
            disabled={loading}
            className="bg-black text-white hover:bg-gray-900"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Staff Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Staff:</label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className={cn(
                "rounded-none",
                viewMode === "day" ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              )}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className={cn(
                "rounded-none",
                viewMode === "week" ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              )}
            >
              Week
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("prev")}
            >
              ←
            </Button>
            <span className="text-sm font-medium text-gray-700 min-w-0">
              {getDateTitle()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("next")}
            >
              →
            </Button>
          </div>

          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <Card className="bg-red-50 border-red-200 p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {!selectedStaff ? (
          <Card className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-4xl">{loading ? "⏳" : "👥"}</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {loading ? "Loading Staff..." : "Select a Staff Member"}
                </h3>
                <p className="text-gray-600">
                  {loading 
                    ? "Loading available staff members..." 
                    : "Choose a staff member from the dropdown to view their schedule."
                  }
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {viewMode === "day" ? renderDayView() : renderWeekView()}
            
            {/* Privacy Notice */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 italic">
                Customer details are hidden for privacy. Only service and scheduling information is displayed.
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}