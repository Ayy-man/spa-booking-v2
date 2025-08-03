#!/usr/bin/env node

/**
 * Demo Webhook Sender for GoHighLevel
 * Tests all webhook endpoints with sample data
 */

const BUSINESS_CONFIG = {
  name: "Dermal Skin Clinic and Spa Guam",
  address: "123 Marine Corps Dr, Tamuning, GU 96913",
  phone: "(671) 647-7546",
  location: "Guam"
}

const PAYMENT_CONFIG = {
  currency: "USD"
}

const webhookUrls = {
  newCustomer: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407',
  bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
  bookingUpdate: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc',
  showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4'
}

/**
 * Format date and time into a human-readable string
 */
function formatNormalizedDateTime(date, time) {
  try {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    
    const appointmentDate = new Date(year, month - 1, day, hour, minute)
    
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    
    const formattedDate = appointmentDate.toLocaleDateString('en-US', dateOptions)
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', timeOptions)
    
    return `${formattedDate} at ${formattedTime}`
  } catch (error) {
    return `${date} at ${time}`
  }
}

/**
 * Send webhook to specified URL
 */
async function sendWebhook(url, payload, webhookName) {
  try {
    console.log(`\n🚀 Sending ${webhookName} webhook...`)
    console.log(`📡 URL: ${url}`)
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log(`✅ ${webhookName} webhook sent successfully!`)
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
    } else {
      const errorText = await response.text()
      console.log(`❌ ${webhookName} webhook failed!`)
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      console.log(`🔍 Error: ${errorText}`)
    }
  } catch (error) {
    console.log(`💥 ${webhookName} webhook error:`, error.message)
  }
}

/**
 * Test 1: New Customer Webhook
 */
async function testNewCustomerWebhook() {
  const normalizedTime = formatNormalizedDateTime('2025-01-27', '14:30')
  
  const payload = {
    event: 'new_customer',
    customer: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-671-555-0123',
      is_new_customer: true,
      source: 'spa_booking_website',
      created_at: new Date().toISOString()
    },
    booking: {
      service: 'Deep Cleansing Facial (for Men & Women)',
      service_id: 'facial-001',
      service_category: 'facial',
      service_description: 'Deep Cleansing Facial (for Men & Women) treatment',
      date: '2025-01-27',
      time: '14:30',
      normalized_time: normalizedTime,
      duration: 60,
      price: 79,
      currency: PAYMENT_CONFIG.currency,
      location: `${BUSINESS_CONFIG.name}, ${BUSINESS_CONFIG.location}`,
      booking_notes: 'First-time customer'
    },
    preferences: {
      communication_preference: 'email',
      marketing_consent: true,
      special_requests: ''
    },
    system_data: {
      booking_id: `demo_booking_${Date.now()}`,
      session_id: `demo_session_${Date.now()}`,
      user_agent: 'Demo-Test-Script/1.0',
      ip_address: 'demo',
      referrer: 'demo'
    }
  }

  await sendWebhook(webhookUrls.newCustomer, payload, 'New Customer')
}

/**
 * Test 2: Booking Confirmation Webhook
 */
async function testBookingConfirmationWebhook() {
  const normalizedTime = formatNormalizedDateTime('2025-01-28', '10:00')
  
  const payload = {
    event: 'booking_confirmed',
    booking_id: `demo_confirmed_${Date.now()}`,
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1-671-555-0456',
      ghl_contact_id: 'demo_contact_123',
      is_new_customer: false,
      total_bookings: 3
    },
    appointment: {
      service: 'Swedish Massage',
      service_id: 'massage-001',
      service_category: 'massage',
      ghl_category: 'massage',
      service_description: 'Swedish Massage treatment',
      staff: 'Selma',
      staff_id: 'staff_selma_001',
      room: 'Room 1',
      room_id: 'room_1',
      date: '2025-01-28',
      time: '10:00',
      normalized_time: normalizedTime,
      duration: 90,
      price: 120,
      currency: PAYMENT_CONFIG.currency,
      status: 'confirmed',
      confirmation_code: `CONF${Date.now()}`
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    payment: {
      method: 'online_payment',
      amount: 120,
      currency: PAYMENT_CONFIG.currency,
      status: 'paid',
      transaction_id: `demo_txn_${Date.now()}`
    },
    system_data: {
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      booking_source: 'website',
      session_id: `demo_session_${Date.now()}`
    }
  }

  await sendWebhook(webhookUrls.bookingConfirmation, payload, 'Booking Confirmation')
}

/**
 * Test 3: Booking Update Webhook
 */
async function testBookingUpdateWebhook() {
  const oldNormalizedTime = formatNormalizedDateTime('2025-01-29', '15:00')
  const newNormalizedTime = formatNormalizedDateTime('2025-01-30', '16:00')
  
  const payload = {
    event: 'booking_updated',
    booking_id: `demo_updated_${Date.now()}`,
    customer: {
      name: 'Mike Davis',
      email: 'mike.davis@example.com',
      phone: '+1-671-555-0789',
      ghl_contact_id: 'demo_contact_456'
    },
    changes: {
      old_status: 'confirmed',
      new_status: 'rescheduled',
      old_date: '2025-01-29',
      new_date: '2025-01-30',
      old_time: '15:00',
      new_time: '16:00',
      reason: 'Customer requested reschedule',
      requested_by: 'customer'
    },
    appointment: {
      service: 'Hot Stone Massage',
      service_id: 'massage-002',
      service_category: 'massage',
      ghl_category: 'massage',
      staff: 'Robyn',
      staff_id: 'staff_robyn_001',
      room: 'Room 3',
      room_id: 'room_3',
      date: '2025-01-30',
      time: '16:00',
      normalized_time: newNormalizedTime,
      duration: 120,
      price: 150,
      currency: PAYMENT_CONFIG.currency,
      status: 'rescheduled'
    },
    system_data: {
      updated_at: new Date().toISOString(),
      updated_by: 'customer',
      change_source: 'website',
      session_id: `demo_session_${Date.now()}`
    }
  }

  await sendWebhook(webhookUrls.bookingUpdate, payload, 'Booking Update')
}

/**
 * Test 4: Show/No-Show Webhook
 */
async function testShowNoShowWebhook() {
  const normalizedTime = formatNormalizedDateTime('2025-01-27', '11:00')
  
  const payload = {
    event: 'appointment_attendance',
    booking_id: `demo_attendance_${Date.now()}`,
    customer: {
      name: 'Lisa Chen',
      email: 'lisa.chen@example.com',
      phone: '+1-671-555-0321',
      ghl_contact_id: 'demo_contact_789',
      is_new_customer: false,
      total_bookings: 5
    },
    appointment: {
      service: 'Anti-Aging Facial',
      service_id: 'facial-002',
      service_category: 'facial',
      ghl_category: 'facial',
      service_description: 'Anti-Aging Facial treatment',
      staff: 'Tanisha',
      staff_id: 'staff_tanisha_001',
      room: 'Room 2',
      room_id: 'room_2',
      date: '2025-01-27',
      time: '11:00',
      normalized_time: normalizedTime,
      duration: 75,
      price: 95,
      currency: PAYMENT_CONFIG.currency,
      status: 'completed'
    },
    attendance: {
      status: 'show',
      marked_at: new Date().toISOString(),
      marked_by: 'admin_panel',
      admin_notes: 'Customer arrived on time, service completed successfully',
      follow_up_required: false,
      follow_up_priority: 'normal'
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    business_impact: {
      revenue_impact: 95,
      time_slot_utilization: 'utilized',
      staff_availability: 'occupied',
      customer_satisfaction: 'positive'
    },
    system_data: {
      created_at: new Date().toISOString(),
      attendance_marked_at: new Date().toISOString(),
      booking_source: 'website',
      session_id: `demo_session_${Date.now()}`,
      admin_session: `demo_admin_${Date.now()}`
    }
  }

  await sendWebhook(webhookUrls.showNoShow, payload, 'Show/No-Show')
}

/**
 * Test 5: No-Show Webhook
 */
async function testNoShowWebhook() {
  const normalizedTime = formatNormalizedDateTime('2025-01-26', '13:00')
  
  const payload = {
    event: 'appointment_attendance',
    booking_id: `demo_noshow_${Date.now()}`,
    customer: {
      name: 'Alex Rodriguez',
      email: 'alex.rodriguez@example.com',
      phone: '+1-671-555-0654',
      ghl_contact_id: 'demo_contact_101',
      is_new_customer: true,
      total_bookings: 1
    },
    appointment: {
      service: 'Body Scrub',
      service_id: 'body-001',
      service_category: 'body_treatment',
      ghl_category: 'body_treatment',
      service_description: 'Body Scrub treatment',
      staff: 'Robyn',
      staff_id: 'staff_robyn_001',
      room: 'Room 3',
      room_id: 'room_3',
      date: '2025-01-26',
      time: '13:00',
      normalized_time: normalizedTime,
      duration: 90,
      price: 110,
      currency: PAYMENT_CONFIG.currency,
      status: 'no_show'
    },
    attendance: {
      status: 'no_show',
      marked_at: new Date().toISOString(),
      marked_by: 'admin_panel',
      admin_notes: 'Customer did not show up, no call received',
      follow_up_required: true,
      follow_up_priority: 'high'
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    business_impact: {
      revenue_impact: 0,
      time_slot_utilization: 'wasted',
      staff_availability: 'available',
      customer_satisfaction: 'negative'
    },
    system_data: {
      created_at: new Date().toISOString(),
      attendance_marked_at: new Date().toISOString(),
      booking_source: 'website',
      session_id: `demo_session_${Date.now()}`,
      admin_session: `demo_admin_${Date.now()}`
    }
  }

  await sendWebhook(webhookUrls.showNoShow, payload, 'No-Show')
}

/**
 * Test 6: Couples Booking Webhook
 */
async function testCouplesBookingWebhook() {
  const normalizedTime = formatNormalizedDateTime('2025-01-31', '16:30')
  
  const payload = {
    event: 'booking_confirmed',
    booking_id: `demo_couples_${Date.now()}`,
    customer: {
      name: 'Emma & David Wilson',
      email: 'emma.david@example.com',
      phone: '+1-671-555-0987',
      ghl_contact_id: 'demo_contact_couples',
      is_new_customer: true,
      total_bookings: 1
    },
    appointment: {
      service: 'Couples Massage Package',
      service_id: 'couples-001',
      service_category: 'package',
      ghl_category: 'package',
      service_description: 'Couples Massage Package treatment',
      staff: 'Any Available',
      staff_id: 'any',
      room: 'Room 3',
      room_id: 'room_3',
      date: '2025-01-31',
      time: '16:30',
      normalized_time: normalizedTime,
      duration: 120,
      price: 200,
      currency: PAYMENT_CONFIG.currency,
      status: 'confirmed',
      confirmation_code: `COUPLES${Date.now()}`
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    payment: {
      method: 'online_payment',
      amount: 200,
      currency: PAYMENT_CONFIG.currency,
      status: 'paid',
      transaction_id: `demo_couples_txn_${Date.now()}`
    },
    system_data: {
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      booking_source: 'website',
      session_id: `demo_couples_session_${Date.now()}`
    }
  }

  await sendWebhook(webhookUrls.bookingConfirmation, payload, 'Couples Booking')
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log('🎯 Starting GoHighLevel Webhook Demo Tests...')
  console.log('=' .repeat(60))
  
  const tests = [
    { name: 'New Customer', fn: testNewCustomerWebhook },
    { name: 'Booking Confirmation', fn: testBookingConfirmationWebhook },
    { name: 'Booking Update', fn: testBookingUpdateWebhook },
    { name: 'Show Attendance', fn: testShowNoShowWebhook },
    { name: 'No-Show', fn: testNoShowWebhook },
    { name: 'Couples Booking', fn: testCouplesBookingWebhook }
  ]

  for (const test of tests) {
    console.log(`\n${'='.repeat(20)} ${test.name} Test ${'='.repeat(20)}`)
    await test.fn()
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n🎉 All webhook tests completed!')
  console.log('📋 Check your GoHighLevel dashboard to see the incoming webhook data.')
  console.log('🔍 Look for the new "normalized_time" field in the webhook payloads.')
}

// Run the tests
runAllTests().catch(console.error) 