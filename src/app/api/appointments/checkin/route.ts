import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface CheckInRequest {
  searchTerm: string
  confirmationCode?: string
  appointmentId?: string // For when a specific appointment is selected
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequest = await request.json()

    if (!body.searchTerm && !body.appointmentId) {
      return NextResponse.json(
        { error: 'Search term or appointment ID is required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // If appointmentId is provided, check in that specific appointment
    if (body.appointmentId) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(*)
        `)
        .eq('id', body.appointmentId)
        .eq('appointment_date', today)
        .single()

      if (appointmentError || !appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      // Update appointment status to show customer has arrived
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed', // or 'checked_in' if you prefer
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', body.appointmentId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to check in appointment' },
          { status: 500 }
        )
      }

      // Send "show" webhook to GHL
      try {
        await ghlWebhookSender.sendShowNoShowWebhook(
          appointment.id,
          {
            name: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
            email: appointment.customer.email || '',
            phone: appointment.customer.phone,
            isNewCustomer: false
          },
          {
            service: appointment.service.name,
            serviceId: appointment.service.id,
            serviceCategory: appointment.service.category,
            ghlCategory: appointment.service.ghl_category,
            date: appointment.appointment_date,
            time: appointment.start_time,
            duration: appointment.service.duration,
            price: appointment.service.price,
            staff: appointment.staff.name,
            staffId: appointment.staff.id,
            room: `Room ${appointment.room.name}`,
            roomId: appointment.room.id.toString()
          },
          'show', // Customer showed up
          'Customer checked in via self-service'
        )
      } catch (webhookError) {
        console.error('Check-in webhook failed:', webhookError)
        // Don't fail the check-in if webhook fails
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully checked in',
        appointment: {
          id: updatedAppointment.id,
          service_name: appointment.service.name,
          start_time: updatedAppointment.start_time,
          end_time: updatedAppointment.end_time,
          staff_name: appointment.staff.name,
          room_name: appointment.room.name,
          status: updatedAppointment.status,
          checked_in_at: updatedAppointment.checked_in_at
        }
      })
    }

    // Search for appointments - first get all today's bookings with customer data
    const { data: appointments, error: searchError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })

    if (searchError) {
      console.error('Appointment fetch error:', searchError)
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      )
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No appointments scheduled for today',
        appointments: []
      })
    }

    // Filter appointments based on search term
    const searchTerm = body.searchTerm.toLowerCase().trim()
    let filteredAppointments = appointments

    if (searchTerm) {
      filteredAppointments = appointments.filter(apt => {
        const customer = apt.customer
        if (!customer) return false

        // Search by name
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase()
        if (fullName.includes(searchTerm)) return true

        // Search by email
        if (customer.email && customer.email.toLowerCase().includes(searchTerm)) return true

        // Search by phone
        if (customer.phone) {
          const cleanSearchPhone = searchTerm.replace(/[\D]/g, '')
          const cleanCustomerPhone = customer.phone.replace(/[\D]/g, '')
          if (cleanCustomerPhone.includes(cleanSearchPhone)) return true
        }

        // Search by confirmation code (booking ID)
        if (body.confirmationCode && apt.id === body.confirmationCode.trim()) return true

        return false
      })
    }

    if (!filteredAppointments || filteredAppointments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No appointments found for today matching your search criteria',
        appointments: []
      })
    }

    // Return found appointments for selection
    const formattedAppointments = filteredAppointments.map(apt => ({
      id: apt.id,
      service_name: apt.service.name,
      start_time: apt.start_time,
      end_time: apt.end_time,
      staff_name: apt.staff.name,
      room_name: apt.room.name,
      customer_name: `${apt.customer.first_name} ${apt.customer.last_name}`,
      status: apt.status,
      checked_in_at: apt.checked_in_at
    }))

    return NextResponse.json({
      success: true,
      message: `Found ${filteredAppointments.length} appointment${filteredAppointments.length > 1 ? 's' : ''} for today`,
      appointments: formattedAppointments
    })

  } catch (error: any) {
    console.error('Appointment check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}