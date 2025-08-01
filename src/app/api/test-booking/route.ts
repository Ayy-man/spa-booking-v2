import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST() {
  try {
    // Test booking data
    const testBooking = {
      service_id: 'basic_facial',
      staff_id: 'robyn_camacho',
      room_id: 'room_1',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '555-1234',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      special_requests: 'This is a test booking'
    }


    const result = await supabaseClient.createBooking(testBooking)
    

    return NextResponse.json({
      success: true,
      booking: result,
      message: 'Test booking created successfully'
    })
  } catch (error: any) {
    console.error('Test booking failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.details || 'No additional details',
      stack: error.stack
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create a test booking',
    testData: {
      service_id: 'basic_facial',
      staff_id: 'robyn_camacho',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '14:00'
    }
  })
}