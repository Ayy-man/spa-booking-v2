import { NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Test endpoint to verify all webhooks are working
export async function GET() {
  // DISABLED: Prevent test webhooks during build
  return NextResponse.json({
    success: false,
    error: 'Test webhooks are disabled to prevent automatic execution during build',
    message: 'This endpoint has been disabled'
  }, { status: 403 })
  
  /* DISABLED TO PREVENT BUILD-TIME EXECUTION
  const results = {
    bookingConfirmation: { tested: false, success: false, error: null as string | null },
    showNoShow: { tested: false, success: false, error: null as string | null }
  }

  try {
    
    // Test 1: Booking Confirmation Webhook
    try {
      const bookingId = `test_booking_${Date.now()}`
      const confirmationResult = await ghlWebhookSender.sendBookingConfirmationWebhook(
        bookingId,
        {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1-671-555-0123',
          isNewCustomer: false
        },
        {
          service: 'Relaxation Massage',
          serviceCategory: 'massage',
          date: new Date().toISOString().split('T')[0],
          time: '15:00',
          duration: 90,
          price: 200,
          staff: 'Demo Staff 1',
          room: 'Room 2'
        }
      )
      results.bookingConfirmation = {
        tested: true,
        success: confirmationResult.success,
        error: confirmationResult.error || null
      }
    } catch (err: any) {
      results.bookingConfirmation = {
        tested: true,
        success: false,
        error: err.message
      }
    }

    // Test 2: Show/No-Show Webhook
    try {
      const bookingId = `test_booking_${Date.now()}`
      const showResult = await ghlWebhookSender.sendShowNoShowWebhook(
        bookingId,
        {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1-671-555-0123'
        },
        {
          service: 'Anti-Aging Facial',
          serviceCategory: 'facial',
          date: new Date().toISOString().split('T')[0],
          time: '11:00',
          duration: 90,
          price: 250,
          staff: 'Demo Staff 2',
          room: 'Room 1'
        },
        'show',
        'Customer arrived on time'
      )
      results.showNoShow = {
        tested: true,
        success: showResult.success,
        error: showResult.error || null
      }
    } catch (err: any) {
      results.showNoShow = {
        tested: true,
        success: false,
        error: err.message
      }
    }

    // Calculate summary
    const summary = {
      totalTests: 2,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => r.tested && !r.success).length,
      allPassed: Object.values(results).every(r => r.success)
    }


    return NextResponse.json({
      success: true,
      message: 'All webhook tests completed',
      summary,
      results,
      webhookUrls: {
        bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
        showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4'
      }
    })
  } catch (error: any) {
    console.error('❌ Error during webhook tests:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error during webhook tests',
      results
    }, { status: 500 })
  }
  */
}