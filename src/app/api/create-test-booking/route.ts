import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Create a test booking for today
    const today = new Date().toISOString().split('T')[0]
    const startTime = '14:00:00'
    const endTime = '15:00:00' // 1 hour duration

    const testBooking = {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+1-671-555-0123',
      service_id: 'placenta_collagen_facial',
      staff_id: 'selma_villaver',
      room_id: '11111111-1111-1111-1111-111111111111',
      appointment_date: today,
      start_time: startTime,
      end_time: endTime,
      duration: 60,
      price: 90,
      status: 'confirmed',
      payment_status: 'paid',
      booking_source: 'test',
      special_requests: 'Test booking for show/no-show functionality',
      internal_notes: 'Test booking created via API'
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
      .single()

    if (error) {
      console.error('Error creating test booking:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test booking created successfully',
      booking: data
    })

  } catch (error) {
    console.error('Error creating test booking:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Create Test Booking Endpoint',
    usage: {
      method: 'POST',
      description: 'Creates a test booking for today at 2:00 PM'
    }
  })
} 