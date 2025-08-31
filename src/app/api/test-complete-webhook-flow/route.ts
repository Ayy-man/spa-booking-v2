import { NextRequest, NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

export async function GET(request: NextRequest) {
  // DISABLED: Test webhooks should not be sent during build
  return NextResponse.json({
    success: false,
    error: 'Test webhook flow is disabled to prevent automatic test data creation during build',
    message: 'This endpoint has been disabled'
  }, { status: 403 })
  
  /* DISABLED TO PREVENT BUILD-TIME EXECUTION
  try {
    const results = []
    
    // Test 1: Couples booking confirmation flow
    const couplesBookingTest = await ghlWebhookSender.sendBookingConfirmationWebhook(
      'couples_booking_001',
      {
        name: 'Mike & Lisa Thompson',
        email: 'mike.thompson@test.com',
        phone: '+1-671-555-0456',
        isNewCustomer: false
      },
      {
        service: 'Couples Massage',
        serviceId: 'massage_couples_001',
        serviceCategory: 'massage',
        date: '2024-02-20',
        time: '16:00',
        duration: 90,
        price: 220,
        staff: 'Selma & Maria',
        staffId: 'staff_selma_001,staff_maria_001',
        room: 'Couples Room (Room 2)',
        roomId: '22222222-2222-2222-2222-222222222222'
      }
    )
    
    results.push({
      test: 'Couples Booking Confirmation',
      webhook: 'bookingConfirmation',
      status: couplesBookingTest.success ? 'PASS' : 'FAIL',
      error: couplesBookingTest.error || null
    })

    // Test 3: Single service booking
    const singleBookingTest = await ghlWebhookSender.sendBookingConfirmationWebhook(
      'single_booking_002',
      {
        name: 'Emma Davis',
        email: 'emma.davis@test.com',
        phone: '+1-671-555-0789',
        isNewCustomer: true
      },
      {
        service: 'Body Scrub',
        serviceId: 'body_scrub_001',
        serviceCategory: 'body_treatment',
        date: '2024-02-18',
        time: '10:00',
        duration: 45,
        price: 75,
        staff: 'Maria',
        staffId: 'staff_maria_001',
        room: 'Room 3',
        roomId: '33333333-3333-3333-3333-333333333333'
      }
    )
    
    results.push({
      test: 'Single Service Booking',
      webhook: 'bookingConfirmation',
      status: singleBookingTest.success ? 'PASS' : 'FAIL',
      error: singleBookingTest.error || null
    })

    // Test 4: High-value package booking
    const packageBookingTest = await ghlWebhookSender.sendBookingConfirmationWebhook(
      'package_booking_001',
      {
        name: 'Jennifer Park',
        email: 'jennifer.park@test.com',
        phone: '+1-671-555-0321',
        isNewCustomer: true
      },
      {
        service: 'Ultimate Spa Package',
        serviceId: 'package_ultimate_001',
        serviceCategory: 'package',
        date: '2024-02-25',
        time: '09:00',
        duration: 180,
        price: 350,
        staff: 'Selma',
        staffId: 'staff_selma_001',
        room: 'Room 1',
        roomId: '11111111-1111-1111-1111-111111111111'
      }
    )
    
    results.push({
      test: 'High-Value Package Booking',
      webhook: 'bookingConfirmation',
      status: packageBookingTest.success ? 'PASS' : 'FAIL',
      error: packageBookingTest.error || null
    })

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      success_rate: `${Math.round((results.filter(r => r.status === 'PASS').length / results.length) * 100)}%`,
      business_data: {
        name: 'Dermal Skin Clinic & Spa',
        location: 'Guam',
        webhooks_configured: 3,
        integration_status: 'ACTIVE'
      }
    }

    return NextResponse.json({
      summary,
      results,
      message: 'Complete GHL Webhook Flow Test Results',
      test_scenarios: [
        'New customer onboarding',
        'Couples booking confirmation',
        'Single service booking',
        'Booking cancellation',
        'Booking reschedule',
        'High-value package booking'
      ]
    })

  } catch (error) {
    console.error('Error in complete webhook flow test:', error)
    return NextResponse.json({
      error: 'Failed to complete webhook flow test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
  */
}