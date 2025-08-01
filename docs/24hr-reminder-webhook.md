# 24-Hour Appointment Reminder Webhook

## Overview

The 24-hour reminder webhook automatically sends appointment details to GoHighLevel 24 hours before each confirmed booking. This helps ensure customers receive timely reminders about their upcoming appointments.

## Features

- **Automatic Scheduling**: Runs hourly to find bookings exactly 24 hours away
- **Duplicate Prevention**: Tracks which reminders have been sent to avoid duplicates
- **Comprehensive Data**: Sends complete booking, customer, service, staff, and room details
- **Error Handling**: Includes retry logic and detailed error tracking
- **Flexible Timing**: Configurable time window for reminder delivery

## Implementation Details

### Database Schema Updates

The system adds two fields to the bookings table:
- `reminder_sent_at`: Timestamp when the reminder was sent
- `reminder_send_count`: Number of reminder attempts (for tracking retries)

### Webhook Payload Structure

```json
{
  "event_type": "appointment_reminder_24hr",
  "booking": {
    "id": "booking-uuid",
    "appointment_date": "2025-01-15",
    "start_time": "14:00",
    "end_time": "15:00",
    "duration": 60,
    "status": "confirmed",
    "payment_status": "pending",
    "total_price": 150,
    "final_price": 150,
    "notes": "Customer notes",
    "booking_type": "single"
  },
  "customer": {
    "id": "customer-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "(671) 555-1234",
    "full_name": "John Doe"
  },
  "service": {
    "id": "service-uuid",
    "name": "Swedish Massage",
    "category": "massage",
    "duration": 60,
    "price": 150,
    "description": "Service description"
  },
  "staff": {
    "id": "staff-uuid",
    "name": "Robyn Marcelo",
    "email": "robyn@dermalguam.com",
    "role": "therapist"
  },
  "room": {
    "id": 2,
    "name": "Room 2",
    "capacity": 2
  },
  "appointment_details": {
    "date_formatted": "Wednesday, January 15, 2025",
    "time_formatted": "2:00 PM - 3:00 PM",
    "time_until_appointment": "24 hours",
    "reminder_sent_at": "2025-01-14T14:00:00Z"
  },
  "business": {
    "name": "Dermal Skin Clinic and Spa Guam",
    "phone": "(671) 647-7546",
    "address": "123 Marine Corps Dr, Tamuning, GU 96913",
    "booking_url": "https://booking.dermalguam.com"
  }
}
```

## Setup Instructions

### 1. Database Migration

Run the migration to add reminder tracking fields:

```sql
-- Run migration 013_add_reminder_tracking.sql
-- This must be run in your Supabase SQL editor before using the reminder system
```

**Important**: The reminder system will not work until this migration is applied to your database.

### 2. Environment Configuration

Add the following to your `.env.local`:

```bash
# Cron job security
CRON_SECRET=your-secure-random-string-here
```

### 3. Vercel Cron Configuration

The `vercel.json` file has been updated to run the reminder job hourly:

```json
{
  "crons": [
    {
      "path": "/api/send-24hr-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 4. GoHighLevel Webhook URL

The webhook sends to:
```
https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/41ef86e6-ff01-4182-80c0-0552994fe56c
```

## Testing

### 1. Test Webhook Payload

Send a test webhook to verify GoHighLevel integration:

```bash
curl -X POST http://localhost:3000/api/test-24hr-reminder-webhook
```

### 2. Check Upcoming Bookings

View bookings that would receive reminders:

```bash
curl http://localhost:3000/api/test-reminder-query
```

### 3. Manual Trigger (Development)

Manually trigger the reminder process:

```bash
curl -X POST http://localhost:3000/api/send-24hr-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

## Monitoring

### Success Metrics
- Number of reminders sent successfully
- Number of failed webhook calls
- Average processing time

### Error Handling
- Webhook failures are logged but don't stop other reminders
- Failed reminders can be retried in the next hourly run
- Database updates are tracked separately from webhook delivery

## Troubleshooting

### Common Issues

1. **No reminders being sent**
   - Check that bookings exist 24 hours in the future
   - Verify cron job is running (check Vercel logs)
   - Ensure CRON_SECRET is set correctly

2. **Webhook failures**
   - Verify GoHighLevel webhook URL is correct
   - Check webhook response for error details
   - Ensure payload format matches GoHighLevel expectations

3. **Duplicate reminders**
   - Check that `reminder_sent_at` is being set correctly
   - Verify database function logic
   - Review cron job frequency

### Database Queries

Check reminder status:
```sql
-- View bookings needing reminders
SELECT * FROM get_bookings_needing_reminder(24, 60);

-- Check reminder history
SELECT id, customer_id, appointment_date, start_time, 
       reminder_sent_at, reminder_send_count
FROM bookings
WHERE appointment_date >= CURRENT_DATE
ORDER BY appointment_date, start_time;
```

## Business Logic

### Reminder Timing
- Reminders are sent 24 hours before the appointment start time
- The system checks every hour for bookings in the 24-hour window
- A 60-minute window prevents missing bookings due to timing variations

### Eligibility Criteria
- Booking status must be "confirmed"
- Reminder must not have been sent already
- Appointment must be approximately 24 hours away

### Data Included
- Complete booking information
- Customer contact details for GoHighLevel to send SMS/email
- Service and pricing information
- Staff assignment for personalized messaging
- Formatted date and time for easy reading

## Security Considerations

1. **Authorization**: The cron endpoint requires a secret bearer token
2. **Data Protection**: Customer data is sent securely over HTTPS
3. **Access Control**: Database functions use row-level security
4. **Audit Trail**: All reminder sends are logged with timestamps

## Future Enhancements

1. **Multiple Reminder Types**
   - 48-hour reminders
   - 1-hour reminders
   - Post-appointment follow-ups

2. **Customizable Timing**
   - Business-configurable reminder windows
   - Customer preference settings

3. **Retry Logic**
   - Automatic retry for failed webhooks
   - Exponential backoff for repeated failures

4. **Analytics**
   - Reminder delivery rates
   - Customer response tracking
   - No-show correlation analysis