#!/usr/bin/env node

/**
 * Test Walk-in Webhook for GoHighLevel
 * Tests the walk-in webhook endpoint with sample data
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

const webhookUrl = 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/7768c4e4-e124-46ee-a439-52bb2d9da84e'

/**
 * Format date and time into a human-readable string
 */
function formatNormalizedDateTime(date, time) {
  try {
    // Validate inputs
    if (!date || !time) {
      console.warn('formatNormalizedDateTime: Missing date or time', { date, time })
      return `${date || 'Unknown Date'} at ${time || 'Unknown Time'}`
    }

    // Handle different date formats
    let year, month, day
    
    if (date.includes('T') || date.includes('Z')) {
      // Format: ISO string like "2025-08-05T00:00:00.000Z"
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) {
        console.warn('formatNormalizedDateTime: Invalid ISO date format', { date })
        return `${date} at ${time}`
      }
      year = parsedDate.getFullYear()
      month = parsedDate.getMonth() + 1
      day = parsedDate.getDate()
    } else if (date.includes('-')) {
      // Format: "2025-08-05"
      [year, month, day] = date.split('-').map(Number)
    } else if (date.includes('/')) {
      // Format: "08/05/2025"
      [month, day, year] = date.split('/').map(Number)
    } else {
      // Try to parse as any other date format
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) {
        console.warn('formatNormalizedDateTime: Invalid date format', { date })
        return `${date} at ${time}`
      }
      year = parsedDate.getFullYear()
      month = parsedDate.getMonth() + 1
      day = parsedDate.getDate()
    }

    // Handle different time formats
    let hour, minute
    
    if (time.includes(':')) {
      // Format: "10:30" or "14:30"
      [hour, minute] = time.split(':').map(Number)
    } else if (time.includes(' ')) {
      // Format: "10:30 AM" or "2:30 PM"
      const timeParts = time.split(' ')
      const [timeStr, period] = timeParts
      const [h, m] = timeStr.split(':').map(Number)
      hour = period?.toUpperCase() === 'PM' && h !== 12 ? h + 12 : h
      minute = m
    } else {
      console.warn('formatNormalizedDateTime: Invalid time format', { time })
      return `${date} at ${time}`
    }

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      console.warn('formatNormalizedDateTime: Invalid parsed values', { year, month, day, hour, minute })
      return `${date} at ${time}`
    }

    // Create a Date object (month is 0-indexed in JavaScript Date)
    const appointmentDate = new Date(year, month - 1, day, hour, minute)
    
    // Validate the created date
    if (isNaN(appointmentDate.getTime())) {
      console.warn('formatNormalizedDateTime: Invalid date object created', { year, month, day, hour, minute })
      return `${date} at ${time}`
    }
    
    // Format the date
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    // Format the time
    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    
    const formattedDate = appointmentDate.toLocaleDateString('en-US', dateOptions)
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', timeOptions)
    
    return `${formattedDate} at ${formattedTime}`
  } catch (error) {
    console.error('formatNormalizedDateTime: Error formatting date/time', { date, time, error })
    // Fallback to simple format if parsing fails
    return `${date || 'Unknown Date'} at ${time || 'Unknown Time'}`
  }
}

/**
 * Send webhook to specified URL
 */
async function sendWalkInWebhook(payload, webhookName) {
  try {
    console.log(`\n🚀 Sending ${webhookName} webhook...`)
    console.log(`📡 URL: ${webhookUrl}`)
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2))
    
    const response = await fetch(webhookUrl, {
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
 * Test 1: Immediate Walk-in Webhook
 */
async function testImmediateWalkInWebhook() {
  const currentDate = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5)
  const normalizedTime = formatNormalizedDateTime(currentDate, currentTime)
  
  const payload = {
    event: 'walk_in_booking',
    booking_id: `demo_walkin_immediate_${Date.now()}`,
    customer: {
      name: 'Maria Garcia',
      email: 'maria.garcia@example.com',
      phone: '+1-671-555-0123',
      ghl_contact_id: '',
      is_new_customer: true,
      source: 'admin_walk_in'
    },
    appointment: {
      service: 'Deep Cleansing Facial (for Men & Women)',
      service_id: 'facial-001',
      service_category: 'facial',
      ghl_category: 'facial',
      service_description: 'Deep Cleansing Facial (for Men & Women) treatment',
      staff: 'Selma',
      staff_id: 'staff_selma_001',
      room: 'Room 1',
      room_id: 'room_1',
      date: currentDate,
      time: currentTime,
      normalized_time: normalizedTime,
      duration: 60,
      price: 79,
      currency: PAYMENT_CONFIG.currency,
      status: 'confirmed',
      booking_type: 'immediate_walk_in',
      confirmation_code: `WALKIN${Date.now()}`
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    payment: {
      method: 'walk_in_payment',
      amount: 79,
      currency: PAYMENT_CONFIG.currency,
      status: 'pending',
      transaction_id: `walkin_${Date.now()}`
    },
    system_data: {
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      booking_source: 'admin_panel',
      session_id: `admin_session_${Date.now()}`,
      walk_in_type: 'immediate'
    }
  }

  await sendWalkInWebhook(payload, 'Immediate Walk-in')
}

/**
 * Test 2: Scheduled Walk-in Webhook
 */
async function testScheduledWalkInWebhook() {
  const scheduledDate = '2025-01-28'
  const scheduledTime = '15:30'
  const normalizedTime = formatNormalizedDateTime(scheduledDate, scheduledTime)
  
  const payload = {
    event: 'walk_in_booking',
    booking_id: `demo_walkin_scheduled_${Date.now()}`,
    customer: {
      name: 'James Wilson',
      email: 'james.wilson@example.com',
      phone: '+1-671-555-0456',
      ghl_contact_id: '',
      is_new_customer: true,
      source: 'admin_walk_in'
    },
    appointment: {
      service: 'Swedish Massage',
      service_id: 'massage-001',
      service_category: 'massage',
      ghl_category: 'massage',
      service_description: 'Swedish Massage treatment',
      staff: 'Robyn',
      staff_id: 'staff_robyn_001',
      room: 'Room 3',
      room_id: 'room_3',
      date: scheduledDate,
      time: scheduledTime,
      normalized_time: normalizedTime,
      duration: 90,
      price: 120,
      currency: PAYMENT_CONFIG.currency,
      status: 'confirmed',
      booking_type: 'scheduled_walk_in',
      confirmation_code: `WALKIN${Date.now()}`
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    payment: {
      method: 'walk_in_payment',
      amount: 120,
      currency: PAYMENT_CONFIG.currency,
      status: 'pending',
      transaction_id: `walkin_${Date.now()}`
    },
    system_data: {
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      booking_source: 'admin_panel',
      session_id: `admin_session_${Date.now()}`,
      walk_in_type: 'scheduled'
    }
  }

  await sendWalkInWebhook(payload, 'Scheduled Walk-in')
}

/**
 * Test 3: Walk-in with Special Requests
 */
async function testWalkInWithSpecialRequests() {
  const currentDate = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5)
  const normalizedTime = formatNormalizedDateTime(currentDate, currentTime)
  
  const payload = {
    event: 'walk_in_booking',
    booking_id: `demo_walkin_special_${Date.now()}`,
    customer: {
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      phone: '+1-671-555-0789',
      ghl_contact_id: '',
      is_new_customer: true,
      source: 'admin_walk_in'
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
      date: currentDate,
      time: currentTime,
      normalized_time: normalizedTime,
      duration: 75,
      price: 95,
      currency: PAYMENT_CONFIG.currency,
      status: 'confirmed',
      booking_type: 'immediate_walk_in',
      confirmation_code: `WALKIN${Date.now()}`,
      special_requests: 'Allergic to lavender, prefer unscented products'
    },
    location: {
      name: BUSINESS_CONFIG.name,
      address: BUSINESS_CONFIG.address,
      phone: BUSINESS_CONFIG.phone
    },
    payment: {
      method: 'walk_in_payment',
      amount: 95,
      currency: PAYMENT_CONFIG.currency,
      status: 'pending',
      transaction_id: `walkin_${Date.now()}`
    },
    system_data: {
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      booking_source: 'admin_panel',
      session_id: `admin_session_${Date.now()}`,
      walk_in_type: 'immediate'
    }
  }

  await sendWalkInWebhook(payload, 'Walk-in with Special Requests')
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log('🎯 Starting Walk-in Webhook Tests...')
  console.log('=' .repeat(60))
  
  const tests = [
    { name: 'Immediate Walk-in', fn: testImmediateWalkInWebhook },
    { name: 'Scheduled Walk-in', fn: testScheduledWalkInWebhook },
    { name: 'Walk-in with Special Requests', fn: testWalkInWithSpecialRequests }
  ]

  for (const test of tests) {
    console.log(`\n${'='.repeat(20)} ${test.name} Test ${'='.repeat(20)}`)
    await test.fn()
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n🎉 All walk-in webhook tests completed!')
  console.log('📋 Check your GoHighLevel dashboard to see the incoming walk-in webhook data.')
  console.log('🔍 Look for the new "walk_in_booking" event type in your automations.')
}

// Run the tests
runAllTests().catch(console.error) 