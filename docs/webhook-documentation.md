# GoHighLevel Webhook Documentation

This document outlines the structure and usage of all webhooks integrated with the Dermal Skin Clinic & Spa booking system.

## Overview

The system integrates with GoHighLevel (GHL) through four main webhooks:
1. **New Customer Webhook** - Triggered when a new customer books
2. **Booking Confirmation Webhook** - Triggered when a booking is confirmed
3. **Booking Update Webhook** - Triggered when booking details are modified
4. **Show/No-Show Webhook** - Triggered when admin marks attendance

## Webhook URLs

```typescript
const webhookUrls = {
  newCustomer: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407',
  bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
  bookingUpdate: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc',
  showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4'
}
```

## 1. New Customer Webhook

**Event:** `new_customer`
**Trigger:** When a new customer completes their first booking

### Payload Structure

```json
{
  "event": "new_customer",
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-671-555-0123",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T14:00:00.000Z"
  },
  "booking": {
    "service": "Facial Treatment",
    "service_id": "facial_001",
    "service_category": "Facial Services",
    "service_description": "Facial Treatment treatment",
    "date": "2024-01-15",
    "time": "14:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705320000000",
    "session_id": "session_1705320000000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### Usage

```typescript
await ghlWebhookSender.sendNewCustomerWebhook(customerData, bookingData)
```

## 2. Booking Confirmation Webhook

**Event:** `booking_confirmed`
**Trigger:** When a booking is successfully confirmed and payment is processed

### Payload Structure

```json
{
  "event": "booking_confirmed",
  "booking_id": "booking_001",
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Facial Treatment",
    "service_id": "facial_001",
    "service_category": "Facial Services",
    "service_description": "Facial Treatment treatment",
    "staff": "Sarah Johnson",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "14:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "status": "confirmed",
    "confirmation_code": "CONF1705320000000"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "payment": {
    "method": "online_payment",
    "amount": 85,
    "currency": "USD",
    "status": "paid",
    "transaction_id": "txn_1705320000000"
  },
  "system_data": {
    "created_at": "2024-01-15T14:00:00.000Z",
    "confirmed_at": "2024-01-15T14:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705320000000"
  }
}
```

### Usage

```typescript
await ghlWebhookSender.sendBookingConfirmationWebhook(
  bookingId,
  customerData,
  bookingData,
  ghlContactId
)
```

## 3. Booking Update Webhook

**Event:** `booking_updated`
**Trigger:** When booking details are modified (date, time, service, etc.)

### Payload Structure

```json
{
  "event": "booking_updated",
  "booking_id": "booking_001",
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123"
  },
  "changes": {
    "old_status": "confirmed",
    "new_status": "rescheduled",
    "old_date": "2024-01-15",
    "new_date": "2024-01-16",
    "old_time": "14:00",
    "new_time": "15:00",
    "reason": "Customer requested reschedule",
    "requested_by": "customer"
  },
  "appointment": {
    "service": "Facial Treatment",
    "service_id": "facial_001",
    "service_category": "Facial Services",
    "staff": "Sarah Johnson",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-16",
    "time": "15:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "status": "rescheduled"
  },
  "system_data": {
    "updated_at": "2024-01-15T14:00:00.000Z",
    "updated_by": "customer",
    "change_source": "website",
    "session_id": "session_1705320000000"
  }
}
```

### Usage

```typescript
await ghlWebhookSender.sendBookingUpdateWebhook(
  bookingId,
  customerData,
  bookingData,
  changes,
  ghlContactId
)
```

## 4. Show/No-Show Webhook

**Event:** `appointment_attendance`
**Trigger:** When admin marks a customer as show or no-show in the admin panel

### Payload Structure

```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_001",
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Facial Treatment",
    "service_id": "facial_001",
    "service_category": "Facial Services",
    "service_description": "Facial Treatment treatment",
    "staff": "Sarah Johnson",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "14:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T14:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer arrived on time and was satisfied with service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 85,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "positive"
  },
  "system_data": {
    "created_at": "2024-01-15T14:00:00.000Z",
    "attendance_marked_at": "2024-01-15T14:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705320000000",
    "admin_session": "admin_1705320000000"
  }
}
```

### Usage

```typescript
await ghlWebhookSender.sendShowNoShowWebhook(
  bookingId,
  customerData,
  bookingData,
  'show', // or 'no_show'
  adminNotes,
  ghlContactId
)
```

## Testing Endpoints

### Show/No-Show Webhook Test

**Endpoint:** `POST /api/test-show-no-show-webhook`

**Request Body:**
```json
{
  "status": "show",
  "adminNotes": "Customer arrived on time and was satisfied with service"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Show/no-show webhook sent successfully for status: show",
  "data": {
    "bookingId": "booking_test_001",
    "customer": "John Doe",
    "service": "Facial Treatment",
    "status": "show",
    "adminNotes": "Customer arrived on time and was satisfied with service"
  }
}
```

## Common Fields Across All Webhooks

### Customer Data
- `name`: Customer's full name
- `email`: Customer's email address
- `phone`: Customer's phone number (optional)
- `ghl_contact_id`: GoHighLevel contact ID (optional)
- `is_new_customer`: Boolean indicating if this is a new customer

### Appointment Data
- `service`: Service name
- `service_id`: Internal service identifier
- `service_category`: Service category
- `date`: Appointment date (YYYY-MM-DD)
- `time`: Appointment time (HH:MM)
- `duration`: Duration in minutes
- `price`: Service price
- `currency`: Currency code (USD)
- `staff`: Assigned staff member
- `room`: Treatment room

### System Data
- `created_at`: ISO timestamp of creation
- `session_id`: Unique session identifier
- `booking_source`: Source of the booking (website, phone, etc.)

## Error Handling

All webhook methods return a `WebhookResponse` object:

```typescript
interface WebhookResponse {
  success: boolean
  error?: string
}
```

## Business Logic Integration

The webhooks are integrated with the following business processes:

1. **New Customer Flow**: Automatically triggers when a new customer books
2. **Booking Confirmation**: Triggers after successful payment processing
3. **Booking Updates**: Triggers when customers or admins modify bookings
4. **Attendance Tracking**: Triggers when admins mark show/no-show status

## Security Considerations

- All webhooks use HTTPS endpoints
- User-Agent headers identify the source application
- CORS is enabled for cross-origin requests
- Error handling prevents sensitive data exposure
- Rate limiting should be implemented on the receiving end

## Monitoring and Logging

All webhook calls are logged with:
- Customer name and service
- Booking ID and status
- Success/failure status
- Error messages for debugging

## Future Enhancements

1. **Retry Logic**: Implement exponential backoff for failed webhooks
2. **Webhook Queue**: Queue webhooks for reliable delivery
3. **Analytics**: Track webhook success rates and response times
4. **Webhook Validation**: Validate webhook responses and handle edge cases 