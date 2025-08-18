# Booking Cancellation Testing Guide

## Overview
This document outlines how to test the complete booking cancellation functionality with proper field tracking.

## Database Migrations Required

Run these migrations in order:

1. **040_add_booking_status_triggers.sql** - Adds automatic timestamp management
2. **041_add_cancel_booking_function.sql** - Adds RPC functions for proper cancellation

```bash
# Apply migrations to your Supabase project
supabase db push
```

## Testing Steps

### 1. Test via Admin Panel UI

1. Navigate to Admin Dashboard (`/admin`)
2. Click on any booking card to open details modal
3. Click "Cancel Booking" button
4. Enter a cancellation reason
5. Confirm cancellation

**Expected Results:**
- Booking status changes to "cancelled"
- `cancelled_at` timestamp is set in database
- `cancellation_reason` is stored in database
- Modal closes and list refreshes

### 2. Test via Database Query

After cancelling a booking, verify fields are set:

```sql
SELECT 
    id,
    status,
    cancelled_at,
    cancellation_reason,
    internal_notes,
    updated_at
FROM bookings
WHERE status = 'cancelled'
ORDER BY cancelled_at DESC
LIMIT 5;
```

**Expected Results:**
- `status` = 'cancelled'
- `cancelled_at` = timestamp when cancelled
- `cancellation_reason` = the reason provided (or 'Cancelled by admin')
- `internal_notes` = starts with "Cancelled: [reason]"

### 3. Test RPC Function Directly

Test the RPC function in Supabase SQL Editor:

```sql
-- Test cancellation with reason
SELECT cancel_booking(
    'YOUR_BOOKING_ID_HERE'::uuid,
    'Test cancellation reason',
    'test_user'
);

-- Test cancellation without reason
SELECT cancel_booking(
    'YOUR_BOOKING_ID_HERE'::uuid
);
```

**Expected Results:**
- Returns JSON with `success: true`
- Includes `cancelled_at` timestamp
- Includes `cancellation_reason`

### 4. Test Status Change Trigger

Test that the trigger works when updating status directly:

```sql
-- Update a booking to cancelled status
UPDATE bookings 
SET status = 'cancelled'
WHERE id = 'YOUR_BOOKING_ID_HERE';

-- Check if trigger set the timestamp
SELECT cancelled_at, cancellation_reason 
FROM bookings 
WHERE id = 'YOUR_BOOKING_ID_HERE';
```

**Expected Results:**
- `cancelled_at` automatically set by trigger
- `cancellation_reason` set to default if not provided

### 5. Test Reversal Protection

Test that cancelled bookings maintain their cancellation data:

```sql
-- Try to un-cancel a booking
UPDATE bookings 
SET status = 'confirmed'
WHERE id = 'YOUR_CANCELLED_BOOKING_ID_HERE';

-- Check that cancellation fields were cleared
SELECT cancelled_at, cancellation_reason 
FROM bookings 
WHERE id = 'YOUR_CANCELLED_BOOKING_ID_HERE';
```

**Expected Results:**
- `cancelled_at` = NULL
- `cancellation_reason` = NULL

## TypeScript Implementation Options

### Option 1: Using RPC Function (Recommended)
```typescript
import { cancelBookingRPC } from '@/lib/admin-booking-rpc'

const result = await cancelBookingRPC(bookingId, reason)
```

### Option 2: Using Standard Update (Fallback)
```typescript
import { cancelBooking } from '@/lib/admin-booking-logic'

const result = await cancelBooking(bookingId, reason)
```

## Verification Queries

### Check All Cancelled Bookings
```sql
SELECT 
    COUNT(*) as total_cancelled,
    COUNT(cancelled_at) as with_timestamp,
    COUNT(cancellation_reason) as with_reason
FROM bookings
WHERE status = 'cancelled';
```

### Find Bookings Missing Cancellation Data
```sql
SELECT id, status, cancelled_at, cancellation_reason, updated_at
FROM bookings
WHERE status = 'cancelled' 
AND (cancelled_at IS NULL OR cancellation_reason IS NULL);
```

### Review Recent Cancellations
```sql
SELECT 
    b.id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
    s.name as service_name,
    b.appointment_date,
    b.cancelled_at,
    b.cancellation_reason
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services s ON b.service_id = s.id
WHERE b.status = 'cancelled'
ORDER BY b.cancelled_at DESC
LIMIT 10;
```

## Troubleshooting

### If cancelled_at is not being set:
1. Check that the trigger exists: 
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'booking_status_change_trigger';
   ```
2. Check trigger function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_booking_status_change';
   ```

### If RPC function fails:
1. Check function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'cancel_booking';
   ```
2. Check permissions:
   ```sql
   SELECT has_function_privilege('authenticated', 'cancel_booking(uuid,text,text)', 'execute');
   ```

## Success Criteria

✅ Booking cancellation sets `cancelled_at` timestamp
✅ Cancellation reason is properly stored
✅ Internal notes contain cancellation information
✅ UI reflects cancelled status immediately
✅ Database triggers work automatically
✅ RPC functions return proper success/error responses
✅ No TypeScript compilation errors
✅ All builds pass successfully