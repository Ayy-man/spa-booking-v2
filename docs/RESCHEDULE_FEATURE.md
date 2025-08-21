# Reschedule Feature Documentation

## Overview
The reschedule feature allows admin staff to change appointment dates and times while preserving all booking details including customer information, service, staff, and room assignments.

## Database Changes Required

Run the following migration in Supabase SQL Editor:

```sql
-- Run the migration file at:
-- /supabase/migrations/20250121_add_reschedule_tracking.sql
```

This migration adds:
- Tracking columns to the `bookings` table
- New `reschedule_history` table
- Helper functions for reschedule validation
- Automatic triggers for tracking changes

## Features

### 1. Reschedule Restrictions
- Maximum 3 reschedules per booking
- Cannot reschedule cancelled, completed, or no-show bookings
- Cannot reschedule within 2 hours of appointment
- Bookings can only be rescheduled up to 30 days in advance

### 2. Couples Booking Support
- Couples bookings are rescheduled together automatically
- Both appointments move to the same new date/time
- Room assignments are preserved (couples never in Room 1)

### 3. Visual Indicators
- **Admin Bookings Page**: Shows "Rescheduled Nx" badge next to date/time
- **Room Timeline**: Orange indicator dot on rescheduled bookings
- **Booking Details Modal**: 
  - Shows reschedule count badge
  - Displays original appointment date/time
  - Shows reschedule reason if provided

### 4. Availability Checking
- Real-time availability checking for new date/time
- Checks staff availability
- Checks room availability
- Respects 2-hour advance booking rule
- Shows unavailable slots as disabled

## How to Use

### From Booking Details Modal

1. Open any booking from the admin panel
2. Click the **"Reschedule"** button (with calendar icon)
3. In the Reschedule Modal:
   - Select a new date from the calendar
   - Choose an available time slot
   - Optionally add a reason for the reschedule
   - Click "Confirm Reschedule"

### From All Bookings Page

1. Navigate to Admin → All Bookings
2. Click "View" on any booking
3. Follow steps 2-3 above

### From Room Timeline

1. Navigate to Admin → Room Timeline
2. Click on any booking block
3. In the booking details modal, click "Reschedule"
4. Follow the reschedule process

## API Endpoints

### Check Reschedule Eligibility
```
GET /api/admin/bookings/[id]/reschedule
Authorization: Bearer {token}
```

Returns:
- `can_reschedule`: boolean
- `reason`: string (if cannot reschedule)
- `history`: array of previous reschedules

### Reschedule Booking
```
POST /api/admin/bookings/[id]/reschedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "new_date": "2025-01-22",
  "new_start_time": "14:00",
  "reason": "Customer requested",
  "notify_customer": true
}
```

## Business Logic

### Reschedule Count Tracking
- First reschedule sets `rescheduled_from` to original booking ID
- `rescheduled_count` increments with each reschedule
- `original_appointment_date` and `original_start_time` preserve first booking details
- `last_rescheduled_at` tracks most recent reschedule timestamp

### History Tracking
All reschedules are logged in `reschedule_history` table with:
- Old and new date/time
- Staff and room changes
- Reason for reschedule
- Who initiated (admin/customer)
- Notification status

### Edge Cases Handled
- **Walk-in bookings**: Can be rescheduled like regular bookings
- **Couples bookings**: Both bookings updated atomically
- **Staff conflicts**: Prevents double-booking staff
- **Room conflicts**: Prevents double-booking rooms
- **Body scrub services**: Maintains Room 3 requirement

## Testing Checklist

- [ ] Regular booking reschedule
- [ ] Couples booking reschedule (both move together)
- [ ] Maximum reschedule limit (3 times)
- [ ] 2-hour advance notice restriction
- [ ] Past date prevention
- [ ] 30-day future limit
- [ ] Availability checking (staff/room conflicts)
- [ ] Visual indicators display correctly
- [ ] History tracking works
- [ ] Original appointment details preserved

## Troubleshooting

### "Cannot reschedule" errors
- Check booking status (must be confirmed/pending)
- Check reschedule count (max 3)
- Check time constraints (2-hour minimum)

### Availability issues
- Verify staff schedule for target date
- Check for room conflicts
- Ensure service duration fits in selected slot

### Database errors
- Ensure migration has been run
- Check service role key is configured
- Verify RLS policies allow admin operations