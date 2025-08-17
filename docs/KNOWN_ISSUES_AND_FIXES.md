# Known Issues and Fixes

## Critical Issues

### 1. Couples Booking "Room Already Booked" Error

**Issue Identified**: January 2025

**Symptoms**:
- Error message: "Room is already booked at this time"
- Error message: "Failed to create primary booking: Staff member is not available at the requested time"
- Couples bookings consistently fail even when the time slot appears available
- Error occurs at the confirmation step

**Root Cause**:
The couples booking system was attempting to create **TWO separate booking records** for the same room and overlapping time period:
- First booking: Person 1's service (e.g., Room 2, 4:00-5:00 PM)
- Second booking: Person 2's service (e.g., Room 2, 4:00-5:00 PM) 

The database has a UNIQUE constraint that prevents two bookings from occupying the same room at the same time, regardless of their relationship. Even though both bookings had the same `booking_group_id` to indicate they're a couple, the constraint doesn't account for this - it simply blocks the second booking as a conflict.

**Why This Happened**:
- Original design assumed each person needs their own booking record
- Database constraint doesn't have an exception for couples (same booking_group_id)
- The second INSERT fails because the room+time combination is already taken by the first INSERT

**Solution Implemented**:
Migration 038 changes the approach to create **ONE booking record** that represents BOTH services:
- Single booking entry that occupies the time slot
- Both services stored in `internal_notes` field as JSON
- Combined pricing in `total_price`
- Room assignment works normally (prefers Room 3, then Room 2)

**Files Changed**:
- `/supabase/migrations/038_couples_single_slot_fix.sql` - Single slot implementation
- `/supabase/migrations/037_emergency_fix_couples_constraint.sql` - Emergency bypass (backup)
- `/supabase/migrations/036_complete_couples_booking_fix.sql` - Previous attempt (didn't address root cause)

**Status**: FIXED with single-slot approach

---

### 2. Time Slot Display Frequency

**Issue Identified**: January 2025

**Symptoms**:
- Time slots showing every 15 minutes for 60-90 minute services
- UI shows slots like 9:00, 9:15, 9:30, 9:45 for hour-long massages
- Poor user experience for longer services

**Root Cause**:
Fixed 15-minute increment for all services regardless of duration

**Solution Implemented**:
Dynamic increment based on service duration:
- Services 60+ minutes: 30-minute increments
- Services <60 minutes: 15-minute increments

**Files Changed**:
- `/src/app/booking/date-time/page.tsx`

**Status**: FIXED

---

## Pending Issues to Address

### 1. Couples Booking Database Design

**Current State**:
Using single-slot workaround (one booking record for both services)

**Ideal Solution**:
Modify database constraint to allow multiple bookings with same `booking_group_id` in same room/time:
```sql
-- Future migration needed
ALTER TABLE bookings 
ADD CONSTRAINT unique_room_time_excluding_groups 
UNIQUE (room_id, appointment_date, start_time) 
WHERE booking_group_id IS NULL;
```

**Impact**:
- Would allow proper two-booking approach for couples
- Better tracking of individual services and staff
- More accurate reporting

**Priority**: Medium (current workaround is functional)

---

### 2. Admin Panel Couples Display

**Current State**:
Couples bookings show as single entry with details in notes

**Needed Improvements**:
- Create dedicated couples booking view in admin panel
- Show both services clearly
- Display both staff members
- Indicate it's a couples booking with special badge/icon

**Files to Modify**:
- `/src/app/admin/bookings/page.tsx`
- `/src/components/admin/booking-list.tsx`

**Priority**: Low (current display is functional)

---

### 3. Booking Conflicts Error Messages

**Current State**:
Generic "room already booked" messages

**Needed Improvements**:
- More specific error messages
- Show what's blocking the time slot
- Suggest alternative times
- Better handling of edge cases

**Priority**: Medium

---

## Lessons Learned

### Database Constraints and Business Logic
- Always consider how database constraints interact with business logic
- Couples/group bookings need special consideration in constraint design
- Test with actual concurrent bookings, not just single bookings

### Error Handling
- Vague error messages make debugging difficult
- Need detailed logging at database level
- Frontend should have better error recovery mechanisms

### Testing Requirements
- Must test couples bookings specifically
- Need to test constraint interactions
- Edge cases: same service for both people, different durations, etc.

---

## Migration History

1. **031**: Initial couples booking implementation (flawed - created conflicts)
2. **032**: Attempted fix with room assignment logic (didn't address constraint)
3. **033**: Added error logging table
4. **034**: Fixed RLS for error logging
5. **035**: Another attempt at fixing room assignment (still had constraint issue)
6. **036**: Comprehensive overhaul with pre-checks (didn't address root cause)
7. **037**: Emergency constraint bypass attempt
8. **038**: **SOLUTION** - Single-slot approach (current working solution)

---

## Monitoring and Prevention

### Key Metrics to Track
- Couples booking success rate
- Error frequency by type
- Room utilization for couples bookings
- Time slots with most conflicts

### Prevention Checklist for New Features
- [ ] Consider database constraints impact
- [ ] Test with concurrent operations
- [ ] Add detailed error logging
- [ ] Create admin tools for debugging
- [ ] Document known limitations
- [ ] Plan for rollback scenarios

---

## Support Information

### For Debugging Couples Bookings
1. Check `/admin/booking-diagnostics` page
2. Look for specific error in `/admin/failed-bookings`
3. Verify migration 038 is applied
4. Check `couples_bookings_view` in database

### Quick Fixes
- If couples booking fails: Ensure migration 038 is applied
- If still failing: Check room availability manually
- Last resort: Book as two separate single bookings

---

Last Updated: January 2025