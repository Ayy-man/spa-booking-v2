import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Types
interface PaymentWebhookPayload {
  event_id: string
  event_type: 'payment.completed' | 'payment.failed' | 'payment.refunded' | 'payment.cancelled'
  transaction_id: string
  amount: string
  currency: string
  payment_method?: string
  customer_email?: string
  metadata?: {
    booking_id?: string
    [key: string]: any
  }
  timestamp: number
  [key: string]: any
}

interface WebhookHeaders {
  'x-webhook-signature'?: string
  'x-webhook-timestamp'?: string
  'x-webhook-event-id'?: string
  [key: string]: string | undefined
}

// Verify webhook signature to ensure authenticity
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) {
    console.error('Missing signature or timestamp in webhook headers')
    return false
  }
  
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('PAYMENT_WEBHOOK_SECRET not configured')
    return false
  }
  
  // Prevent replay attacks (timestamp must be within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const webhookTime = parseInt(timestamp)
  if (Math.abs(currentTime - webhookTime) > 300) {
    console.error('Webhook timestamp too old or in future', {
      current: currentTime,
      webhook: webhookTime,
      diff: Math.abs(currentTime - webhookTime)
    })
    return false
  }
  
  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Signature comparison failed:', error)
    return false
  }
}

// Log webhook event for debugging and audit
async function logWebhookEvent(
  payload: PaymentWebhookPayload,
  headers: WebhookHeaders,
  verified: boolean,
  error?: string
) {
  try {
    const { error: logError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: payload.event_id || `${payload.transaction_id}_${Date.now()}`,
        event_type: payload.event_type,
        provider: 'fastpaydirect',
        payload,
        headers,
        signature: headers['x-webhook-signature'],
        signature_verified: verified,
        processing_status: error ? 'failed' : 'pending',
        error_message: error
      })
    
    if (logError) {
      console.error('Failed to log webhook event:', logError)
    }
  } catch (err) {
    console.error('Error logging webhook event:', err)
  }
}

// Handle successful payment
async function handlePaymentCompleted(payload: PaymentWebhookPayload) {
  const { transaction_id, amount, currency, metadata, customer_email } = payload
  const bookingId = metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking_id in payment webhook metadata', { transaction_id })
    throw new Error('Missing booking_id in webhook metadata')
  }
  
  console.log('Processing payment completion for booking:', bookingId)
  
  // Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      *,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      services (
        id,
        name,
        category,
        ghl_category
      ),
      staff (
        id,
        name
      ),
      rooms (
        id,
        name
      )
    `)
    .eq('id', bookingId)
    .single()
  
  if (bookingError || !booking) {
    console.error('Booking not found:', bookingId, bookingError)
    throw new Error(`Booking not found: ${bookingId}`)
  }
  
  // Verify payment amount matches booking
  const bookingAmount = parseFloat(booking.final_price)
  const paymentAmount = parseFloat(amount)
  
  if (Math.abs(bookingAmount - paymentAmount) > 0.01) {
    console.warn('Payment amount mismatch', {
      booking_id: bookingId,
      expected: bookingAmount,
      received: paymentAmount,
      difference: Math.abs(bookingAmount - paymentAmount)
    })
    // Log but continue processing - admin can review
  }
  
  // Check if transaction already exists
  const { data: existingTransaction } = await supabase
    .from('payment_transactions')
    .select('id')
    .eq('transaction_id', transaction_id)
    .single()
  
  if (existingTransaction) {
    console.log('Transaction already processed:', transaction_id)
    return // Idempotent - don't process twice
  }
  
  // Create payment transaction record
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id,
      payment_provider: 'fastpaydirect',
      amount: paymentAmount,
      currency: currency || 'USD',
      status: 'completed',
      payment_method: payload.payment_method || 'card',
      customer_email: customer_email || booking.customers?.email,
      metadata,
      webhook_payload: payload,
      webhook_received_at: new Date().toISOString()
    })
  
  if (transactionError) {
    console.error('Failed to create payment transaction:', transactionError)
    throw transactionError
  }
  
  // Update booking payment status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('payment_status', 'pending') // Only update if still pending
  
  if (updateError) {
    console.error('Failed to update booking payment status:', updateError)
    throw updateError
  }
  
  // Send verified payment confirmation to GoHighLevel
  if (booking.customers && booking.services && booking.staff) {
    try {
      await ghlWebhookSender.sendBookingConfirmationWebhook(
        bookingId,
        {
          name: `${booking.customers.first_name} ${booking.customers.last_name}`,
          email: booking.customers.email,
          phone: booking.customers.phone,
          isNewCustomer: false
        },
        {
          service: booking.services.name,
          serviceId: booking.services.id,
          serviceCategory: booking.services.category,
          ghlCategory: booking.services.ghl_category,
          date: booking.appointment_date,
          time: booking.start_time,
          duration: booking.duration,
          price: bookingAmount,
          staff: booking.staff.name,
          staffId: booking.staff.id,
          room: `Room ${booking.rooms?.name || booking.room_id}`,
          roomId: booking.room_id.toString()
        },
        {
          verified: true,
          transaction_id,
          payment_method: payload.payment_method || 'card',
          payment_provider: 'fastpaydirect'
        }
      )
    } catch (ghlError) {
      console.error('Failed to send GHL webhook:', ghlError)
      // Don't throw - payment is processed, GHL is secondary
    }
  }
  
  console.log('Payment successfully processed for booking:', bookingId)
}

// Handle failed payment
async function handlePaymentFailed(payload: PaymentWebhookPayload) {
  const { transaction_id, metadata } = payload
  const bookingId = metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking_id in failed payment webhook')
    return
  }
  
  console.log('Processing payment failure for booking:', bookingId)
  
  // Create failed transaction record
  await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id,
      payment_provider: 'fastpaydirect',
      amount: parseFloat(payload.amount),
      currency: payload.currency || 'USD',
      status: 'failed',
      metadata,
      webhook_payload: payload,
      webhook_received_at: new Date().toISOString()
    })
  
  // Update booking status if needed
  await supabase
    .from('bookings')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('payment_status', 'pending')
  
  console.log('Payment failure recorded for booking:', bookingId)
}

// Handle refunded payment
async function handlePaymentRefunded(payload: PaymentWebhookPayload) {
  const { transaction_id, metadata } = payload
  const bookingId = metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking_id in refund webhook')
    return
  }
  
  console.log('Processing payment refund for booking:', bookingId)
  
  // Create refund transaction record
  await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id: `${transaction_id}_refund`,
      payment_provider: 'fastpaydirect',
      amount: parseFloat(payload.amount),
      currency: payload.currency || 'USD',
      status: 'refunded',
      metadata,
      webhook_payload: payload,
      webhook_received_at: new Date().toISOString()
    })
  
  // Update booking payment status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
  
  console.log('Payment refund recorded for booking:', bookingId)
}

// Main webhook handler
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let payload: PaymentWebhookPayload | null = null
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Get headers
    const headers: WebhookHeaders = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
    
    const signature = headers['x-webhook-signature'] || null
    const timestamp = headers['x-webhook-timestamp'] || null
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, timestamp)
    
    // Parse payload
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError)
      await logWebhookEvent(
        { event_type: 'parse_error', transaction_id: 'unknown' } as any,
        headers,
        false,
        'Invalid JSON payload'
      )
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }
    
    // Log the webhook event
    await logWebhookEvent(payload, headers, isValid)
    
    // Reject if signature invalid (after logging)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Process based on event type
    console.log(`Processing webhook event: ${payload.event_type}`)
    
    switch (payload.event_type) {
      case 'payment.completed':
        await handlePaymentCompleted(payload)
        break
      
      case 'payment.failed':
        await handlePaymentFailed(payload)
        break
      
      case 'payment.refunded':
        await handlePaymentRefunded(payload)
        break
      
      case 'payment.cancelled':
        // Log but don't process cancelled payments
        console.log('Payment cancelled:', payload.transaction_id)
        break
      
      default:
        console.log('Unhandled webhook event type:', payload.event_type)
    }
    
    // Mark webhook as processed
    if (payload.event_id) {
      await supabase
        .from('webhook_events')
        .update({
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('event_id', payload.event_id)
    }
    
    const processingTime = Date.now() - startTime
    console.log(`Webhook processed successfully in ${processingTime}ms`)
    
    return NextResponse.json(
      { 
        received: true,
        processing_time: processingTime 
      },
      { status: 200 }
    )
    
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    
    // Update webhook event with error
    if (payload?.event_id) {
      await supabase
        .from('webhook_events')
        .update({
          processing_status: 'failed',
          error_message: error.message,
          error_details: { stack: error.stack }
        })
        .eq('event_id', payload.event_id)
    }
    
    // Return 200 to prevent retries for non-recoverable errors
    // Return 500 only for temporary/recoverable errors
    const isRecoverable = error.message?.includes('network') || 
                         error.message?.includes('timeout')
    
    return NextResponse.json(
      { 
        error: 'Processing failed',
        message: error.message 
      },
      { status: isRecoverable ? 500 : 200 }
    )
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/payment',
    configured: !!process.env.PAYMENT_WEBHOOK_SECRET,
    timestamp: new Date().toISOString()
  })
}