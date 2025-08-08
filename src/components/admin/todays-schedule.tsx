"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { BookingCard } from "./booking-card"
import { FilterBar } from "./filter-bar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { BookingWithRelations } from "@/types/booking"

interface TodaysScheduleProps {
  displayMode?: "dashboard" | "monitor"
  className?: string
}

export function TodaysSchedule({ 
  displayMode = "dashboard",
  className 
}: TodaysScheduleProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingWithRelations[]>([])
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [viewDate, setViewDate] = useState<'today' | 'tomorrow'>('today')
  
  // Filter states
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  const fetchTodaysSchedule = useCallback(async () => {
    try {
      const today = new Date()
      if (viewDate === 'tomorrow') {
        today.setDate(today.getDate() + 1)
      }
      const dateString = today.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*)
        `)
        .eq('appointment_date', dateString)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })

      if (error) throw error
      
      setBookings(data || [])
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [viewDate])

  const fetchFilterOptions = async () => {
    try {
      const [roomsResponse, staffResponse] = await Promise.all([
        supabase.from('rooms').select('id, name').eq('is_active', true).order('name'),
        supabase.from('staff').select('id, name').eq('is_active', true).order('name')
      ])

      if (roomsResponse.error) throw roomsResponse.error
      if (staffResponse.error) throw staffResponse.error

      setRooms(roomsResponse.data || [])
      setStaff(staffResponse.data || [])
    } catch (err: any) {
      console.error('Failed to fetch filter options:', err.message)
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = [...bookings]

    if (selectedRoom) {
      filtered = filtered.filter(booking => booking.room_id.toString() === selectedRoom)
    }

    if (selectedStaff) {
      filtered = filtered.filter(booking => booking.staff_id === selectedStaff)
    }

    if (selectedStatus) {
      filtered = filtered.filter(booking => booking.status === selectedStatus)
    }

    setFilteredBookings(filtered)
  }, [bookings, selectedRoom, selectedStaff, selectedStatus])

  useEffect(() => {
    fetchTodaysSchedule()
    fetchFilterOptions()
    
    // Auto-refresh for monitor mode
    if (displayMode === "monitor") {
      const interval = setInterval(() => {
        fetchTodaysSchedule()
      }, 30000) // Refresh every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [displayMode, viewDate, fetchTodaysSchedule])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const clearFilters = () => {
    setSelectedRoom(null)
    setSelectedStaff(null)
    setSelectedStatus(null)
  }

  const getCardSize = () => {
    return displayMode === "monitor" ? "lg" : "md"
  }

  const getGridColumns = () => {
    if (displayMode === "monitor") {
      return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
    }
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }

  const getHeaderSize = () => {
    return displayMode === "monitor" ? "text-4xl" : "text-2xl"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading today&apos;s schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={cn("font-bold text-gray-900", getHeaderSize())}>
            {viewDate === 'today' ? "Today's Schedule" : "Tomorrow's Schedule"}
          </h1>
          <p className={cn(
            "text-gray-600",
            displayMode === "monitor" ? "text-lg" : "text-base"
          )}>
            {(() => {
              const date = new Date()
              if (viewDate === 'tomorrow') {
                date.setDate(date.getDate() + 1)
              }
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            })()}
          </p>
          <p className={cn(
            "text-gray-500",
            displayMode === "monitor" ? "text-base" : "text-sm"
          )}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        {displayMode === "dashboard" && (
          <div className="flex items-center space-x-3">
            {/* Date Toggle with enhanced micro-interactions */}
            <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewDate('today')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-out relative",
                  viewDate === 'today' 
                    ? "bg-white text-gray-900 shadow-lg shadow-gray-200/50 scale-105" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-102"
                )}
              >
                <span className="relative z-10">Today</span>
                {viewDate === 'today' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/20 rounded-md opacity-20"></div>
                )}
              </button>
              <button
                onClick={() => setViewDate('tomorrow')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-out relative",
                  viewDate === 'tomorrow' 
                    ? "bg-white text-gray-900 shadow-lg shadow-gray-200/50 scale-105" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-102"
                )}
              >
                <span className="relative z-10">Tomorrow</span>
                {viewDate === 'tomorrow' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/20 rounded-md opacity-20"></div>
                )}
              </button>
            </div>
            
            <Button
              onClick={fetchTodaysSchedule}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-900 
                       transition-all duration-300 ease-out
                       hover:shadow-lg hover:shadow-gray-400/30 hover:-translate-y-0.5
                       active:translate-y-0 active:shadow-sm
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                       group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Refreshing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Filters - Only show in dashboard mode with enhanced animations */}
      {displayMode === "dashboard" && (
        <div className="animate-in slide-in-from-top-4 fade-in duration-500 delay-100">
          <FilterBar
            onRoomFilter={setSelectedRoom}
            onStaffFilter={setSelectedStaff}
            onStatusFilter={setSelectedStatus}
            onClearFilters={clearFilters}
            rooms={rooms}
            staff={staff}
            selectedRoom={selectedRoom}
            selectedStaff={selectedStaff}
            selectedStatus={selectedStatus}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Schedule Grid with enhanced animations */}
      {filteredBookings.length === 0 ? (
        <Card className="p-8 text-center animate-in fade-in duration-500 delay-200 
                       hover:shadow-lg hover:shadow-gray-200/30 transition-shadow duration-300">
          <div className="space-y-4">
            <div className="text-6xl animate-bounce">📅</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {bookings.length === 0 ? "No appointments today" : "No appointments match your filters"}
              </h3>
              <p className="text-gray-600">
                {bookings.length === 0 
                  ? "Enjoy the quiet day!" 
                  : "Try adjusting your filters to see more appointments."
                }
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-4",
          getGridColumns()
        )}>
          {filteredBookings.map((booking, index) => (
            <div
              key={booking.id}
              className="animate-in fade-in duration-500"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <BookingCard
                booking={booking}
                size={getCardSize()}
                showRoom={true}
                showStaff={true}
                showDuration={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Display-Only Notice */}
      <Card className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            Display-Only Mode
          </h3>
          <p className="text-xs text-gray-500">
            Schedule view is read-only. Use dedicated admin tools for booking management.
          </p>
        </div>
      </Card>

      {/* Summary Stats for Monitor Mode with enhanced micro-interactions */}
      {displayMode === "monitor" && filteredBookings.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 
                       hover:shadow-xl hover:shadow-gray-200/50 
                       transition-all duration-500 ease-out
                       animate-in fade-in duration-700 delay-500">
          <div className="grid grid-cols-4 gap-6">
            {/* Total Appointments */}
            <div className="text-center group cursor-default">
              <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:shadow-gray-200/30 hover:-translate-y-1
                            hover:border-primary/20 hover:bg-gradient-to-br hover:from-white hover:to-primary/5
                            group-hover:scale-105">
                <div className="text-4xl font-bold text-gray-900 mb-2
                              transition-all duration-300 group-hover:text-primary">
                  {filteredBookings.length}
                </div>
                <div className="text-gray-600 font-medium transition-colors duration-300
                              group-hover:text-primary-dark">
                  Total Appointments
                </div>
              </div>
            </div>
            
            {/* Confirmed */}
            <div className="text-center group cursor-default">
              <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:shadow-green-200/30 hover:-translate-y-1
                            hover:border-green-200 hover:bg-gradient-to-br hover:from-white hover:to-green-50
                            group-hover:scale-105">
                <div className="text-4xl font-bold text-green-600 mb-2
                              transition-all duration-300 group-hover:text-green-700 group-hover:scale-110">
                  {filteredBookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-gray-600 font-medium transition-colors duration-300
                              group-hover:text-green-700">
                  Confirmed
                </div>
              </div>
            </div>
            
            {/* In Progress */}
            <div className="text-center group cursor-default">
              <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:shadow-yellow-200/30 hover:-translate-y-1
                            hover:border-yellow-200 hover:bg-gradient-to-br hover:from-white hover:to-yellow-50
                            group-hover:scale-105">
                <div className="text-4xl font-bold text-yellow-600 mb-2
                              transition-all duration-300 group-hover:text-yellow-700 group-hover:scale-110">
                  {filteredBookings.filter(b => b.status === 'in_progress').length}
                </div>
                <div className="text-gray-600 font-medium transition-colors duration-300
                              group-hover:text-yellow-700">
                  In Progress
                </div>
              </div>
            </div>
            
            {/* Completed */}
            <div className="text-center group cursor-default">
              <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100
                            transition-all duration-300 ease-out
                            hover:shadow-lg hover:shadow-blue-200/30 hover:-translate-y-1
                            hover:border-blue-200 hover:bg-gradient-to-br hover:from-white hover:to-blue-50
                            group-hover:scale-105 relative overflow-hidden">
                <div className="text-4xl font-bold text-blue-600 mb-2
                              transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110">
                  {filteredBookings.filter(b => b.status === 'completed').length}
                </div>
                <div className="text-gray-600 font-medium transition-colors duration-300
                              group-hover:text-blue-700">
                  Completed
                </div>
                {/* Celebration sparkles for completed */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-xs animate-bounce">✨</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress bar indicator */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Today's Progress</span>
              <span className="font-medium">
                {Math.round((filteredBookings.filter(b => b.status === 'completed').length / filteredBookings.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full 
                         transition-all duration-1000 ease-out hover:from-blue-600 hover:to-blue-700"
                style={{ 
                  width: `${(filteredBookings.filter(b => b.status === 'completed').length / filteredBookings.length) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}