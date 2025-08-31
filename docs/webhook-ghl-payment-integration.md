# Payment Flow Documentation - Simplified GoHighLevel Integration

**Last Updated:** August 13, 2025  
**Status:** ACTIVE - Current Production Implementation  

## Overview

This document describes the current simplified payment flow implemented in the spa booking system. The system has been streamlined to use direct GoHighLevel payment link redirects with webhook-based payment verification.

## Current Payment Flow Architecture

### 1. **Booking Flow Steps**
```
Service Selection → Date/Time → Staff → Customer Info → Waiver (if required) → Payment → Confirmation
```

### 2. **Payment Decision Logic**
The payment decision happens in `/src/app/booking/waiver/page.tsx` based on customer type:

```typescript
// New Customer Flow
if (customer.isNewCustomer) {
  // Direct redirect to GoHighLevel payment link
  const returnUrl = `${baseUrl}/booking/confirmation?payment=success`
  const ghlPaymentUrl = `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034?return_url=${encodeURIComponent(returnUrl)}`
  window.location.href = ghlPaymentUrl
}

// Existing Customer Flow  
else {
  // Skip payment, go directly to confirmation
  router.push('/booking/confirmation')
}
```

### 3. **Booking Creation Strategy**
- **New Customers**: Booking is created AFTER successful payment (via webhook)
- **Existing Customers**: Booking is created immediately during confirmation

## Key Implementation Files

### Core Payment Logic
- **`/src/app/booking/waiver/page.tsx`** - Main payment decision logic
- **`/src/app/booking/confirmation/page.tsx`** - Booking creation and confirmation
- **`/src/app/api/webhooks/payment/route.ts`** - Payment verification webhook handler

### Removed Files (No Longer Used)
- ~~`/src/app/booking/payment-processing/page.tsx`~~ - Removed: Complex payment flow
- ~~`/src/app/booking/payment-simple/page.tsx`~~ - Removed: Simple payment flow  
- ~~`/src/app/booking/payment-selection/`~~ - Removed: Empty directory

## Payment Webhook Integration

### Webhook Endpoint
- **URL**: `/api/webhooks/payment`
- **Methods**: POST (webhook), GET (health check)
- **Supports**: FastPayDirect and GoHighLevel formats

### Webhook Processing Flow
1. **Signature Verification** - Validates webhook authenticity
2. **Booking ID Resolution** - Attempts to find booking via:
   - Direct booking_id in webhook payload
   - Customer email/phone + amount matching for unlinked payments
3. **Payment Recording** - Creates payment transaction record
4. **Booking Status Update** - Marks booking as 'paid'
5. **GHL Confirmation** - Sends booking confirmation back to GoHighLevel

### Payment Webhook Payload Support
```typescript
// Supported Event Types
- payment.completed / InvoicePaid / OrderPaid / TransactionCompleted
- payment.failed / TransactionFailed  
- payment.refunded / TransactionRefunded
- payment.cancelled

// Auto-reconciliation for missing booking_id
- Searches by customer email/phone + amount matching
- Records unlinked payments for manual review
- Prevents webhook retry loops
```

## Data Flow and State Management

### Customer Data Storage
```typescript
// Booking state stored in booking-state-manager
{
  selectedService: Service,
  selectedDate: string,
  selectedTime: string, 
  selectedStaff: string,
  customerInfo: CustomerData,
  bookingData?: CouplesBookingData
}

// Customer info stored separately
localStorage.setItem('customerInfo', JSON.stringify({
  name, email, phone, isNewCustomer, specialRequests
}))
```

### Booking ID Persistence
- **Return URL Strategy**: Booking ID passed via URL parameters for payment returns
- **localStorage Fallback**: Additional storage for data recovery
- **Database-First**: Booking created before payment redirect for data integrity

## Error Handling and Fallbacks

### Payment Verification Fallbacks
1. **URL Parameters**: Primary method - booking_id in return URL
2. **Contact Matching**: Secondary - email/phone + amount matching  
3. **Unlinked Recording**: Tertiary - record payment for manual reconciliation

### Booking Recovery Mechanisms
```typescript
// Multiple recovery strategies
1. URL parameter: ?booking_id=xxx
2. Session storage: bookingData with booking ID
3. localStorage: pendingBooking data
4. State manager: complete booking state
```

### Graceful Degradation
- Invalid/missing booking data → Redirect to booking start
- Payment verification timeout → Manual status check available
- Webhook failures → Recorded for retry/manual review

## Environment Configuration

### Required Environment Variables
```bash
# Payment Processing
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
GHL_WEBHOOK_SECRET=your_ghl_secret  

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GoHighLevel Integration  
NEXT_PUBLIC_GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
```

### Payment Link Configuration
- **Live Payment URL**: `https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034`
- **Amount**: $25.00 (deposit for new customers)
- **Return URL Format**: `{origin}/booking/confirmation?payment=success`

## Security Measures

### Webhook Security
- **HMAC Signature Verification** - Prevents webhook spoofing
- **Timestamp Validation** - Prevents replay attacks (5-minute window)
- **Dual Provider Support** - FastPayDirect and GoHighLevel formats
- **Rate Limiting** - Built into API routes

### Data Protection
- **RLS Policies** - Database-level access control
- **Input Validation** - Server-side validation for all inputs
- **PII Handling** - Minimal customer data storage
- **Session Security** - Temporary data with cleanup

## Monitoring and Logging

### Webhook Event Logging
```sql
-- All webhook events logged to webhook_events table
{
  event_id: string,
  event_type: string,
  provider: 'fastpaydirect' | 'gohighlevel',
  payload: jsonb,
  signature_verified: boolean,
  processing_status: 'pending' | 'completed' | 'failed'
}
```

### Payment Transaction Records
```sql
-- Payment transactions logged to payment_transactions table  
{
  booking_id: uuid,
  transaction_id: string,
  payment_provider: string,
  amount: decimal,
  status: 'completed' | 'failed' | 'refunded',
  customer_email: string,
  metadata: jsonb
}
```

### Health Check Endpoint
- **URL**: `/api/webhooks/payment` (GET)
- **Response**: System status, configuration check, timestamp
- **Use**: Monitoring webhook endpoint availability

## Testing and Validation

### Manual Testing Flow
1. Complete booking flow as new customer
2. Verify redirect to payment link with correct return URL
3. Complete payment (test mode)
4. Verify redirect to confirmation page
5. Check booking creation in database
6. Verify webhook reception and processing

### Webhook Testing
```bash
# Test webhook endpoint health
curl GET https://your-domain/api/webhooks/payment

# Test webhook payload processing
curl -X POST https://your-domain/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test-signature" \
  -d '{"event_type": "payment.completed", "amount": 25.00}'
```

## Troubleshooting Guide

### Common Issues

#### 1. Payment Returns with "Session Expired"
- **Cause**: Booking data lost during payment redirect
- **Solution**: Check localStorage and state manager recovery
- **Prevention**: Ensure booking created before payment redirect

#### 2. Webhook Processing Failures  
- **Cause**: Signature verification or payload parsing issues
- **Solution**: Check webhook secret configuration and payload format
- **Debug**: Review webhook_events table for error details

#### 3. Duplicate Bookings
- **Cause**: Multiple webhook deliveries or payment retries
- **Solution**: Check existing transaction records before processing
- **Prevention**: Idempotent webhook processing

#### 4. Missing Booking ID in Webhooks
- **Cause**: Payment link doesn't include booking reference
- **Solution**: Auto-reconciliation via email/phone + amount matching
- **Fallback**: Manual review of unlinked_payments

### Debug Information
```typescript
// Enable detailed logging for debugging
console.log('Payment webhook received:', {
  provider: determineWebhookProvider(payload, headers),
  eventType: extractPaymentDetails(payload).eventType,
  bookingId: extractBookingId(payload),
  amount: extractPaymentDetails(payload).amount
})
```

## Future Enhancements

### Planned Improvements
1. **Enhanced Payment Options** - Multiple payment methods support
2. **Real-time Status Updates** - WebSocket-based payment status
3. **Advanced Reconciliation** - ML-based payment matching  
4. **Mobile App Integration** - Deep linking for mobile payments
5. **Analytics Dashboard** - Payment success/failure metrics

### Scalability Considerations
- **Payment Provider Abstraction** - Support multiple payment gateways
- **Webhook Queue System** - Handle high-volume webhook processing
- **Database Optimization** - Indexes for payment lookups
- **Caching Strategy** - Redis for session state management

---

## Summary

The current payment implementation prioritizes simplicity and reliability over complex features. The direct GoHighLevel integration with webhook verification provides a robust foundation that can be enhanced incrementally based on business needs.

**Key Benefits:**
- ✅ Simple, reliable payment flow
- ✅ Automatic payment verification via webhooks  
- ✅ Robust error handling and recovery
- ✅ Security-first approach
- ✅ Comprehensive logging and monitoring
- ✅ Easy maintenance and troubleshooting

**Status**: Production ready with comprehensive webhook integration and fallback mechanisms.