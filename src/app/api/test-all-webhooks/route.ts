import { NextResponse } from 'next/server'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Test endpoint to verify all webhooks are working
export async function GET() {
  const results = {
    newCustomer: { tested: false, success: false, error: null as string | null },
    bookingConfirmation: { tested: false, success: false, error: null as string | null },
    bookingUpdate: { tested: false, success: false, error: null as string | null },
    showNoShow: { tested: false, success: false, error: null as string | null }
  }

  try {
    console.log('🧪 Testing all webhooks...')
    
    // Test 1: New Customer Webhook
    console.log('📧 Testing new customer webhook...')
    try {
      const newCustomerResult = await ghlWebhookSender.sendNewCustomerWebhook(
        {
          name: 'Test Customer ' + new Date().toISOString(),
          email: 'test@example.com',
          phone: '+1-671-555-0123',
          isNewCustomer: true
        },
        {
          service: 'Deep Cleansing Facial',
          serviceCategory: 'facial',
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          duration: 60,
          price: 150
        }
      )
      results.newCustomer = {
        tested: true,
        success: newCustomerResult.success,
        error: newCustomerResult.error || null
      }
    } catch (err: any) {
      results.newCustomer = {
        tested: true,
        success: false,
        error: err.message
      }
    }

    // Test 2: Booking Confirmation Webhook
    console.log('✅ Testing booking confirmation webhook...')
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
          staff: 'Sarah Thompson',
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

    // Test 3: Booking Update Webhook
    console.log('🔄 Testing booking update webhook...')
    try {
      const bookingId = `test_booking_${Date.now()}`
      const updateResult = await ghlWebhookSender.sendBookingUpdateWebhook(
        bookingId,
        {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1-671-555-0123'
        },
        {
          service: 'Body Scrub',
          serviceCategory: 'body_treatment',
          date: new Date().toISOString().split('T')[0],
          time: '16:00',
          duration: 45,
          price: 120,
          staff: 'Tanisha Johnson',
          room: 'Room 3'
        },
        {
          oldStatus: 'confirmed',
          newStatus: 'rescheduled',
          oldTime: '14:00',
          newTime: '16:00',
          reason: 'Customer requested time change',
          requestedBy: 'customer'
        }
      )
      results.bookingUpdate = {
        tested: true,
        success: updateResult.success,
        error: updateResult.error || null
      }
    } catch (err: any) {
      results.bookingUpdate = {
        tested: true,
        success: false,
        error: err.message
      }
    }

    // Test 4: Show/No-Show Webhook
    console.log('📋 Testing show/no-show webhook...')
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
          staff: 'Lisa Chen',
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
      totalTests: 4,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => r.tested && !r.success).length,
      allPassed: Object.values(results).every(r => r.success)
    }

    console.log('✅ All webhook tests completed')
    console.log('📊 Summary:', summary)

    return NextResponse.json({
      success: true,
      message: 'All webhook tests completed',
      summary,
      results,
      webhookUrls: {
        newCustomer: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407',
        bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
        bookingUpdate: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc',
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
}