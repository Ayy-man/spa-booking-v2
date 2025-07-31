"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { BookingCard } from "./booking-card"
import { FilterBar } from "./filter-bar"
import { QuickActions } from "./quick-actions"
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
  const [rooms, setRooms] = useState<Array<{ id: number; name: string }>>([])
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [viewDate, setViewDate] = useState<'today' | 'tomorrow'>('today')
  
  // Filter states
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

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
  }, [displayMode, viewDate])

  useEffect(() => {
    applyFilters()
  }, [bookings, selectedRoom, selectedStaff, selectedStatus])

  const fetchTodaysSchedule = async () => {
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
  }

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

  const applyFilters = () => {
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
  }

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
            {/* Date Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewDate('today')}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded transition-colors",
                  viewDate === 'today' 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Today
              </button>
              <button
                onClick={() => setViewDate('tomorrow')}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded transition-colors",
                  viewDate === 'tomorrow' 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Tomorrow
              </button>
            </div>
            
            <Button
              onClick={fetchTodaysSchedule}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-900"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        )}
      </div>

      {/* Filters - Only show in dashboard mode */}
      {displayMode === "dashboard" && (
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
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Schedule Grid */}
      {filteredBookings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-6xl">📅</div>
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
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              size={getCardSize()}
              showRoom={true}
              showStaff={true}
              showDuration={true}
              showActions={displayMode === "dashboard"}
              onUpdate={fetchTodaysSchedule}
            />
          ))}
        </div>
      )}

      {/* General Quick Actions for Dashboard Mode */}
      {displayMode === "dashboard" && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              General Quick Actions
            </h3>
            <p className="text-sm text-gray-600">
              Add walk-in appointments or block time slots for breaks and cleaning.
            </p>
            <QuickActions onSuccess={fetchTodaysSchedule} />
          </div>
        </Card>
      )}

      {/* Summary Stats for Monitor Mode */}
      {displayMode === "monitor" && filteredBookings.length > 0 && (
        <Card className="p-6 bg-gray-50 border-gray-200">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {filteredBookings.length}
              </div>
              <div className="text-gray-600">Total Appointments</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {filteredBookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-gray-600">Confirmed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">
                {filteredBookings.filter(b => b.status === 'in_progress').length}
              </div>
              <div className="text-gray-600">In Progress</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {filteredBookings.filter(b => b.status === 'completed').length}
              </div>
              <div className="text-gray-600">Completed</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}