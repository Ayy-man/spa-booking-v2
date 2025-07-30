-- =====================================================
-- TEST SCRIPT: Couples Booking Functionality
-- =====================================================
-- This script tests the new couples booking features
-- Run this after applying the migration
-- =====================================================

-- 1. Test is_couples_service flag
SELECT 
    id, 
    name, 
    requires_couples_room, 
    is_couples_service,
    category
FROM services 
WHERE requires_couples_room = true OR is_couples_service = true
ORDER BY category, name;

-- 2. Test room assignment for couples services
-- Should prefer Room 3, then Room 2
SELECT * FROM assign_optimal_room(
    (SELECT id FROM services WHERE name = 'Couples Relaxation Massage' LIMIT 1)::TEXT,
    NULL,
    CURRENT_DATE + 1,
    '14:00'
);

-- 3. Test creating a couples booking
-- First, let's see what this returns
DO $$
DECLARE
    v_result RECORD;
    v_service_id UUID;
BEGIN
    -- Get a couples service
    SELECT id INTO v_service_id 
    FROM services 
    WHERE name = 'Couples Relaxation Massage' 
    LIMIT 1;
    
    -- Try to create a couples booking
    SELECT * INTO v_result
    FROM process_couples_booking(
        v_service_id,
        'John Doe',
        'john.doe@example.com',
        '555-0001',
        'Jane Doe', 
        'jane.doe@example.com',
        '555-0002',
        CURRENT_DATE + 7,
        '14:00'::TIME
    );
    
    RAISE NOTICE 'Couples Booking Result:';
    RAISE NOTICE 'Group ID: %, Success: %, Message: %', 
        v_result.booking_group_id, 
        v_result.success, 
        v_result.error_message;
END $$;

-- 4. View couples bookings
SELECT 
    b.booking_group_id,
    b.booking_type,
    b.customer_name,
    s.name as service_name,
    st.name as staff_name,
    r.name as room_name,
    b.booking_date,
    b.start_time,
    b.total_price
FROM bookings b
JOIN services s ON s.id = b.service_id
JOIN staff st ON st.id = b.staff_id
JOIN rooms r ON r.id = b.room_id
WHERE b.booking_group_id IS NOT NULL
ORDER BY b.booking_group_id, b.created_at;

-- 5. Test room capacity validation
-- This should fail because Room 1 has capacity 1
DO $$
DECLARE
    v_result RECORD;
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id 
    FROM services 
    WHERE name = 'Couples Spa Package' 
    LIMIT 1;
    
    -- Try to book a couples service in a single room
    SELECT * INTO v_result
    FROM process_booking(
        v_service_id,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, -- Staff 1
        '11111111-1111-1111-1111-111111111111'::UUID, -- Room 1 (capacity 1)
        'Test Customer',
        'test@example.com',
        '555-1234',
        CURRENT_DATE + 7,
        '15:00'::TIME,
        NULL,
        NULL,
        'couple'
    );
    
    RAISE NOTICE 'Single Room Couples Booking: Success: %, Message: %', 
        v_result.success, 
        v_result.error_message;
END $$;

-- 6. View the couples booking availability
SELECT * FROM couples_booking_availability
WHERE booking_date >= CURRENT_DATE;

-- 7. Test getting couples booking details
-- Replace with actual booking_group_id from test #3
/*
SELECT * FROM get_couples_booking_details('YOUR_GROUP_ID_HERE'::UUID);
*/

-- 8. Check available time slots for couples services
SELECT DISTINCT
    available_time,
    COUNT(DISTINCT available_staff_id) as available_staff_count,
    COUNT(DISTINCT available_room_id) as available_room_count
FROM get_available_time_slots(
    CURRENT_DATE + 1,
    (SELECT id FROM services WHERE name = 'Couples Relaxation Massage' LIMIT 1)::TEXT
)
GROUP BY available_time
HAVING COUNT(DISTINCT available_staff_id) >= 2  -- Need at least 2 staff
ORDER BY available_time;

-- 9. Summary of couples-capable rooms
SELECT 
    r.id,
    r.name,
    r.room_number,
    r.capacity,
    r.is_couples_room,
    r.has_body_scrub_equipment,
    CASE 
        WHEN r.capacity >= 2 THEN 'Can handle couples'
        ELSE 'Single person only'
    END as couples_capability
FROM rooms r
WHERE r.is_active = true
ORDER BY r.room_number;