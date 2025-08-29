# 15-Minute Buffer System Implementation

## Overview
The spa booking system now includes automatic 15-minute buffers before and after all appointments. This ensures proper preparation time for technicians and prevents overlapping bookings.

## Database Changes

### New Columns
Added to the `bookings` table:
- `buffer_start` (TIME) - Start time of the buffer period (15 minutes before appointment)
- `buffer_end` (TIME) - End time of the buffer period (15 minutes after appointment)

### Migration
Run the migration script: `supabase/migrations/20250828_add_buffer_columns.sql`

## Implementation Details

### 1. Booking Creation
When a booking is created (`/src/lib/supabase.ts`):
- Buffer times are automatically calculated
- `buffer_start = start_time - 15 minutes`
- `buffer_end = end_time + 15 minutes`
- Buffers are clamped to business hours (9:00 AM - 8:00 PM)

### 2. Availability Checking
The booking widget (`/src/app/booking/date-time/page.tsx`):
- Checks for conflicts with existing buffer zones
- No time slots are offered that would overlap with buffer periods
- Uses stored buffer times from database when available
- Falls back to calculated buffers for legacy bookings

### 3. Visual Display

#### Room Timeline (`/src/components/admin/room-timeline.tsx`)
- Buffer zones display with amber background (`bg-amber-50/60`)
- "Buffer" text indicator in buffer slots
- Legend includes "BUFFER ZONE (15 MIN)" badge

#### Staff Schedule View (`/src/components/admin/StaffScheduleView.tsx`)
- Buffer zones display with amber background
- "Buffer" text indicator in buffer slots
- Prevents quick-add bookings in buffer zones

## Business Rules

### Buffer Constraints
1. **Duration**: Always 15 minutes before and after appointments
2. **Business Hours**: Buffers are clamped to 9:00 AM - 8:00 PM
3. **Overlap Prevention**: No bookings allowed in buffer zones
4. **Room Availability**: Buffer zones block room availability
5. **Staff Availability**: Buffer zones block staff availability

### Edge Cases
- **First Appointment (9:00 AM)**: Buffer starts at 9:00 AM (not 8:45 AM)
- **Last Appointment**: Buffer ends at 8:00 PM maximum
- **Back-to-Back Bookings**: Not possible due to buffer enforcement

## Testing Scenarios

### Test Case 1: Standard Booking
- Book 60-minute massage at 10:00 AM
- Buffer zone: 9:45 AM - 10:00 AM (before)
- Buffer zone: 11:00 AM - 11:15 AM (after)
- Next available slot: 11:15 AM or later

### Test Case 2: Early Morning Booking
- Book service at 9:00 AM
- Buffer zone: 9:00 AM (clamped, no before buffer)
- Buffer zone: After appointment end + 15 minutes

### Test Case 3: Couples Booking
- Both appointments get individual buffers
- Room and staff availability checked for both

## User Experience

### For Customers
- Available time slots automatically exclude buffer periods
- Cleaner scheduling with guaranteed prep time
- Better service quality due to proper transition time

### For Staff
- Visual buffer indicators in schedule views
- Clear separation between appointments
- Time for room preparation and cleanup
- Reduced stress from back-to-back bookings

## Migration of Existing Data
The migration script automatically:
1. Adds buffer columns to existing bookings
2. Calculates buffer times based on existing start/end times
3. Respects business hour boundaries
4. Creates indexes for performance

## Performance Considerations
- Indexed columns for fast buffer overlap queries
- Efficient conflict checking in availability functions
- Minimal overhead in booking creation process

## Future Enhancements
Potential improvements:
- Configurable buffer duration per service type
- Different buffer times for different room types
- Staff-specific buffer preferences
- Buffer override for special cases