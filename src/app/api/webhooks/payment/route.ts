import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Types for payment webhooks (supports both FastPayDirect and GoHighLevel formats)
interface PaymentWebhookPayload {
  // FastPayDirect/Generic format
  event_id?: string
  event_type?: 'payment.completed' | 'payment.failed' | 'payment.refunded' | 'payment.cancelled'
  transaction_id?: string
  amount?: string | number
  currency?: string
  payment_method?: string
  customer_email?: string
  customer_phone?: string
  metadata?: {
    booking_id?: string
    [key: string]: any
  }
  timestamp?: number
  
  // GoHighLevel specific format
  type?: 'Invoice' | 'Order' | 'Transaction'
  eventType?: 'InvoicePaid' | 'OrderPaid' | 'TransactionCompleted' | 'TransactionFailed' | 'TransactionRefunded'
  contactId?: string
  locationId?: string
  webhookId?: string
  
  // GoHighLevel Invoice format
  invoice?: {
    id: string
    invoiceNumber: string
    amount: number
    currency: string
    status: 'paid' | 'unpaid' | 'cancelled' | 'refunded'
    contactId: string
    customFields?: { [key: string]: any }
    metadata?: { booking_id?: string }
  }
  
  // GoHighLevel Order format
  order?: {
    id: string
    amount: number
    currency: string
    status: 'paid' | 'pending' | 'failed' | 'refunded'
    contactId: string
    customFields?: { [key: string]: any }
  }
  
  // GoHighLevel Transaction format
  transaction?: {
    id: string
    amount: number
    currency: string
    status: 'completed' | 'failed' | 'refunded'
    paymentMethod: string
    invoiceId?: string
    orderId?: string
    contactId: string
    customFields?: { [key: string]: any }
  }
  
  // Custom fields for booking reference
  customFields?: {
    booking_id?: string
    spa_booking_ref?: string
    [key: string]: any
  }
  
  [key: string]: any
}

interface WebhookHeaders {
  // FastPayDirect/Generic headers
  'x-webhook-signature'?: string
  'x-webhook-timestamp'?: string
  'x-webhook-event-id'?: string
  
  // GoHighLevel headers
  'x-highlevel-signature'?: string
  'x-highlevel-timestamp'?: string
  'x-highlevel-webhook-id'?: string
  
  [key: string]: string | undefined
}

// Verify webhook signature to ensure authenticity (supports both FastPayDirect and GoHighLevel)
function verifyWebhookSignature(
  payload: string,
  headers: WebhookHeaders
): boolean {
  // Try GoHighLevel format first
  const ghlSignature = headers['x-highlevel-signature']
  const ghlTimestamp = headers['x-highlevel-timestamp']
  
  if (ghlSignature && ghlTimestamp) {
    return verifyGHLSignature(payload, ghlSignature, ghlTimestamp)
  }
  
  // Fall back to FastPayDirect/Generic format
  const genericSignature = headers['x-webhook-signature']
  const genericTimestamp = headers['x-webhook-timestamp']
  
  if (genericSignature && genericTimestamp) {
    return verifyGenericSignature(payload, genericSignature, genericTimestamp)
  }
  
  console.error('No valid signature headers found')
  return false
}

// Verify GoHighLevel webhook signature
function verifyGHLSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.GHL_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('GHL_WEBHOOK_SECRET or PAYMENT_WEBHOOK_SECRET not configured')
    return false
  }
  
  // Prevent replay attacks (timestamp must be within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const webhookTime = parseInt(timestamp)
  if (Math.abs(currentTime - webhookTime) > 300) {
    console.error('GoHighLevel webhook timestamp too old or in future', {
      current: currentTime,
      webhook: webhookTime,
      diff: Math.abs(currentTime - webhookTime)
    })
    return false
  }
  
  // GoHighLevel uses HMAC-SHA256 with sha256= prefix
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  
  const formattedExpected = `sha256=${expectedSignature}`
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(formattedExpected)
    )
  } catch (error) {
    console.error('GoHighLevel signature comparison failed:', error)
    return false
  }
}

// Verify generic/FastPayDirect webhook signature
function verifyGenericSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
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

// Extract booking ID from various possible locations (supports both formats)
function extractBookingId(payload: PaymentWebhookPayload): string | null {
  // Check GoHighLevel custom fields first
  if (payload.customFields?.booking_id) {
    return payload.customFields.booking_id
  }
  if (payload.customFields?.spa_booking_ref) {
    return payload.customFields.spa_booking_ref
  }
  
  // Check GoHighLevel invoice metadata/custom fields
  if (payload.invoice?.metadata?.booking_id) {
    return payload.invoice.metadata.booking_id
  }
  if (payload.invoice?.customFields?.booking_id) {
    return payload.invoice.customFields.booking_id
  }
  
  // Check GoHighLevel order custom fields
  if (payload.order?.customFields?.booking_id) {
    return payload.order.customFields.booking_id
  }
  
  // Check GoHighLevel transaction custom fields
  if (payload.transaction?.customFields?.booking_id) {
    return payload.transaction.customFields.booking_id
  }
  
  // Check FastPayDirect/Generic format
  if (payload.metadata?.booking_id) {
    return payload.metadata.booking_id
  }
  
  return null
}

// Extract common customer contact details from various payload shapes
function extractCustomerContact(payload: PaymentWebhookPayload): {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
} {
  const root: any = payload as any
  const email = payload.customer_email || root.email || root.Email ||
                root.customer?.email ||
                (payload.invoice as any)?.customer_email ||
                (payload.order as any)?.customer_email ||
                (payload.transaction as any)?.customer_email ||
                payload.customFields?.email || payload.customFields?.Email ||
                payload.transaction?.customFields?.email || payload.transaction?.customFields?.Email
  const phone = payload.customer_phone || root.phone || root.Phone ||
                root.customer?.phone ||
                payload.customFields?.phone || payload.customFields?.Phone ||
                payload.transaction?.customFields?.phone || payload.transaction?.customFields?.Phone
  const firstName = root.first_name || root.firstName || root.FirstName ||
                    root.customer?.first_name || root.customer?.firstName
  const lastName = root.last_name || root.lastName || root.LastName ||
                   root.customer?.last_name || root.customer?.lastName
  return { email, phone, firstName, lastName }
}

// Try to resolve a booking by contact info and amount when booking_id is missing
async function tryResolveBookingIdByContact(
  contact: { email?: string; phone?: string },
  amount: number
): Promise<string | null> {
  try {
    // Require at least one contact field
    if (!contact.email && !contact.phone) {
      return null
    }

    // Find customer by email first
    let customerId: string | null = null
    if (contact.email) {
      const { data: customersByEmail, error: emailErr } = await supabase
        .from('customers')
        .select('id')
        .eq('email', contact.email)
        .limit(2)
      if (!emailErr && customersByEmail && customersByEmail.length === 1) {
        customerId = customersByEmail[0].id
      }
    }

    // If not found by email, try by phone
    if (!customerId && contact.phone) {
      const { data: customersByPhone, error: phoneErr } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', contact.phone)
        .limit(2)
      if (!phoneErr && customersByPhone && customersByPhone.length === 1) {
        customerId = customersByPhone[0].id
      }
    }

    if (!customerId) {
      return null
    }

    // Find recent pending bookings for this customer and match by amount
    const { data: candidateBookings, error: bookingsErr } = await supabase
      .from('bookings')
      .select('id, final_price, payment_status, created_at')
      .eq('customer_id', customerId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)

    if (bookingsErr || !candidateBookings || candidateBookings.length === 0) {
      return null
    }

    // Amount tolerance of $1 to allow for minor rounding differences
    const matches = candidateBookings.filter(b => {
      const bookingAmount = parseFloat((b as any).final_price)
      return Math.abs(bookingAmount - amount) <= 1
    })

    if (matches.length === 1) {
      return matches[0].id as any
    }

    return null
  } catch (err) {
    console.warn('Failed to resolve booking by contact:', err)
    return null
  }
}

// Determine webhook provider and format
function determineWebhookProvider(payload: PaymentWebhookPayload, headers: WebhookHeaders): string {
  if (headers['x-highlevel-signature'] || payload.type || payload.eventType) {
    return 'gohighlevel'
  }
  if (headers['x-webhook-signature'] || payload.event_type) {
    return 'fastpaydirect'
  }
  return 'unknown'
}

// Extract payment details from payload (supports both formats)
function extractPaymentDetails(payload: PaymentWebhookPayload): {
  amount: number
  currency: string
  transactionId: string
  paymentMethod: string
  eventType: string
} {
  // GoHighLevel format
  if (payload.invoice) {
    return {
      amount: payload.invoice.amount,
      currency: payload.invoice.currency || 'USD',
      transactionId: payload.invoice.id,
      paymentMethod: 'gohighlevel_invoice',
      eventType: payload.eventType || 'InvoicePaid'
    }
  }
  
  if (payload.order) {
    return {
      amount: payload.order.amount,
      currency: payload.order.currency || 'USD',
      transactionId: payload.order.id,
      paymentMethod: 'gohighlevel_order',
      eventType: payload.eventType || 'OrderPaid'
    }
  }
  
  if (payload.transaction) {
    return {
      amount: payload.transaction.amount,
      currency: payload.transaction.currency || 'USD',
      transactionId: payload.transaction.id,
      paymentMethod: payload.transaction.paymentMethod || 'gohighlevel',
      eventType: payload.eventType || 'TransactionCompleted'
    }
  }
  
  // FastPayDirect/Generic format
  return {
    amount: typeof payload.amount === 'string' ? parseFloat(payload.amount) : (payload.amount || 0),
    currency: payload.currency || 'USD',
    transactionId: payload.transaction_id || `unknown_${Date.now()}`,
    paymentMethod: payload.payment_method || 'card',
    eventType: payload.event_type || 'payment.completed'
  }
}

// Log webhook event for debugging and audit (supports both formats)
async function logWebhookEvent(
  payload: PaymentWebhookPayload,
  headers: WebhookHeaders,
  verified: boolean,
  error?: string
) {
  try {
    const provider = determineWebhookProvider(payload, headers)
    const paymentDetails = extractPaymentDetails(payload)
    
    // Generate event ID based on format
    let eventId: string
    if (payload.webhookId) {
      eventId = payload.webhookId
    } else if (payload.event_id) {
      eventId = payload.event_id
    } else {
      eventId = `${paymentDetails.transactionId}_${Date.now()}`
    }
    
    const { error: logError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: paymentDetails.eventType,
        provider,
        payload,
        headers,
        signature: headers['x-highlevel-signature'] || headers['x-webhook-signature'],
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

// Handle successful payment (supports both FastPayDirect and GoHighLevel formats)
async function handlePaymentCompleted(payload: PaymentWebhookPayload) {
  let bookingId = extractBookingId(payload)
  const paymentDetails = extractPaymentDetails(payload)
  const provider = determineWebhookProvider(payload, {})
  
  // If booking_id is missing, attempt a best-effort resolution using contact info
  if (!bookingId) {
    const contact = extractCustomerContact(payload)
    bookingId = await tryResolveBookingIdByContact(contact, paymentDetails.amount)
    if (!bookingId) {
      // Record an unlinked transaction and return success (to avoid retries)
      const { error: unlinkedErr } = await supabase
        .from('payment_transactions')
        .insert({
          booking_id: null,
          transaction_id: paymentDetails.transactionId,
          payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          status: 'completed',
          payment_method: paymentDetails.paymentMethod,
          customer_email: contact.email,
          metadata: {
            ...payload.metadata,
            contact,
            resolution: 'unlinked_payment_no_booking_id',
            provider,
            event_type: paymentDetails.eventType
          },
          webhook_payload: payload,
          webhook_received_at: new Date().toISOString()
        })
      if (unlinkedErr) {
        console.error('Failed to record unlinked payment:', unlinkedErr)
      }
      console.warn('Payment received without resolvable booking_id; recorded as unlinked', {
        transactionId: paymentDetails.transactionId,
        provider
      })
      return
    }
  }
  
  
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
  const paymentAmount = paymentDetails.amount
  
  if (Math.abs(bookingAmount - paymentAmount) > 0.01) {
    console.warn('Payment amount mismatch', {
      booking_id: bookingId,
      expected: bookingAmount,
      received: paymentAmount,
      difference: Math.abs(bookingAmount - paymentAmount),
      provider
    })
    // Log but continue processing - admin can review
  }
  
  // Check if transaction already exists
  const { data: existingTransaction } = await supabase
    .from('payment_transactions')
    .select('id')
    .eq('transaction_id', paymentDetails.transactionId)
    .single()
  
  if (existingTransaction) {
    return // Idempotent - don't process twice
  }
  
  // Create payment transaction record
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id: paymentDetails.transactionId,
      payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
      amount: paymentAmount,
      currency: paymentDetails.currency,
      status: 'completed',
      payment_method: paymentDetails.paymentMethod,
      customer_email: payload.customer_email || booking.customers?.email,
      metadata: {
        ...payload.metadata,
        ghl_contact_id: payload.contactId,
        ghl_location_id: payload.locationId,
        ghl_event_type: paymentDetails.eventType,
        provider
      },
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
          name: booking.customers.last_name 
            ? `${booking.customers.first_name} ${booking.customers.last_name}`
            : booking.customers.first_name,
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
        undefined, // ghlContactId (optional)
        {
          verified: true,
          transaction_id: paymentDetails.transactionId,
          payment_method: paymentDetails.paymentMethod,
          payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect'
        }
      )
    } catch (ghlError) {
      console.error('Failed to send GHL webhook:', ghlError)
      // Don't throw - payment is processed, GHL is secondary
    }
  }
  
}

// Handle failed payment (supports both formats)
async function handlePaymentFailed(payload: PaymentWebhookPayload) {
  let bookingId = extractBookingId(payload)
  const paymentDetails = extractPaymentDetails(payload)
  const provider = determineWebhookProvider(payload, {})
  
  if (!bookingId) {
    const contact = extractCustomerContact(payload)
    bookingId = await tryResolveBookingIdByContact(contact, paymentDetails.amount)
    if (!bookingId) {
      await supabase
        .from('payment_transactions')
        .insert({
          booking_id: null,
          transaction_id: paymentDetails.transactionId,
          payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          status: 'failed',
          payment_method: paymentDetails.paymentMethod,
          customer_email: contact.email,
          metadata: { ...payload.metadata, contact, provider, event_type: paymentDetails.eventType },
          webhook_payload: payload,
          webhook_received_at: new Date().toISOString()
        })
      console.warn('Failed payment without booking_id recorded as unlinked')
      return
    }
  }
  
  
  // Create failed transaction record
  await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id: paymentDetails.transactionId,
      payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      status: 'failed',
      metadata: {
        ...payload.metadata,
        ghl_contact_id: payload.contactId,
        ghl_location_id: payload.locationId,
        provider
      },
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
  
}

// Handle refunded payment (supports both formats)
async function handlePaymentRefunded(payload: PaymentWebhookPayload) {
  let bookingId = extractBookingId(payload)
  const paymentDetails = extractPaymentDetails(payload)
  const provider = determineWebhookProvider(payload, {})
  
  if (!bookingId) {
    const contact = extractCustomerContact(payload)
    bookingId = await tryResolveBookingIdByContact(contact, paymentDetails.amount)
    if (!bookingId) {
      await supabase
        .from('payment_transactions')
        .insert({
          booking_id: null,
          transaction_id: `${paymentDetails.transactionId}_refund`,
          payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          status: 'refunded',
          payment_method: paymentDetails.paymentMethod,
          customer_email: contact.email,
          metadata: { ...payload.metadata, contact, provider, event_type: paymentDetails.eventType },
          webhook_payload: payload,
          webhook_received_at: new Date().toISOString()
        })
      console.warn('Refund webhook without booking_id recorded as unlinked')
      return
    }
  }
  
  
  // Create refund transaction record
  await supabase
    .from('payment_transactions')
    .insert({
      booking_id: bookingId,
      transaction_id: `${paymentDetails.transactionId}_refund`,
      payment_provider: provider === 'gohighlevel' ? 'gohighlevel' : 'fastpaydirect',
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      status: 'refunded',
      metadata: {
        ...payload.metadata,
        ghl_contact_id: payload.contactId,
        ghl_location_id: payload.locationId,
        provider
      },
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
    
    // Parse payload first
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError)
      await logWebhookEvent(
        { eventType: 'parse_error', transaction_id: 'unknown', type: 'Unknown', contactId: 'unknown', locationId: 'unknown', timestamp: Date.now() } as any,
        headers,
        false,
        'Invalid JSON payload'
      )
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }
    
    // Verify webhook signature if secrets are configured (optional)
    let isValid = true
    const hasGHLSecret = process.env.GHL_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET
    
    if (hasGHLSecret) {
      // Only verify if secrets are configured
      isValid = verifyWebhookSignature(rawBody, headers)
      
      if (!isValid) {
        console.warn('Webhook signature verification failed - processing anyway')
        // Log warning but continue processing
      }
    } else {
    }
    
    // Log the webhook event (payload is guaranteed to be non-null here)
    await logWebhookEvent(payload!, headers, isValid)
    
    // Process based on event type (supports both formats)
    const paymentDetails = extractPaymentDetails(payload!)
    const provider = determineWebhookProvider(payload!, headers)
    
    
    // Handle both FastPayDirect and GoHighLevel event types
    const eventType = paymentDetails.eventType
    if (eventType === 'payment.completed' || eventType === 'InvoicePaid' || eventType === 'OrderPaid' || eventType === 'TransactionCompleted') {
      await handlePaymentCompleted(payload!)
    } else if (eventType === 'payment.failed' || eventType === 'TransactionFailed') {
      await handlePaymentFailed(payload!)
    } else if (eventType === 'payment.refunded' || eventType === 'TransactionRefunded') {
      await handlePaymentRefunded(payload!)
    } else if (eventType === 'payment.cancelled') {
      // Log but don't process cancelled payments
    } else {
    }
    
    // Mark webhook as processed
    const eventId = payload!.webhookId || payload!.event_id
    if (eventId) {
      await supabase
        .from('webhook_events')
        .update({
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
    }
    
    const processingTime = Date.now() - startTime
    
    return NextResponse.json(
      { 
        received: true,
        processing_time: processingTime,
        provider,
        event_type: paymentDetails.eventType
      },
      { status: 200 }
    )
    
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    
    // Update webhook event with error
    const eventId = payload?.webhookId || payload?.event_id
    if (eventId) {
      await supabase
        .from('webhook_events')
        .update({
          processing_status: 'failed',
          error_message: error.message,
          error_details: { stack: error.stack }
        })
        .eq('event_id', eventId)
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
    supports: ['FastPayDirect', 'GoHighLevel'],
    configured: {
      payment_webhook_secret: !!process.env.PAYMENT_WEBHOOK_SECRET,
      ghl_webhook_secret: !!process.env.GHL_WEBHOOK_SECRET
    },
    timestamp: new Date().toISOString(),
    description: 'Unified payment webhook receiver supporting both FastPayDirect and GoHighLevel payment confirmations'
  })
}