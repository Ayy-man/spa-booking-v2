import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface AssignWalkInRequest {
  walkInId: string
  staffId: string
  roomId: number
  appointmentDate: string
  startTime: string
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AssignWalkInRequest = await request.json()

    // Validate required fields
    if (!body.walkInId || !body.staffId || !body.roomId || !body.appointmentDate || !body.startTime) {
      return NextResponse.json(
        { error: 'Walk-in ID, staff, room, date, and time are required' },
        { status: 400 }
      )
    }

    // Get walk-in details
    const { data: walkIn, error: walkInError } = await supabase
      .from('walk_ins')
      .select('*')
      .eq('id', body.walkInId)
      .single()

    if (walkInError || !walkIn) {
      return NextResponse.json(
        { error: 'Walk-in not found' },
        { status: 404 }
      )
    }

    if (walkIn.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Walk-in has already been assigned or completed' },
        { status: 400 }
      )
    }

    // Get service details by name - handle potential mismatches
    // First try exact match
    let { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('name', walkIn.service_name)
      .maybeSingle()

    // If no exact match, try to clean up the service name and search again
    if (!service) {
      // Remove any suffixes like "(treatments)" that might have been added
      const cleanedServiceName = walkIn.service_name.replace(/\s*\([^)]*\)\s*$/, '').trim()
      
      const { data: serviceByCleanName } = await supabase
        .from('services')
        .select('*')
        .eq('name', cleanedServiceName)
        .maybeSingle()
      
      if (serviceByCleanName) {
        service = serviceByCleanName
      } else {
        // Try partial match as last resort
        const { data: serviceByPartial } = await supabase
          .from('services')
          .select('*')
          .ilike('name', `%${cleanedServiceName}%`)
          .limit(1)
          .maybeSingle()
        
        if (serviceByPartial) {
          service = serviceByPartial
        }
      }
    }

    if (!service) {
      console.error('Service not found for walk-in:', {
        originalName: walkIn.service_name,
        walkInId: body.walkInId
      })
      return NextResponse.json(
        { error: `Service "${walkIn.service_name}" not found in database` },
        { status: 400 }
      )
    }

    // Create or find customer record
    let customerId: string

    // First try to find existing customer by email
    if (walkIn.customer_email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', walkIn.customer_email)
        .maybeSingle()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Try by phone if email lookup failed
        const { data: customerByPhone } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', walkIn.customer_phone)
          .maybeSingle()

        if (customerByPhone) {
          customerId = customerByPhone.id
        } else {
          // Create new customer
          const nameParts = walkIn.customer_name.trim().split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''

          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              first_name: firstName,
              last_name: lastName,
              email: walkIn.customer_email || null,
              phone: walkIn.customer_phone,
              marketing_consent: false,
              is_active: true
            })
            .select('id')
            .single()

          if (customerError || !newCustomer) {
            throw new Error('Failed to create customer record')
          }
          customerId = newCustomer.id
        }
      }
    } else {
      // No email, try phone only
      const { data: customerByPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', walkIn.customer_phone)
        .maybeSingle()

      if (customerByPhone) {
        customerId = customerByPhone.id
      } else {
        // Create new customer without email
        const nameParts = walkIn.customer_name.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: walkIn.customer_phone,
            marketing_consent: false,
            is_active: true
          })
          .select('id')
          .single()

        if (customerError || !newCustomer) {
          throw new Error('Failed to create customer record')
        }
        customerId = newCustomer.id
      }
    }

    // Calculate end time
    const startTime = new Date(`2000-01-01T${body.startTime}:00`)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)
    const endTimeStr = endTime.toTimeString().slice(0, 5)

    // Calculate buffer times (15 minutes before start and after end)
    const bufferMinutes = 15
    const bufferStartTime = new Date(startTime.getTime() - bufferMinutes * 60000)
    const bufferEndTime = new Date(endTime.getTime() + bufferMinutes * 60000)
    
    // Ensure buffer times stay within business hours (9 AM - 8 PM)
    const businessStart = new Date(`2000-01-01T09:00:00`)
    const businessEnd = new Date(`2000-01-01T20:00:00`)
    
    const finalBufferStart = bufferStartTime < businessStart ? businessStart : bufferStartTime
    const finalBufferEnd = bufferEndTime > businessEnd ? businessEnd : bufferEndTime
    
    const bufferStartStr = finalBufferStart.toTimeString().slice(0, 5)
    const bufferEndStr = finalBufferEnd.toTimeString().slice(0, 5)

    // Create booking record
    const bookingData = {
      customer_id: customerId,
      service_id: service.id,
      staff_id: body.staffId,
      room_id: body.roomId,
      appointment_date: body.appointmentDate,
      start_time: body.startTime,
      end_time: endTimeStr,
      duration: service.duration,
      buffer_start: bufferStartStr,
      buffer_end: bufferEndStr,
      total_price: service.price,
      discount: 0,
      final_price: service.price,
      status: 'confirmed', // Walk-ins that are assigned are immediately confirmed
      payment_status: 'pending',
      payment_option: 'pay_on_location', // Add payment_option field which is required
      notes: body.notes || walkIn.notes,
      booking_type: 'single',
      created_by: 'walk_in_assignment'
    }

    console.log('Creating booking with data:', bookingData)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError || !booking) {
      console.error('Booking creation failed:', {
        error: bookingError,
        data: bookingData
      })
      throw new Error(`Failed to create booking record: ${bookingError?.message || 'Unknown error'}`)
    }

    // Update walk-in record with assignment details
    const { data: updatedWalkIn, error: updateError } = await supabase
      .from('walk_ins')
      .update({
        booking_id: booking.id,
        customer_id: customerId,
        scheduled_date: body.appointmentDate,
        scheduled_time: body.startTime,
        status: 'served', // Mark as served since they've been scheduled
        updated_at: new Date().toISOString()
      })
      .eq('id', body.walkInId)
      .select()
      .single()

    if (updateError) {
      // Try to cleanup booking if walk-in update failed
      await supabase.from('bookings').delete().eq('id', booking.id)
      throw new Error('Failed to update walk-in record')
    }

    // Send GHL webhook for booking confirmation
    try {
      const { data: staffMember } = await supabase
        .from('staff')
        .select('name')
        .eq('id', body.staffId)
        .single()

      const { data: room } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', body.roomId)
        .single()

      await ghlWebhookSender.sendBookingConfirmationWebhook(
        booking.id,
        {
          name: walkIn.customer_name,
          email: walkIn.customer_email || '',
          phone: walkIn.customer_phone,
          isNewCustomer: true
        },
        {
          service: service.name,
          serviceId: service.id,
          serviceCategory: service.category,
          ghlCategory: service.ghl_category,
          date: body.appointmentDate,
          time: body.startTime,
          duration: service.duration,
          price: service.price,
          staff: staffMember?.name || 'Unknown',
          staffId: body.staffId,
          room: room ? `Room ${room.name}` : 'Unknown',
          roomId: body.roomId.toString()
        }
      )
    } catch (webhookError) {
      console.error('Booking confirmation webhook failed:', webhookError)
      // Don't fail the assignment if webhook fails
    }

    return NextResponse.json({
      success: true,
      message: 'Walk-in successfully assigned',
      walkIn: updatedWalkIn,
      booking: {
        id: booking.id,
        appointment_date: booking.appointment_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        staff_id: booking.staff_id,
        room_id: booking.room_id,
        status: booking.status
      }
    })

  } catch (error: any) {
    console.error('Walk-in assignment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign walk-in' },
      { status: 500 }
    )
  }
}