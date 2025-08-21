import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

interface ReassignStaffRequest {
  new_staff_id: string
  reason?: string
}

interface AvailableStaffResponse {
  staff_id: string
  staff_name: string
  can_perform: boolean
  is_available: boolean
  conflict_reason: string | null
}

// POST endpoint to reassign staff for a booking
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

    // Parse request body
    const body: ReassignStaffRequest = await request.json()
    const { new_staff_id, reason } = body

    if (!new_staff_id) {
      return NextResponse.json(
        { error: 'New staff ID is required' },
        { status: 400 }
      )
    }

    console.log('[REASSIGN-STAFF] Starting reassignment for booking:', bookingId)
    console.log('[REASSIGN-STAFF] New staff ID:', new_staff_id)

    // Get the current booking details
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
      console.error('[REASSIGN-STAFF] Error fetching booking:', fetchError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if the staff is actually changing
    if (booking.staff_id === new_staff_id) {
      return NextResponse.json(
        { error: 'New staff is the same as current staff' },
        { status: 400 }
      )
    }

    // Check if staff can be reassigned using the database function
    const { data: canReassign, error: checkError } = await supabaseAdmin
      .rpc('can_reassign_staff', { 
        p_booking_id: bookingId,
        p_new_staff_id: new_staff_id
      })
      .single()

    if (checkError) {
      console.error('[REASSIGN-STAFF] Error checking reassignment eligibility:', checkError)
      return NextResponse.json(
        { error: 'Failed to check staff reassignment eligibility' },
        { status: 500 }
      )
    }

    if (!canReassign || !(canReassign as any).can_reassign) {
      console.error('[REASSIGN-STAFF] Cannot reassign:', (canReassign as any)?.reason)
      return NextResponse.json(
        { error: (canReassign as any)?.reason || 'Cannot reassign staff for this booking' },
        { status: 400 }
      )
    }

    // Handle couples booking - check if we need to consider the partner booking
    let partnerBooking = null
    if (booking.booking_group_id && booking.booking_type === 'couple') {
      console.log('[REASSIGN-STAFF] This is a couples booking, checking partner booking...')
      
      const { data: partnerBookings, error: partnerError } = await supabaseAdmin
        .from('bookings')
        .select('id, staff_id')
        .eq('booking_group_id', booking.booking_group_id)
        .neq('id', bookingId)
        .neq('status', 'cancelled')
        .single()
      
      if (!partnerError && partnerBookings) {
        partnerBooking = partnerBookings
        console.log('[REASSIGN-STAFF] Found partner booking:', partnerBooking.id)
        
        // Check if the new staff would conflict with the partner's booking
        if (partnerBooking.staff_id === new_staff_id && new_staff_id !== 'any') {
          return NextResponse.json(
            { error: 'Cannot assign same staff to both bookings in a couples session' },
            { status: 400 }
          )
        }
      }
    }

    // Set context for the trigger to capture
    await supabaseAdmin.rpc('set_config', {
      setting: 'app.current_user',
      value: 'admin'
    })
    
    if (reason) {
      await supabaseAdmin.rpc('set_config', {
        setting: 'app.reassignment_reason',
        value: reason
      })
    }

    // Update the booking with new staff
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        staff_id: new_staff_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .single()

    if (updateError) {
      console.error('[REASSIGN-STAFF] Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to reassign staff: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('[REASSIGN-STAFF] Successfully reassigned staff for booking:', bookingId)

    // Get the updated staff assignment history
    const { data: history } = await supabaseAdmin
      .from('staff_assignment_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single()

    const oldStaffName = booking.staff?.name || 'Unknown'
    const newStaffName = updatedBooking.staff?.name || 'Unknown'
    
    const message = `Successfully reassigned staff from ${oldStaffName} to ${newStaffName}`

    return NextResponse.json({
      success: true,
      message,
      booking: updatedBooking,
      history,
      staff_change_count: updatedBooking.staff_change_count || 1
    })

  } catch (error: any) {
    console.error('[REASSIGN-STAFF] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to get available staff for reassignment
export async function GET(
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

    console.log('[REASSIGN-STAFF GET] Getting available staff for booking:', bookingId)

    // Get available staff using the database function
    const { data: availableStaff, error } = await supabaseAdmin
      .rpc('get_available_staff_for_slot', { 
        p_booking_id: bookingId 
      })

    if (error) {
      console.error('[REASSIGN-STAFF GET] Error getting available staff:', error)
      return NextResponse.json(
        { error: 'Failed to get available staff' },
        { status: 500 }
      )
    }

    // Get the current booking to include context
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select(`
        staff_id,
        service:services(name, category),
        appointment_date,
        start_time,
        end_time
      `)
      .eq('id', bookingId)
      .single()

    const staffList = (availableStaff as AvailableStaffResponse[]) || []

    return NextResponse.json({
      available_staff: staffList,
      current_staff_id: booking?.staff_id,
      service_name: (booking as any)?.service?.name,
      appointment_date: booking?.appointment_date,
      appointment_time: booking?.start_time,
      total_staff: staffList.length,
      available_count: staffList.filter(s => s.is_available).length
    })

  } catch (error: any) {
    console.error('[REASSIGN-STAFF GET] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}