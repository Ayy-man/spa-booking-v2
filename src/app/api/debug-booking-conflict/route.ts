import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { safeTimeSlice } from '@/lib/time-utils'

export async function POST(request: NextRequest) {
  try {
    const { service_id, staff_id, appointment_date, start_time } = await request.json()

    // Step 1: Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()

    if (serviceError) {
      return NextResponse.json({ error: 'Service not found', details: serviceError }, { status: 400 })
    }

    // Step 2: Calculate end time
    const startTimeObj = new Date(`2000-01-01T${start_time}:00`)
    const endTimeObj = new Date(startTimeObj.getTime() + service.duration * 60000)
    const end_time = safeTimeSlice(endTimeObj.toTimeString())

    // Step 3: Get optimal room assignment
    let assigned_room_id = 1 // Default fallback
    try {
      const { data: roomAssignment, error: roomError } = await supabase.rpc('assign_optimal_room', {
        p_service_id: service_id,
        p_preferred_staff_id: staff_id,
        p_booking_date: appointment_date,
        p_start_time: start_time
      })

      if (roomAssignment && roomAssignment.length > 0 && roomAssignment[0].assigned_room_id) {
        assigned_room_id = roomAssignment[0].assigned_room_id
      }
    } catch (roomError) {
      // Use default room
    }

    // Step 4: Check for existing bookings on this date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, service_id, staff_id, room_id, start_time, end_time, status')
      .eq('appointment_date', appointment_date)
      .neq('status', 'cancelled')
      .order('start_time')

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to query existing bookings', details: bookingsError }, { status: 500 })
    }

    // Step 5: Check for room conflicts
    const roomConflicts = existingBookings?.filter(booking => {
      if (booking.room_id !== assigned_room_id) return false
      
      // Check time overlap: (start_time < NEW.end_time AND end_time > NEW.start_time)
      const existingStart = booking.start_time
      const existingEnd = booking.end_time
      
      return (existingStart < end_time && existingEnd > start_time)
    }) || []

    // Step 6: Check for staff conflicts
    const staffConflicts = existingBookings?.filter(booking => {
      if (booking.staff_id !== staff_id) return false
      
      // Check time overlap
      const existingStart = booking.start_time
      const existingEnd = booking.end_time
      
      return (existingStart < end_time && existingEnd > start_time)
    }) || []

    // Step 7: Check for buffer violations (15-minute buffer)
    const bufferConflicts = existingBookings?.filter(booking => {
      if (booking.room_id !== assigned_room_id) return false
      
      // Calculate buffer times
      const existingStart = new Date(`2000-01-01T${booking.start_time}:00`)
      const existingEnd = new Date(`2000-01-01T${booking.end_time}:00`)
      const newStart = new Date(`2000-01-01T${start_time}:00`)
      const newEnd = new Date(`2000-01-01T${end_time}:00`)
      
      // Check if new booking starts within 15 minutes of existing booking ending
      const timeDiffAfter = (newStart.getTime() - existingEnd.getTime()) / (1000 * 60) // minutes
      
      // Check if existing booking starts within 15 minutes of new booking ending
      const timeDiffBefore = (existingStart.getTime() - newEnd.getTime()) / (1000 * 60) // minutes
      
      return (timeDiffAfter < 15 && timeDiffAfter >= 0) || (timeDiffBefore < 15 && timeDiffBefore >= 0)
    }) || []

    // Step 8: Get staff info
    const { data: staffInfo } = await supabase
      .from('staff')
      .select('name, default_room_id')
      .eq('id', staff_id)
      .single()

    return NextResponse.json({
      success: true,
      debug_info: {
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          category: service.category,
          requires_room_3: service.requires_room_3,
          is_couples_service: service.is_couples_service
        },
        booking_details: {
          service_id,
          staff_id,
          appointment_date,
          start_time,
          end_time,
          assigned_room_id
        },
        staff_info: staffInfo,
        existing_bookings: existingBookings,
        conflicts: {
          room_conflicts: roomConflicts,
          staff_conflicts: staffConflicts,
          buffer_conflicts: bufferConflicts,
          total_room_conflicts: roomConflicts.length,
          total_staff_conflicts: staffConflicts.length,
          total_buffer_conflicts: bufferConflicts.length
        },
        conflict_analysis: {
          would_trigger_room_error: roomConflicts.length > 0,
          would_trigger_staff_error: staffConflicts.length > 0,
          would_trigger_buffer_error: bufferConflicts.length > 0,
          primary_conflict_source: roomConflicts.length > 0 ? 'room' : staffConflicts.length > 0 ? 'staff' : bufferConflicts.length > 0 ? 'buffer' : 'none'
        }
      }
    })

  } catch (error: any) {
    console.error('Debug booking conflict error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 })
  }
}