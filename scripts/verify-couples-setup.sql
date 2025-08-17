-- Verification Script for Couples Booking Setup
-- Run this to check the current state of your database

-- 1. Check if the function exists
SELECT 
    'Checking for process_couples_booking_v2 function...' as check_item,
    EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'process_couples_booking_v2'
    ) as exists;

-- 2. Check booking_group_id column exists
SELECT 
    'Checking for booking_group_id column...' as check_item,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_group_id'
    ) as exists;

-- 3. Check booking_type column exists
SELECT 
    'Checking for booking_type column...' as check_item,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_type'
    ) as exists;

-- 4. Check room capacities
SELECT 
    'Room capacities:' as check_item,
    id as room_id, 
    name as room_name, 
    capacity,
    CASE 
        WHEN capacity >= 2 THEN 'Can handle couples'
        ELSE 'Single only'
    END as couples_capable
FROM rooms
WHERE is_active = true
ORDER BY id;

-- 5. Check for any existing couples bookings
SELECT 
    'Existing couples bookings:' as check_item,
    COUNT(*) as total_couples_bookings,
    COUNT(DISTINCT booking_group_id) as unique_couples_groups
FROM bookings
WHERE booking_type = 'couple';

-- 6. Check services that might be used for couples
SELECT 
    'Services suitable for couples testing:' as check_item,
    id,
    name,
    category,
    duration,
    price,
    is_couples_service,
    requires_room_3
FROM services
WHERE is_active = true
AND (
    category IN ('facial', 'special', 'body_treatment')
    OR name ILIKE '%facial%'
    OR name ILIKE '%vajacial%' 
    OR name ILIKE '%brazilian%'
    OR name ILIKE '%cleansing%'
)
ORDER BY category, name
LIMIT 20;

-- 7. Check staff availability
SELECT 
    'Active staff members:' as check_item,
    id,
    name,
    capabilities
FROM staff
WHERE is_active = true
ORDER BY name;