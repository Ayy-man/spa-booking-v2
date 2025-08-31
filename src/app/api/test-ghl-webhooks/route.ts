import { NextRequest, NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

export async function GET(request: NextRequest) {
  // DISABLED: Prevent test webhooks during build
  return NextResponse.json({
    success: false,
    error: 'Test GHL webhooks are disabled to prevent automatic execution during build',
    message: 'This endpoint has been disabled'
  }, { status: 403 })
  
  /* DISABLED TO PREVENT BUILD-TIME EXECUTION
  try {
    const tests = []
    
    // Test 1: Booking Confirmation Webhook
    const bookingConfirmationResult = await ghlWebhookSender.sendBookingConfirmationWebhook(
      'test_booking_123',
      {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1-555-0123',
        isNewCustomer: true
      },
      {
        service: 'Deep Cleansing Facial',
        serviceId: 'facial_001',
        serviceCategory: 'facial',
        date: '2024-01-20',
        time: '14:00',
        duration: 60,
        price: 85,
        staff: 'Selma',
        staffId: 'staff_selma_001',
        room: 'Room 1',
        roomId: '11111111-1111-1111-1111-111111111111',
        addons: [
          {
            id: 'addon_001',
            name: 'LED Light Therapy',
            price: 25,
            duration: 15,
            quantity: 1
          }
        ],
        addonsTotal: {
          price: 25,
          duration: 15
        }
      }
    )
    
    tests.push({
      name: 'Booking Confirmation Webhook',
      status: bookingConfirmationResult.success ? 'PASS' : 'FAIL',
      error: bookingConfirmationResult.error || null
    })

    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'PASS').length,
      failed: tests.filter(t => t.status === 'FAIL').length,
      success_rate: `${Math.round((tests.filter(t => t.status === 'PASS').length / tests.length) * 100)}%`
    }

    return NextResponse.json({
      summary,
      tests,
      message: 'GHL Webhook Integration Test Complete'
    })

  } catch (error) {
    console.error('Error testing GHL webhooks:', error)
    return NextResponse.json({
      error: 'Failed to test GHL webhooks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
  */
} 