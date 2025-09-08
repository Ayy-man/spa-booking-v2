import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGuamTime, createGuamDateTime, isTimeSlotBookable } from '@/lib/timezone-utils'

// Create Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface RescheduleRequest {
  new_date: string
  new_start_time: string
  reason?: string
  notify_customer?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)

    // Parse request body
    const body: RescheduleRequest = await request.json()
    const { new_date, new_start_time, reason, notify_customer = true } = body

    if (!new_date || !new_start_time) {
      return NextResponse.json(
        { error: 'New date and time are required' },
        { status: 400 }
      )
    }


    // First, check if booking can be rescheduled
    const { data: canReschedule, error: checkError } = await supabaseAdmin
      .rpc('can_reschedule_booking', { p_booking_id: bookingId })
      .single()

    if (checkError || !canReschedule || !(canReschedule as any).can_reschedule) {
      console.error('[RESCHEDULE] Cannot reschedule:', (canReschedule as any)?.reason || checkError)
      return NextResponse.json(
        { error: (canReschedule as any)?.reason || 'Cannot reschedule this booking' },
        { status: 400 }
      )
    }

    // Get the existing booking details
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      console.error('[RESCHEDULE] Error fetching booking:', fetchError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Calculate new end time based on service duration
    const startDateTime = new Date(`${new_date}T${new_start_time}`)
    const endDateTime = new Date(startDateTime.getTime() + booking.duration * 60000)
    const new_end_time = endDateTime.toTimeString().slice(0, 5)

    // Check if new time slot is bookable (2-hour advance notice)
    const newSlotDateTime = createGuamDateTime(new_date, new_start_time)
    if (!isTimeSlotBookable(newSlotDateTime)) {
      return NextResponse.json(
        { error: 'Selected time slot requires at least 2 hours advance notice' },
        { status: 400 }
      )
    }

    // Check availability for the new time slot
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('appointment_date', new_date)
      .eq('staff_id', booking.staff_id)
      .neq('status', 'cancelled')
      .neq('id', bookingId) // Exclude current booking
      .or(`and(start_time.lte.${new_start_time},end_time.gt.${new_start_time}),and(start_time.lt.${new_end_time},end_time.gte.${new_end_time})`)

    if (conflictError) {
      console.error('[RESCHEDULE] Conflict check error:', conflictError)
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      )
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Selected time slot is not available' },
        { status: 400 }
      )
    }

    // Check room availability
    const { data: roomConflicts, error: roomError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('appointment_date', new_date)
      .eq('room_id', booking.room_id)
      .neq('status', 'cancelled')
      .neq('id', bookingId)
      .or(`and(start_time.lte.${new_start_time},end_time.gt.${new_start_time}),and(start_time.lt.${new_end_time},end_time.gte.${new_end_time})`)

    if (roomError) {
      console.error('[RESCHEDULE] Room conflict check error:', roomError)
      return NextResponse.json(
        { error: 'Failed to check room availability' },
        { status: 500 }
      )
    }

    if (roomConflicts && roomConflicts.length > 0) {
      return NextResponse.json(
        { error: 'Selected room is not available at this time' },
        { status: 400 }
      )
    }

    // Handle couples booking - need to reschedule both
    let bookingsToReschedule = [booking]
    let linkedBooking = null

    if (booking.booking_group_id && booking.booking_type === 'couple') {
      
      const { data: linkedBookings, error: linkedError } = await supabaseAdmin
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(*)
        `)
        .eq('booking_group_id', booking.booking_group_id)
        .neq('id', bookingId)
        .neq('status', 'cancelled')
      
      if (!linkedError && linkedBookings && linkedBookings.length > 0) {
        linkedBooking = linkedBookings[0]
        bookingsToReschedule.push(linkedBooking)

        // Check availability for linked booking
        const { data: linkedConflicts } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('appointment_date', new_date)
          .eq('staff_id', linkedBooking.staff_id)
          .neq('status', 'cancelled')
          .neq('id', linkedBooking.id)
          .or(`and(start_time.lte.${new_start_time},end_time.gt.${new_start_time}),and(start_time.lt.${new_end_time},end_time.gte.${new_end_time})`)

        if (linkedConflicts && linkedConflicts.length > 0) {
          return NextResponse.json(
            { error: 'Cannot reschedule couples booking - partner\'s staff is not available' },
            { status: 400 }
          )
        }
      }
    }

    // Begin transaction-like operations
    const rescheduleResults = []

    for (const bookingToUpdate of bookingsToReschedule) {
      // Store old booking details in history
      const { error: historyError } = await supabaseAdmin
        .from('reschedule_history')
        .insert({
          original_booking_id: bookingToUpdate.id,
          old_appointment_date: bookingToUpdate.appointment_date,
          old_start_time: bookingToUpdate.start_time,
          old_end_time: bookingToUpdate.end_time,
          new_appointment_date: new_date,
          new_start_time: new_start_time,
          new_end_time: new_end_time,
          old_staff_id: bookingToUpdate.staff_id,
          new_staff_id: bookingToUpdate.staff_id, // Same staff for now
          old_room_id: bookingToUpdate.room_id,
          new_room_id: bookingToUpdate.room_id, // Same room for now
          reason: reason || 'Rescheduled by admin',
          rescheduled_by: 'admin',
          notification_sent: notify_customer
        })

      if (historyError) {
        console.error('[RESCHEDULE] History insert error:', historyError)
        // Continue anyway, history is not critical
      }

      // Update the booking with new date/time
      const updateData: any = {
        appointment_date: new_date,
        start_time: new_start_time,
        end_time: new_end_time,
        updated_at: new Date().toISOString(),
        reschedule_reason: reason
      }

      // Set rescheduled_from if this is the first reschedule
      if (!bookingToUpdate.rescheduled_from) {
        updateData.rescheduled_from = bookingToUpdate.id
      }

      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update(updateData)
        .eq('id', bookingToUpdate.id)
        .select()
        .single()

      if (updateError) {
        console.error('[RESCHEDULE] Update error:', updateError)
        return NextResponse.json(
          { error: `Failed to reschedule booking: ${updateError.message}` },
          { status: 500 }
        )
      }

      rescheduleResults.push(updatedBooking)
    }

    // Send notification to customer if requested
    if (notify_customer && booking.customer?.email) {
      // TODO: Implement email notification
      // You can integrate with your email service here
    }

    const message = linkedBooking 
      ? `Successfully rescheduled couples booking to ${new_date} at ${new_start_time}`
      : `Successfully rescheduled booking to ${new_date} at ${new_start_time}`

    return NextResponse.json({
      success: true,
      message,
      booking: rescheduleResults[0],
      linkedBooking: rescheduleResults[1] || null,
      rescheduleCount: rescheduleResults[0].rescheduled_count || 1
    })

  } catch (error: any) {
    console.error('[RESCHEDULE] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if a booking can be rescheduled
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    
    // Check authentication
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Check if booking can be rescheduled
    const { data: result, error } = await supabaseAdmin
      .rpc('can_reschedule_booking', { p_booking_id: bookingId })
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check reschedule eligibility' },
        { status: 500 }
      )
    }

    // Get reschedule history
    const { data: history } = await supabaseAdmin
      .rpc('get_booking_reschedule_history', { p_booking_id: bookingId })

    return NextResponse.json({
      can_reschedule: (result as any)?.can_reschedule || false,
      reason: (result as any)?.reason || 'Unknown',
      history: history || []
    })

  } catch (error: any) {
    console.error('[RESCHEDULE GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}