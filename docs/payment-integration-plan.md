# Payment Webhook Integration Plan

## Executive Summary

This document outlines the implementation plan for secure payment webhook integration in the spa booking system. Currently, the system assumes payment completion based on URL parameters without verification, creating a significant security vulnerability. This plan addresses these issues by implementing proper webhook-based payment verification.

## Current State Analysis

### Problems with Current Implementation

1. **No Payment Verification**: System assumes payment is complete when users return with `?payment=success` in URL
2. **Security Vulnerability**: Anyone can fake payment by manipulating URL parameters
3. **No Transaction Records**: The `payments` table exists but is never used
4. **Hardcoded Payment Status**: GHL webhooks always send payment status as "paid" regardless of actual payment
5. **No Audit Trail**: No record of actual payment transactions or confirmations

### Current Payment Flow

```
1. Customer fills booking form
2. New customers redirected to payment link
3. Payment processor (FastPayDirect) handles payment
4. Customer redirected back with ?payment=success
5. System assumes payment completed (NO VERIFICATION)
6. Booking marked as paid
```

## Proposed Solution Architecture

### New Secure Payment Flow

```
1. Customer fills booking form
2. Booking created with payment_status = 'pending'
3. Customer redirected to payment with booking_id metadata
4. Payment processor handles payment
5. Payment processor sends webhook to our endpoint
6. We verify webhook signature and payment amount
7. We update booking payment_status = 'paid'
8. We create payment_transaction record
9. Customer sees confirmed booking
```

## Implementation Details

### Phase 1: Database Schema Updates

#### New Tables

```sql
-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  customer_email VARCHAR(255),
  metadata JSONB,
  webhook_received_at TIMESTAMPTZ,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'))
);

-- Webhook events log table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  signature VARCHAR(500),
  signature_verified BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_attempts INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'ignored'))
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_processing_status ON webhook_events(processing_status);
```

### Phase 2: Webhook Endpoint Implementation

#### API Endpoint: `/api/webhooks/payment`

```typescript
// src/app/api/webhooks/payment/route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

// Webhook handler
export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and headers
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')
    const timestamp = request.headers.get('x-webhook-timestamp')
    
    // 2. Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // 3. Parse webhook payload
    const payload = JSON.parse(rawBody)
    
    // 4. Log webhook event
    await logWebhookEvent(payload, signature, request.headers)
    
    // 5. Process payment based on event type
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
      default:
        console.log('Unhandled webhook event type:', payload.event_type)
    }
    
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
```

#### Webhook Signature Verification

```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) return false
  
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('PAYMENT_WEBHOOK_SECRET not configured')
    return false
  }
  
  // Prevent replay attacks (timestamp must be within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const webhookTime = parseInt(timestamp)
  if (Math.abs(currentTime - webhookTime) > 300) {
    return false
  }
  
  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

### Phase 3: Payment Processing Logic

#### Payment Confirmation Handler

```typescript
async function handlePaymentCompleted(payload: any) {
  const { transaction_id, amount, currency, metadata } = payload
  const bookingId = metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking_id in payment webhook metadata')
    return
  }
  
  // Start transaction
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()
  
  if (!booking) {
    console.error('Booking not found:', bookingId)
    return
  }
  
  // Verify payment amount matches booking
  if (parseFloat(amount) !== booking.final_price) {
    console.error('Payment amount mismatch', {
      expected: booking.final_price,
      received: amount
    })
    // Log suspicious activity
    return
  }
  
  // Create payment transaction record
  await supabase.from('payment_transactions').insert({
    booking_id: bookingId,
    transaction_id,
    payment_provider: 'fastpaydirect',
    amount,
    currency,
    status: 'completed',
    webhook_payload: payload,
    webhook_received_at: new Date().toISOString()
  })
  
  // Update booking payment status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
  
  // Send confirmation to GoHighLevel with verified payment
  await sendVerifiedPaymentToGHL(booking, transaction_id)
}
```

### Phase 4: Booking Flow Updates

#### Updated Confirmation Page Logic

```typescript
// src/app/booking/confirmation/page.tsx

// Remove the automatic payment assumption
const determinePaymentStatus = (customer: any, urlParams: URLSearchParams) => {
  // Always start as pending for new bookings
  return {
    paymentOption: customer.isNewCustomer ? 'deposit' : 'pay_on_location',
    paymentStatus: 'pending' // Always pending initially
  }
}

// Add payment status polling
useEffect(() => {
  if (bookingId && paymentStatus === 'pending') {
    const pollInterval = setInterval(async () => {
      const status = await checkPaymentStatus(bookingId)
      if (status === 'paid') {
        setPaymentStatus('paid')
        setShowConfetti(true)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)
    
    return () => clearInterval(pollInterval)
  }
}, [bookingId, paymentStatus])
```

### Phase 5: Payment Status API

#### Payment Status Check Endpoint

```typescript
// src/app/api/bookings/[id]/payment-status/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    
    // Get booking payment status
    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_status, payment_option')
      .eq('id', bookingId)
      .single()
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    
    // Get latest payment transaction
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return NextResponse.json({
      payment_status: booking.payment_status,
      payment_option: booking.payment_option,
      transaction: transaction || null
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 })
  }
}
```

## Security Considerations

### 1. Webhook Signature Verification
- Use HMAC-SHA256 for signature verification
- Verify timestamp to prevent replay attacks
- Use constant-time comparison to prevent timing attacks

### 2. Environment Variables
```env
PAYMENT_WEBHOOK_SECRET=your_webhook_secret_here
PAYMENT_WEBHOOK_ALLOWED_IPS=["52.89.214.238", "34.212.75.30"]
GHL_WEBHOOK_SECRET=your_ghl_secret_here
```

### 3. Rate Limiting
- Implement rate limiting: 10 requests per second per IP
- Use Redis or in-memory store for rate limit tracking

### 4. IP Allowlisting
- Only accept webhooks from known payment processor IPs
- Maintain allowlist in environment variables

### 5. Payment Verification
- Always verify payment amount matches booking amount
- Check currency matches expected currency
- Validate booking exists and is in correct state

## Testing Strategy

### Unit Tests

```typescript
describe('Payment Webhook Handler', () => {
  test('should verify valid webhook signature', () => {
    const payload = JSON.stringify({ test: 'data' })
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const secret = 'test_secret'
    const signature = createTestSignature(payload, timestamp, secret)
    
    expect(verifyWebhookSignature(payload, signature, timestamp)).toBe(true)
  })
  
  test('should reject invalid signature', () => {
    const payload = JSON.stringify({ test: 'data' })
    const timestamp = Math.floor(Date.now() / 1000).toString()
    
    expect(verifyWebhookSignature(payload, 'invalid', timestamp)).toBe(false)
  })
  
  test('should reject old timestamps', () => {
    const payload = JSON.stringify({ test: 'data' })
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString()
    const signature = createTestSignature(payload, oldTimestamp, 'secret')
    
    expect(verifyWebhookSignature(payload, signature, oldTimestamp)).toBe(false)
  })
})
```

### Integration Tests

1. Create test booking
2. Send test webhook with valid signature
3. Verify booking payment status updated
4. Verify payment transaction created
5. Verify GHL webhook sent

### End-to-End Tests

1. Complete full booking flow
2. Simulate payment webhook
3. Verify customer sees confirmation
4. Check all database records created
5. Verify email notifications sent

## Migration Plan

### Step 1: Deploy Database Changes (Day 1)
- Run migration to create new tables
- No impact on existing functionality

### Step 2: Deploy Webhook Endpoint (Day 2)
- Deploy webhook handler
- Configure webhook URL in payment processor
- Start logging webhook events
- Existing flow continues to work

### Step 3: Shadow Mode Testing (Days 3-4)
- Log and process webhooks without updating bookings
- Compare webhook data with existing bookings
- Identify and fix any issues

### Step 4: Gradual Rollout (Days 5-7)
- Enable for 10% of new bookings
- Monitor for issues
- Gradually increase to 100%

### Step 5: Update Existing Bookings (Day 8)
- Backfill payment_transactions for recent bookings
- Update payment_status based on actual payments

### Rollback Plan

If issues occur:
1. Disable webhook processing (feature flag)
2. Revert to URL parameter-based flow
3. Keep webhook logging active for debugging
4. Fix issues and retry migration

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Webhook Success Rate**
   - Target: > 99.9%
   - Alert if < 99%

2. **Payment Confirmation Latency**
   - Target: < 10 seconds
   - Alert if > 30 seconds

3. **Signature Verification Failures**
   - Target: < 0.1%
   - Alert if > 1%

4. **Payment Amount Mismatches**
   - Target: 0
   - Alert on any mismatch

### Logging Requirements

```typescript
// Structured logging for monitoring
logger.info('webhook_received', {
  provider: 'fastpaydirect',
  event_type: payload.event_type,
  booking_id: metadata.booking_id,
  transaction_id: payload.transaction_id,
  amount: payload.amount,
  timestamp: new Date().toISOString()
})

logger.error('webhook_verification_failed', {
  reason: 'invalid_signature',
  provider: 'fastpaydirect',
  ip_address: request.ip,
  timestamp: new Date().toISOString()
})
```

## GoHighLevel Integration Updates

### Updated Webhook Payload

```typescript
// Send verified payment data to GHL
const ghlPayload = {
  booking_id: booking.id,
  customer: {
    name: customer.name,
    email: customer.email,
    phone: customer.phone
  },
  payment: {
    status: 'verified_paid', // New status
    transaction_id: transaction_id, // Real transaction ID
    amount: booking.final_price,
    currency: 'USD',
    payment_method: 'card',
    verified_at: new Date().toISOString(),
    provider: 'fastpaydirect'
  },
  booking_details: {
    service: booking.service_name,
    date: booking.appointment_date,
    time: booking.start_time,
    staff: booking.staff_name
  }
}
```

## Configuration Requirements

### Payment Provider Setup

1. **FastPayDirect Configuration**
   - Webhook URL: `https://yourdomain.com/api/webhooks/payment`
   - Events: payment.completed, payment.failed, payment.refunded
   - Get webhook signing secret
   - Add our server IP to their allowlist

2. **Environment Variables**
   ```env
   # Payment Webhook Configuration
   PAYMENT_WEBHOOK_SECRET=whsec_xxx
   PAYMENT_WEBHOOK_ENDPOINT=https://yourdomain.com/api/webhooks/payment
   
   # Security
   PAYMENT_WEBHOOK_ALLOWED_IPS=52.89.214.238,34.212.75.30
   WEBHOOK_TIMESTAMP_TOLERANCE=300
   
   # Feature Flags
   ENABLE_PAYMENT_VERIFICATION=true
   PAYMENT_VERIFICATION_PERCENTAGE=100
   ```

3. **Payment Link Updates**
   - Ensure all payment links include metadata
   - Pass booking_id in custom fields
   - Configure success/failure return URLs

## Support Documentation

### Troubleshooting Guide

**Problem**: Payment not confirming after customer pays
- Check webhook logs for errors
- Verify webhook signature configuration
- Check if booking_id is in payment metadata
- Verify payment amount matches booking

**Problem**: Duplicate payment confirmations
- Check webhook event deduplication
- Verify event_id uniqueness constraint
- Check for webhook retry configuration

**Problem**: Customer sees pending when payment complete
- Check payment status polling
- Verify webhook processing time
- Check for JavaScript errors in browser

## Success Criteria

1. Zero fake payment confirmations
2. All legitimate payments verified within 30 seconds
3. Complete audit trail for all transactions
4. No disruption to existing bookings
5. Improved integration with GoHighLevel

## Timeline

- **Week 1**: Database setup and webhook endpoint
- **Week 2**: Testing and shadow mode
- **Week 3**: Gradual rollout
- **Week 4**: Full deployment and monitoring

## Approval Sign-offs

- [ ] Development Team
- [ ] Security Review
- [ ] Payment Provider Configuration
- [ ] Production Deployment
- [ ] Post-deployment Verification

---

*Document Version: 1.0*  
*Last Updated: 2025-01-12*  
*Author: Spa Booking Development Team*