# Couples Booking System Guide

## Overview

The medical spa database now supports comprehensive couples bookings, allowing two customers to book services together in the same room with coordinated staff assignments.

## Database Schema Changes

### 1. Services Table
- **`is_couples_service`** (BOOLEAN): Identifies services designed for couples
- **`requires_couples_room`** (BOOLEAN): Existing field that indicates room capacity requirements

### 2. Bookings Table  
- **`booking_group_id`** (UUID): Links related bookings together
- **`booking_type`** (VARCHAR): Identifies booking type: 'single', 'couple', or 'group'

### 3. Room Requirements
- Room 1: Capacity 1 (cannot handle couples)
- Room 2: Capacity 2 (couples room)
- Room 3: Capacity 2 (couples room with body scrub equipment)

## Key Functions

### 1. `process_couples_booking_v2()`
Creates two linked bookings for couples services with improved room assignment logic.

**Parameters:**
- `p_service_id`: The couples service to book
- `p_customer1_name/email/phone`: First customer details
- `p_customer2_name/email/phone`: Second customer details
- `p_booking_date`: Date of the appointment
- `p_start_time`: Start time
- `p_staff1_id` (optional): Specific staff for customer 1
- `p_staff2_id` (optional): Specific staff for customer 2
- `p_special_requests` (optional): Any special requirements

**Returns:**
- `booking_group_id`: UUID linking both bookings
- `booking1_id`: First booking ID
- `booking2_id`: Second booking ID
- `room_id`: Assigned room
- `success`: Boolean success indicator
- `error_message`: Error details if failed

### 2. Room Assignment Logic for Couples Bookings

**Updated Room Assignment Priority (v2):**
1. **Mixed Service Types or Special Equipment Needed:**
   - Primary choice: Room 3 (has all equipment, capacity 2)
   - Fallback: Room 2 (if Room 3 is occupied)
   
2. **Same Service Types (no special equipment):**
   - Primary choice: Room 2 (standard couples room)
   - Fallback: Room 3 (if Room 2 is occupied)
   
3. **Special Equipment Requirements:**
   - Body scrubs → Room 3 (required equipment)
   - Brazilian wax → Room 3 preferred (specialized setup)
   - Vajacial services → Room 3 preferred (equipment needs)
   
**Important:** Both people in a couples booking always share the same room for a synchronized experience.

### 3. `get_couples_booking_details()`
Retrieves all bookings in a couples group.

**Usage:**
```sql
SELECT * FROM get_couples_booking_details('booking_group_id'::UUID);
```

### 4. `cancel_couples_booking()`
Cancels all bookings in a couples group atomically.

**Usage:**
```sql
SELECT * FROM cancel_couples_booking('booking_group_id'::UUID);
```

## Implementation Examples

### Creating a Couples Booking

```sql
-- Book a couples massage
SELECT * FROM process_couples_booking(
    'service-uuid-here'::UUID,           -- Couples service ID
    'John Smith',                        -- Customer 1 name
    'john.smith@email.com',             -- Customer 1 email
    '555-0001',                         -- Customer 1 phone
    'Jane Smith',                       -- Customer 2 name
    'jane.smith@email.com',             -- Customer 2 email
    '555-0002',                         -- Customer 2 phone
    '2024-02-14'::DATE,                 -- Valentine's Day
    '14:00'::TIME,                      -- 2 PM
    NULL,                               -- Auto-assign staff 1
    NULL,                               -- Auto-assign staff 2
    'Anniversary celebration'            -- Special request
);
```

### Creating Individual Bookings with Couple Type

```sql
-- For existing process_booking function
SELECT * FROM process_booking(
    'service-id'::UUID,
    'staff-id'::UUID,
    'room-id'::UUID,
    'Customer Name',
    'email@example.com',
    'phone',
    'booking-date'::DATE,
    'start-time'::TIME,
    'special requests',
    'group-id'::UUID,    -- Link to other booking
    'couple'             -- Booking type
);
```

### Viewing Couples Bookings

```sql
-- View all couples bookings
SELECT 
    b.booking_group_id,
    b.customer_name,
    s.name as service,
    r.name as room,
    b.booking_date,
    b.start_time
FROM bookings b
JOIN services s ON s.id = b.service_id
JOIN rooms r ON r.id = b.room_id
WHERE b.booking_type = 'couple'
ORDER BY b.booking_group_id, b.created_at;
```

## Business Rules

1. **Room Capacity**: Couples bookings require rooms with capacity ≥ 2
2. **Staff Assignment**: Cannot assign the same staff member to both customers
3. **Pricing**: Each booking shows half the service price (total remains the same)
4. **Cancellation**: Cancelling one booking in a couple should cancel both
5. **Availability**: System checks that room can accommodate both bookings

## Best Practices

1. **Service Configuration**: Mark services with `is_couples_service = true` for proper identification
2. **Room Setup**: Ensure rooms have correct capacity settings
3. **Staff Scheduling**: Consider having at least 2 staff available for couples services
4. **UI Implementation**: 
   - Show couples services separately in service selection
   - Collect information for both customers
   - Display linked bookings together
   - Implement group cancellation

## Troubleshooting

### Common Issues

1. **"Room is already booked at this time" or "No couples room available"**
   - Both Room 2 and Room 3 are occupied at the selected time
   - Try selecting a different time slot
   - Peak hours (10am-2pm) tend to be busiest
   - For mixed service types (facial + special), Room 3 is prioritized but Room 2 can be used as fallback

2. **"Cannot book the same staff member for both clients"**
   - Assign different staff IDs or leave one NULL for auto-assignment
   - Exception: Same staff can be assigned for massage services

3. **"Service is not configured for couples bookings"**
   - Update service with `is_couples_service = true`
   - Or use `requires_couples_room = true`

4. **"Failed to create primary/secondary booking"**
   - Database constraint violation (check service IDs exist)
   - Staff availability conflict
   - Room capacity issue

### Migration Rollback

If needed, you can rollback the couples booking support:

```sql
-- Remove booking columns
ALTER TABLE bookings 
DROP COLUMN IF EXISTS booking_group_id,
DROP COLUMN IF EXISTS booking_type;

-- Remove service column
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- Drop new functions
DROP FUNCTION IF EXISTS process_couples_booking CASCADE;
DROP FUNCTION IF EXISTS get_couples_booking_details CASCADE;
DROP FUNCTION IF EXISTS cancel_couples_booking CASCADE;
DROP VIEW IF EXISTS couples_booking_availability CASCADE;
```

## Future Enhancements

1. **Group Bookings**: Extend to support more than 2 people
2. **Package Deals**: Special pricing for couples packages
3. **Preferred Pairings**: Save preferred staff pairings for repeat customers
4. **Synchronized Services**: Different services for each person in the couple
5. **Waiting List**: Notify when couples slots become available