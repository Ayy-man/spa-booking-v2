-- Debug script to check what's blocking the rooms
-- Run this to see why rooms aren't available

-- 1. Check what bookings exist on August 22, 2025
SELECT 
    'Bookings on August 22, 2025:' as check_item,
    b.id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.room_id,
    r.name as room_name,
    s.name as service_name,
    st.name as staff_name,
    b.status,
    b.booking_type,
    b.booking_group_id
FROM bookings b
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN staff st ON b.staff_id = st.id
WHERE b.appointment_date = '2025-08-22'
AND b.status != 'cancelled'
ORDER BY b.room_id, b.start_time;

-- 2. Specifically check Room 2 and 3 availability at 10:15
SELECT 
    'Room 2 & 3 at 10:15 on Aug 22:' as check_item,
    b.id,
    b.room_id,
    b.start_time,
    b.end_time,
    b.status,
    CASE 
        WHEN b.start_time < '10:15'::TIME AND b.end_time > '10:15'::TIME THEN 'BLOCKS 10:15'
        WHEN b.start_time < '11:15'::TIME AND b.end_time > '10:15'::TIME THEN 'OVERLAPS WITH 10:15'
        ELSE 'No conflict'
    END as conflict_status
FROM bookings b
WHERE b.appointment_date = '2025-08-22'
AND b.room_id IN (2, 3)
AND b.status != 'cancelled'
AND (
    (b.start_time < '11:15'::TIME AND b.end_time > '10:15'::TIME)
)
ORDER BY b.room_id, b.start_time;

-- 3. Check if there are ANY bookings in the system for that date
SELECT 
    'Total bookings on Aug 22, 2025:' as check_item,
    COUNT(*) as total_bookings,
    COUNT(DISTINCT room_id) as rooms_used,
    COUNT(CASE WHEN room_id = 2 THEN 1 END) as room_2_bookings,
    COUNT(CASE WHEN room_id = 3 THEN 1 END) as room_3_bookings
FROM bookings
WHERE appointment_date = '2025-08-22'
AND status != 'cancelled';

-- 4. Check all bookings between 9:00 and 12:00 on that date
SELECT 
    'Morning bookings (9am-12pm) on Aug 22:' as check_item,
    b.room_id,
    b.start_time,
    b.end_time,
    s.name as service,
    b.status
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
WHERE b.appointment_date = '2025-08-22'
AND b.start_time >= '09:00'::TIME
AND b.start_time <= '12:00'::TIME
AND b.status != 'cancelled'
ORDER BY b.room_id, b.start_time;

-- 5. Try to manually check if rooms are available
WITH time_check AS (
    SELECT 
        '2025-08-22'::DATE as check_date,
        '10:15'::TIME as start_time,
        '11:15'::TIME as end_time -- Assuming 60 minute service
)
SELECT 
    'Manual availability check:' as check_item,
    r.id as room_id,
    r.name as room_name,
    r.capacity,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id
            AND b.appointment_date = tc.check_date
            AND b.status != 'cancelled'
            AND (b.start_time < tc.end_time AND b.end_time > tc.start_time)
        ) THEN 'OCCUPIED'
        ELSE 'AVAILABLE'
    END as availability
FROM rooms r
CROSS JOIN time_check tc
WHERE r.id IN (2, 3)
AND r.is_active = true;

-- 6. Check for any weird time overlaps or data issues
SELECT 
    'Potential data issues:' as check_item,
    b.id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    CASE 
        WHEN b.end_time <= b.start_time THEN 'ERROR: End time before start time'
        WHEN b.end_time > '23:59'::TIME THEN 'ERROR: End time past midnight'
        ELSE 'OK'
    END as time_check,
    b.room_id,
    b.status
FROM bookings b
WHERE b.appointment_date = '2025-08-22'
AND (
    b.end_time <= b.start_time 
    OR b.end_time > '23:59'::TIME
);

-- 7. Clear test bookings if needed (ONLY uncomment if you want to delete test data)
-- DELETE FROM bookings 
-- WHERE appointment_date = '2025-08-22' 
-- AND (customer_id IN (SELECT id FROM customers WHERE email = 'test@example.com')
--      OR notes LIKE '%test%' OR notes LIKE '%Test%');

-- 8. Check the actual service durations to understand timing
SELECT 
    'Service durations for couples booking:' as check_item,
    id,
    name,
    duration,
    price
FROM services
WHERE id IN ('deep_cleansing_facial', 'vajacial_brazilian');