import { NextRequest, NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

export async function GET(request: NextRequest) {
  try {
    const tests = []
    
    // Test 1: New Customer Webhook
    const newCustomerResult = await ghlWebhookSender.sendNewCustomerWebhook(
      {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1-555-0123',
        isNewCustomer: true
      },
      {
        service: 'Deep Cleansing Facial',
        serviceCategory: 'facial',
        date: '2024-01-20',
        time: '14:00',
        duration: 60,
        price: 85
      }
    )
    
    tests.push({
      name: 'New Customer Webhook',
      status: newCustomerResult.success ? 'PASS' : 'FAIL',
      error: newCustomerResult.error || null
    })

    // Test 2: Booking Confirmation Webhook
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
        roomId: 1
      }
    )
    
    tests.push({
      name: 'Booking Confirmation Webhook',
      status: bookingConfirmationResult.success ? 'PASS' : 'FAIL',
      error: bookingConfirmationResult.error || null
    })

    // Test 3: Booking Update Webhook
    const bookingUpdateResult = await ghlWebhookSender.sendBookingUpdateWebhook(
      'test_booking_123',
      {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1-555-0123'
      },
      {
        service: 'Deep Cleansing Facial',
        serviceId: 'facial_001',
        serviceCategory: 'facial',
        date: '2024-01-22',
        time: '16:00',
        duration: 60,
        price: 85,
        staff: 'Selma',
        staffId: 'staff_selma_001',
        room: 'Room 1',
        roomId: 1
      },
      {
        oldStatus: 'confirmed',
        newStatus: 'rescheduled',
        oldDate: '2024-01-20',
        newDate: '2024-01-22',
        oldTime: '14:00',
        newTime: '16:00',
        reason: 'Customer requested reschedule',
        requestedBy: 'customer'
      }
    )
    
    tests.push({
      name: 'Booking Update Webhook',
      status: bookingUpdateResult.success ? 'PASS' : 'FAIL',
      error: bookingUpdateResult.error || null
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
} 