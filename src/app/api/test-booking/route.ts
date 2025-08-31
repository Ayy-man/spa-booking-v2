import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST() {
  // DISABLED: Test bookings should not be created automatically
  return NextResponse.json({
    success: false,
    error: 'Test booking creation is disabled to prevent automatic bookings during build',
    message: 'This endpoint has been disabled to prevent creating test bookings'
  }, { status: 403 })
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create a test booking',
    testData: {
      service_id: 'basic_facial',
      staff_id: 'robyn_camacho',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '14:00'
    }
  })
}