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

    // Get service details by name
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('name', walkIn.service_name)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found for walk-in' },
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

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id: service.id,
        staff_id: body.staffId,
        room_id: body.roomId,
        appointment_date: body.appointmentDate,
        start_time: body.startTime,
        end_time: endTimeStr,
        duration: service.duration,
        total_price: service.price,
        discount: 0,
        final_price: service.price,
        status: 'confirmed', // Walk-ins that are assigned are immediately confirmed
        payment_status: 'pending',
        notes: body.notes || walkIn.notes,
        booking_type: 'single',
        created_by: 'walk_in_assignment'
      })
      .select()
      .single()

    if (bookingError || !booking) {
      throw new Error('Failed to create booking record')
    }

    // Update walk-in record with assignment details
    const { data: updatedWalkIn, error: updateError } = await supabase
      .from('walk_ins')
      .update({
        booking_id: booking.id,
        customer_id: customerId,
        scheduled_date: body.appointmentDate,
        scheduled_time: body.startTime,
        status: 'assigned',
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