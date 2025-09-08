import { NextResponse } from 'next/server'

// Test endpoint to verify 24-hour reminder webhook payload
export async function POST(request: Request) {
  try {
    // Create a sample booking payload that would be sent 24 hours before appointment
    const testPayload = {
      event_type: "appointment_reminder_24hr",
      booking: {
        id: "test-booking-123",
        appointment_date: "2025-01-15",
        start_time: "14:00",
        end_time: "15:00",
        duration: 60,
        status: "confirmed",
        payment_status: "pending",
        total_price: 150,
        final_price: 150,
        notes: "Please arrive 10 minutes early",
        booking_type: "single"
      },
      customer: {
        id: "test-customer-456",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "(671) 555-1234",
        full_name: "John Doe"
      },
      service: {
        id: "test-service-789",
        name: "Swedish Massage",
        category: "massage",
        duration: 60,
        price: 150,
        description: "Relaxing full body massage"
      },
      staff: {
        id: "test-staff-001",
        name: "Robyn Marcelo",
        email: "robyn@dermalguam.com",
        role: "therapist"
      },
      room: {
        id: 2,
        name: "Room 2",
        capacity: 2
      },
      appointment_details: {
        date_formatted: "Wednesday, January 15, 2025",
        time_formatted: "2:00 PM - 3:00 PM",
        time_until_appointment: "24 hours",
        reminder_sent_at: new Date().toISOString()
      },
      business: {
        name: "Dermal Skin Clinic and Spa Guam",
        phone: "(671) 647-7546",
        address: "123 Marine Corps Dr, Tamuning, GU 96913",
        booking_url: "https://booking.dermalguam.com"
      }
    }

    // Send test request to the webhook
    const webhookUrl = 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/41ef86e6-ff01-4182-80c0-0552994fe56c'
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await webhookResponse.text()
    
    return NextResponse.json({
      success: true,
      message: 'Test 24hr reminder webhook sent',
      webhook_response: {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: responseText
      },
      payload_sent: testPayload
    })

  } catch (error) {
    console.error('Error sending test 24hr reminder webhook:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test webhook',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test 24hr Reminder Webhook Endpoint',
    description: 'POST to this endpoint to send a test 24-hour appointment reminder webhook to GoHighLevel',
    test_command: 'curl -X POST http://localhost:3000/api/test-24hr-reminder-webhook',
    webhook_url: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/41ef86e6-ff01-4182-80c0-0552994fe56c',
    payload_structure: {
      event_type: "appointment_reminder_24hr",
      booking: "Full booking details",
      customer: "Customer information", 
      service: "Service details",
      staff: "Staff member details",
      room: "Room assignment",
      appointment_details: "Formatted appointment information",
      business: "Business contact information"
    }
  })
}