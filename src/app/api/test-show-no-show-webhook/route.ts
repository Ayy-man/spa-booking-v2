import { NextRequest, NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, adminNotes } = body

    // Test data for show/no-show webhook
    const testCustomer = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-671-555-0123',
      isNewCustomer: false
    }

    const testBooking = {
      service: 'Facial Treatment',
      serviceId: 'facial_001',
      serviceCategory: 'Facial Services',
      date: '2024-01-15',
      time: '14:00',
      duration: 60,
      price: 85,
      staff: 'Demo Staff 1',
      staffId: 'staff_001',
      room: 'Treatment Room 1',
      roomId: '11111111-1111-1111-1111-111111111111'
    }

    const bookingId = 'booking_test_001'
    const ghlContactId = 'ghl_contact_123'


    const result = await ghlWebhookSender.sendShowNoShowWebhook(
      bookingId,
      testCustomer,
      testBooking,
      status as 'show' | 'no_show',
      adminNotes,
      ghlContactId
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Show/no-show webhook sent successfully for status: ${status}`,
        data: {
          bookingId,
          customer: testCustomer.name,
          service: testBooking.service,
          status,
          adminNotes
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to send show/no-show webhook'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error testing show/no-show webhook:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Show/No-Show Webhook Test Endpoint',
    usage: {
      method: 'POST',
      body: {
        status: "'show' or 'no_show'",
        adminNotes: 'Optional admin notes'
      }
    },
    example: {
      status: 'show',
      adminNotes: 'Customer arrived on time and was satisfied with service'
    }
  })
} 