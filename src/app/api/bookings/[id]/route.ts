import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Fetch booking details from database with service and customer info
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration,
          category
        ),
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        staff (
          id,
          name
        ),
        rooms (
          id,
          name
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      console.error('Booking not found:', bookingId, error)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Format the response - the booking already includes joined details
    const formattedBooking = {
      booking_id: booking.id,
      service_id: booking.service_id,
      service_name: booking.services?.name,
      service_price: booking.services?.price,
      service_duration: booking.services?.duration,
      staff_id: booking.staff_id,
      staff_name: booking.staff?.name,
      room_id: booking.room_id,
      room_name: booking.rooms?.name,
      customer_id: booking.customer_id,
      customer_name: booking.customers 
        ? (booking.customers.last_name 
          ? `${booking.customers.first_name} ${booking.customers.last_name}` 
          : booking.customers.first_name) 
        : null,
      customer_email: booking.customers?.email,
      customer_phone: booking.customers?.phone,
      appointment_date: booking.appointment_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      notes: booking.notes,
      payment_option: booking.payment_option,
      payment_status: booking.payment_status,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    }

    return NextResponse.json(formattedBooking)
  } catch (error) {
    console.error('Error in GET /api/bookings/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}