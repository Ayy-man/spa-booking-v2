# Booking Conflict Debug Analysis

## Issue Summary
**Service**: Deep Tissue Body Massage (60 minutes)
**Date**: Thursday, August 7, 2025  
**Time**: 15:15 to 16:15
**Staff**: robyn_camacho
**Error**: "Room is already booked for this time slot"

## Root Cause Analysis

### 1. Service & Staff Compatibility ✅ VERIFIED
- **Service ID**: `deep_tissue_massage` (from booking page)
- **Service Category**: `massage` 
- **Duration**: 60 minutes
- **Staff**: `robyn_camacho` can perform ALL body massages ✅
- **Default Room**: Room 3 (Robyn's preferred room)

### 2. Room Assignment Logic ✅ ANALYZED
From the `assign_optimal_room` function:
- Deep Tissue Body Massage is NOT a body scrub service (doesn't require Room 3 exclusively)
- It's NOT a couples service
- Should follow standard room assignment: Try staff's default room (Room 3) first
- If Room 3 unavailable, try any available room with massage capabilities

### 3. Conflict Detection Logic 🔍 ISSUE IDENTIFIED
The error "Room is already booked for this time slot" comes from the `check_booking_conflicts()` trigger function:

```sql
-- Check for room conflicts
IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE room_id = NEW.room_id 
    AND appointment_date = NEW.appointment_date 
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        (start_time < NEW.end_time AND end_time > NEW.start_time)
    )
) THEN
    RAISE EXCEPTION 'Room is already booked for this time slot';
END IF;
```

### 4. Potential Issues

#### A. Time Overlap Logic
The conflict detection uses this logic:
```sql
(start_time < NEW.end_time AND end_time > NEW.start_time)
```

For booking 15:15-16:15:
- `NEW.start_time` = '15:15'
- `NEW.end_time` = '16:15'

This would conflict with ANY existing booking where:
- Existing booking starts before 16:15 AND ends after 15:15

#### B. Buffer Time Not Applied in Conflict Check
- Business logic states 15-minute buffer between appointments
- The conflict check doesn't seem to account for this buffer
- A booking ending at 15:00 should prevent a 15:15 booking due to 15-minute buffer

#### C. Potential Existing Bookings
Possible conflicting bookings for Thursday, August 7, 2025:
1. **14:00-15:00 booking in assigned room** - Would conflict due to missing buffer
2. **15:00-16:00 booking in assigned room** - Direct overlap
3. **16:00-17:00 booking in assigned room** - Would conflict due to missing buffer

### 5. Debug Steps Required

#### Step 1: Check Existing Bookings
Query all bookings for August 7, 2025 to identify conflicts:
```sql
SELECT id, service_id, staff_id, room_id, start_time, end_time, status
FROM bookings 
WHERE appointment_date = '2025-08-07' 
AND status != 'cancelled'
ORDER BY start_time;
```

#### Step 2: Verify Room Assignment
Check what room is being assigned for this booking:
- Service: `deep_tissue_massage`
- Staff: `robyn_camacho`
- Expected: Room 3 (Robyn's default)

#### Step 3: Test Buffer Logic
Check if the 15-minute buffer is properly implemented in conflict detection.

## Recommended Solutions

### Solution 1: Update Conflict Detection to Include Buffer
Modify the `check_booking_conflicts()` function to include 15-minute buffer:

```sql
AND (
    (start_time < NEW.end_time + INTERVAL '15 minutes' AND end_time + INTERVAL '15 minutes' > NEW.start_time)
)
```

### Solution 2: Room Assignment Fallback
Ensure that if Room 3 (Robyn's default) is unavailable, the system tries other available rooms.

### Solution 3: Enhanced Debug Logging
Add detailed logging to the booking process to identify exactly which existing booking is causing the conflict.

## Files Involved
- `/src/app/booking/confirmation/page.tsx` - Booking submission
- `/src/lib/supabase.ts` - createBooking function
- `/supabase/migrations/025_fix_validation_column_names.sql` - Conflict check trigger
- `/supabase/migrations/018_fix_room_assignment_date_column.sql` - Room assignment function

## Next Steps
1. Query the database to identify existing bookings for August 7, 2025
2. Test the room assignment logic with the specific service/staff combination
3. Implement enhanced conflict detection with proper buffer time handling
4. Add debug logging to identify the exact source of conflicts