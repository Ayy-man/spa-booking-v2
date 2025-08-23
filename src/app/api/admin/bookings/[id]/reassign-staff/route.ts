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

    // Manual validation checks instead of using RPC function
    
    // Check if booking is in valid status
    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot reassign staff for ${booking.status} booking` },
        { status: 400 }
      )
    }

    // Check if within 2 hours of appointment
    const appointmentDateTime = new Date(`${booking.appointment_date}T${booking.start_time}`)
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    if (appointmentDateTime <= twoHoursFromNow) {
      return NextResponse.json(
        { error: 'Cannot reassign staff within 2 hours of appointment' },
        { status: 400 }
      )
    }

    // If new staff is not 'any', verify they exist and can perform the service
    if (new_staff_id !== 'any') {
      const { data: newStaff, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('*')
        .eq('id', new_staff_id)
        .eq('is_active', true)
        .single()

      if (staffError || !newStaff) {
        return NextResponse.json(
          { error: 'Staff member not found or inactive' },
          { status: 400 }
        )
      }

      // Check if staff can perform the service
      // Map service categories to staff capabilities (handle singular vs plural)
      const categoryToCapabilityMap: Record<string, string> = {
        'facial': 'facials',
        'massage': 'massages',
        'body_treatment': 'treatments',
        'body_scrub': 'treatments',
        'waxing': 'waxing',
        'package': 'package',
        'membership': 'membership'
      }
      
      const serviceCategory = booking.service?.category
      if (serviceCategory) {
        const requiredCapability = categoryToCapabilityMap[serviceCategory] || serviceCategory
        
        // Check if staff has the capability
        let canPerform = false
        
        // Check direct match
        if (newStaff.capabilities?.includes(requiredCapability)) {
          canPerform = true
        }
        // Also check singular form (backward compatibility)
        else if (newStaff.capabilities?.includes(serviceCategory)) {
          canPerform = true
        }
        // For packages, check if staff can do facials and/or massages
        else if (serviceCategory === 'package') {
          const serviceName = booking.service?.name?.toLowerCase() || ''
          if (serviceName.includes('facial') && newStaff.capabilities?.includes('facials')) {
            canPerform = true
          } else if (serviceName.includes('massage') && newStaff.capabilities?.includes('massages')) {
            canPerform = true
          }
        }
        
        if (!canPerform) {
          console.log('[REASSIGN-STAFF] Staff capability check failed:', {
            serviceCategory,
            requiredCapability,
            staffCapabilities: newStaff.capabilities,
            serviceName: booking.service?.name
          })
          return NextResponse.json(
            { error: 'Staff cannot perform this service' },
            { status: 400 }
          )
        }
      }

      // Check service exclusions
      if (newStaff.service_exclusions?.length > 0) {
        const serviceName = booking.service?.name?.toLowerCase() || ''
        for (const exclusion of newStaff.service_exclusions) {
          if (serviceName.includes(exclusion.replace('_', ' ')) || 
              serviceName.includes(exclusion.replace('_', ''))) {
            return NextResponse.json(
              { error: 'Staff has exclusion for this service' },
              { status: 400 }
            )
          }
        }
      }

      // Check if staff works on this day
      const dayOfWeek = new Date(booking.appointment_date).getDay()
      if (!newStaff.work_days?.includes(dayOfWeek)) {
        return NextResponse.json(
          { error: 'Staff does not work on this day' },
          { status: 400 }
        )
      }

      // Check for scheduling conflicts
      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('staff_id', new_staff_id)
        .eq('appointment_date', booking.appointment_date)
        .neq('status', 'cancelled')
        .neq('id', bookingId)
        .or(`and(start_time.lte.${booking.start_time},end_time.gt.${booking.start_time}),and(start_time.lt.${booking.end_time},end_time.gte.${booking.end_time})`)

      if (conflictError) {
        console.error('[REASSIGN-STAFF] Error checking conflicts:', conflictError)
        return NextResponse.json(
          { error: 'Failed to check staff availability' },
          { status: 500 }
        )
      }

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: 'Staff has conflicting appointment at this time' },
          { status: 400 }
        )
      }
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

    // Update the booking with new staff and tracking fields
    const currentStaffChangeCount = (booking as any).staff_change_count || 0
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        staff_id: new_staff_id,
        updated_at: new Date().toISOString(),
        last_staff_change_at: new Date().toISOString(),
        staff_change_count: currentStaffChangeCount + 1
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

    // Try to insert into staff assignment history (if table exists)
    try {
      await supabaseAdmin
        .from('staff_assignment_history')
        .insert({
          booking_id: bookingId,
          old_staff_id: booking.staff_id,
          new_staff_id: new_staff_id,
          changed_by: 'admin',
          reason: reason || 'Staff reassigned by admin',
          service_id: booking.service_id,
          appointment_date: booking.appointment_date,
          appointment_time: booking.start_time
        })
    } catch (historyError) {
      console.log('[REASSIGN-STAFF] Could not insert history (table may not exist):', historyError)
    }

    // Get the updated staff assignment history if it exists
    let history = null
    try {
      const { data: historyData } = await supabaseAdmin
        .from('staff_assignment_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .single()
      history = historyData
    } catch (err) {
      console.log('[REASSIGN-STAFF] Could not fetch history (table may not exist)')
    }

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

    // Get the current booking to include context
    const { data: booking, error: bookingError } = await supabaseAdmin
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

    if (bookingError || !booking) {
      console.error('[REASSIGN-STAFF GET] Error fetching booking:', bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Get all active staff
    const { data: allStaff, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)

    if (staffError) {
      console.error('[REASSIGN-STAFF GET] Error fetching staff:', staffError)
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      )
    }

    // Get conflicting bookings for the same date and time
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('staff_id')
      .eq('appointment_date', booking.appointment_date)
      .neq('id', bookingId)
      .neq('status', 'cancelled')
      .or(`and(start_time.lte.${booking.start_time},end_time.gt.${booking.start_time}),and(start_time.lt.${booking.end_time},end_time.gte.${booking.end_time})`)

    if (conflictError) {
      console.error('[REASSIGN-STAFF GET] Error checking conflicts:', conflictError)
    }

    const busyStaffIds = conflicts?.map(c => c.staff_id) || []

    // Map service categories to staff capabilities (handle singular vs plural)
    const categoryToCapabilityMap: Record<string, string> = {
      'facial': 'facials',
      'massage': 'massages',
      'body_treatment': 'treatments',
      'body_scrub': 'treatments',
      'waxing': 'waxing',
      'package': 'package',
      'membership': 'membership'
    }

    // Build available staff list with availability status
    const staffList: AvailableStaffResponse[] = allStaff?.map(staff => {
      // Check if staff can perform the service
      let canPerform = false
      if (staff.id === 'any') {
        canPerform = true
      } else if (booking.service?.category) {
        const serviceCategory = booking.service.category
        const requiredCapability = categoryToCapabilityMap[serviceCategory] || serviceCategory
        
        // Check direct match
        if (staff.capabilities?.includes(requiredCapability)) {
          canPerform = true
        }
        // Also check singular form (backward compatibility)
        else if (staff.capabilities?.includes(serviceCategory)) {
          canPerform = true
        }
        // For packages, check if staff can do facials and/or massages
        else if (serviceCategory === 'package') {
          const serviceName = booking.service?.name?.toLowerCase() || ''
          if (serviceName.includes('facial') && staff.capabilities?.includes('facials')) {
            canPerform = true
          } else if (serviceName.includes('massage') && staff.capabilities?.includes('massages')) {
            canPerform = true
          }
        }
        
        // Check for service exclusions
        if (canPerform && staff.service_exclusions?.length > 0) {
          const serviceName = booking.service?.name?.toLowerCase() || ''
          for (const exclusion of staff.service_exclusions) {
            if (serviceName.includes(exclusion.replace('_', ' ')) || 
                serviceName.includes(exclusion.replace('_', ''))) {
              canPerform = false
              break
            }
          }
        }
      }

      // Check if staff works on this day
      const dayOfWeek = new Date(booking.appointment_date).getDay()
      const worksOnDay = staff.id === 'any' || (staff.work_days?.includes(dayOfWeek) ?? false)

      // Check if staff has conflicts
      const hasConflict = busyStaffIds.includes(staff.id)

      const isAvailable = canPerform && worksOnDay && !hasConflict

      let conflictReason = null
      if (!canPerform) conflictReason = 'Cannot perform this service'
      else if (!worksOnDay) conflictReason = 'Does not work on this day'
      else if (hasConflict) conflictReason = 'Has conflicting appointment'

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        can_perform: canPerform,
        is_available: isAvailable,
        conflict_reason: conflictReason
      }
    }) || []

    // Sort to put current staff first, then available staff, then unavailable
    staffList.sort((a, b) => {
      if (a.staff_id === booking.staff_id) return -1
      if (b.staff_id === booking.staff_id) return 1
      if (a.staff_id === 'any') return 1
      if (b.staff_id === 'any') return -1
      if (a.is_available && !b.is_available) return -1
      if (!a.is_available && b.is_available) return 1
      return 0
    })

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