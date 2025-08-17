# Couples Booking Architecture Documentation

## Overview

The couples booking system allows two people to book services together in the same room at the same time. Due to database constraints, this is implemented using a **single-slot approach**.

## The Challenge

### Initial Problem
The original implementation tried to create two separate booking records:
```
Booking 1: Customer A | Service: Facial | Room 2 | 3:00-4:00 PM
Booking 2: Customer A | Service: Massage | Room 2 | 3:00-4:00 PM (CONFLICT!)
```

The database has a constraint preventing two bookings in the same room at the same time, causing the second booking to fail with "Room is already booked at this time."

### Root Cause
- Database UNIQUE constraint on (room_id, appointment_date, time_range)
- Constraint doesn't account for couples sharing the same room
- Even with same `booking_group_id`, treated as conflicting bookings

## Current Solution: Single-Slot Architecture

### How It Works
Instead of two bookings, create ONE booking that represents both services:

```sql
Single Booking:
- ID: abc-123
- Customer: John & Jane Doe
- Service: Primary service (for display)
- Room: 2
- Time: 3:00-4:00 PM
- Total Price: $180 (combined)
- Internal Notes: {
    "is_couples": true,
    "services": [
      {"service": "Facial", "staff": "Anna", "price": 90},
      {"service": "Massage", "staff": "Beth", "price": 90}
    ]
  }
```

### Implementation Details

#### Database Function: `process_couples_booking_single_slot`
Located in: `/supabase/migrations/038_couples_single_slot_fix.sql`

**Key Features:**
1. Creates single booking record
2. Stores both services in `internal_notes` as JSON
3. Uses longer duration of the two services
4. Combines prices
5. Prefers Room 3, falls back to Room 2

#### Data Structure
```javascript
{
  // Main booking fields
  service_id: "primary-service-id",    // Primary service
  staff_id: "primary-staff-id",        // Primary staff
  total_price: 180,                    // Combined price
  booking_type: "couple",
  
  // Both services stored in internal_notes
  internal_notes: {
    is_couples: true,
    services: [
      {
        service_id: "facial-001",
        service_name: "Deep Cleansing Facial",
        staff_id: "staff-anna",
        duration: 60,
        price: 90
      },
      {
        service_id: "massage-001",
        service_name: "Swedish Massage",
        staff_id: "staff-beth",
        duration: 60,
        price: 90
      }
    ]
  }
}
```

## Room Assignment Logic

### Priority Order
1. **Room 3** - First choice for couples (largest room)
2. **Room 2** - Second choice if Room 3 unavailable
3. **Room 1** - Not used for couples (single-person room)

### Special Cases
- Body scrubs MUST use Room 3 (equipment requirement)
- If body scrub + another service: Must use Room 3
- If Room 3 and 2 both unavailable: Booking fails

## Frontend Integration

### Booking Flow
1. Customer selects "Couples" option
2. Chooses two services (can be same or different)
3. Selects date/time
4. Chooses staff (can be same or different)
5. System creates single booking via `process_couples_booking_single_slot`

### Display in Admin Panel
- Shows as single booking entry
- Notes field contains both services
- Total price reflects combined cost
- Can be identified by `booking_type = 'couple'`

## Database Views

### couples_bookings_view
Extracts couples booking details for reporting:
```sql
SELECT 
  id,
  customer_name,
  appointment_date,
  start_time,
  room_name,
  service_1,  -- Extracted from JSON
  staff_1,    -- Extracted from JSON
  service_2,  -- Extracted from JSON
  staff_2,    -- Extracted from JSON
  total_price
FROM couples_bookings_view;
```

## Advantages of Single-Slot Approach

1. **No Constraint Conflicts**: Single booking can't conflict with itself
2. **Simpler Logic**: One transaction, one record
3. **Accurate Availability**: Room shows as occupied for the duration
4. **Backward Compatible**: Works with existing admin panels
5. **Clear Billing**: One charge for the couple

## Limitations

1. **Individual Tracking**: Harder to track individual service metrics
2. **Staff Reports**: Both staff members not directly linked in main record
3. **Cancellations**: Can't cancel one person's service independently
4. **Modifications**: Changing one service requires updating entire booking

## Future Improvements

### Option 1: Modify Database Constraint
```sql
-- Allow multiple bookings with same booking_group_id
CREATE UNIQUE INDEX unique_room_time_except_groups 
ON bookings(room_id, appointment_date, start_time)
WHERE booking_group_id IS NULL;
```

### Option 2: Separate Couples Table
Create dedicated `couples_bookings` table with different constraints

### Option 3: Booking Slots System
Implement time-slot reservation system independent of bookings

## Migration Path

### Current State (v038)
- Single-slot implementation
- JSON storage for service details
- Functional but with limitations

### Future State
1. Modify database constraints to allow grouped bookings
2. Migrate existing couples bookings to new structure
3. Update frontend to handle both approaches
4. Maintain backward compatibility

## API Endpoints

### Create Couples Booking
```typescript
POST /api/bookings/couples
{
  primary_service_id: string,
  secondary_service_id: string,
  primary_staff_id: string,
  secondary_staff_id: string,
  customer_info: {...},
  appointment_date: string,
  start_time: string
}
```

### Get Couples Booking Details
```typescript
GET /api/bookings/couples/:booking_group_id
Returns: {
  bookings: [...],
  services: [...],
  total_price: number
}
```

## Error Handling

### Common Errors
1. **No rooms available**: Both Room 3 and 2 are booked
2. **Staff unavailable**: Selected staff already booked
3. **Service not found**: Invalid service ID
4. **Time slot invalid**: Outside business hours

### Error Recovery
- Retry with exponential backoff
- Suggest alternative times
- Fall back to emergency booking function
- Log all failures for debugging

## Testing Checklist

- [ ] Book same service for both people
- [ ] Book different services with different durations
- [ ] Book when Room 3 is occupied (should use Room 2)
- [ ] Book when both rooms occupied (should fail gracefully)
- [ ] Verify admin panel display
- [ ] Test cancellation
- [ ] Test modification
- [ ] Verify pricing calculation
- [ ] Check staff availability validation
- [ ] Test with body scrub service (Room 3 requirement)

## Related Files

- `/supabase/migrations/038_couples_single_slot_fix.sql` - Current implementation
- `/src/lib/supabase.ts` - Frontend integration
- `/src/app/booking/confirmation-couples/page.tsx` - Booking confirmation
- `/docs/KNOWN_ISSUES_AND_FIXES.md` - Issue documentation

---

Last Updated: January 2025
Status: Production (with single-slot workaround)