import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Create a test booking for today
    const today = new Date().toISOString().split('T')[0]
    const startTime = '14:00:00'
    const endTime = '15:00:00' // 1 hour duration

    const testBooking = {
      customer_id: '00000000-0000-0000-0000-000000000001',
      service_id: 'placenta_collagen_facial',
      staff_id: 'selma_villaver',
      room_id: 1,
      appointment_date: today,
      start_time: startTime,
      end_time: endTime,
      duration: 60,
      total_price: 90,
      discount: 0,
      final_price: 90,
      status: 'confirmed',
      payment_status: 'paid',
      booking_source: 'test',
      notes: 'Test booking for show/no-show functionality',
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