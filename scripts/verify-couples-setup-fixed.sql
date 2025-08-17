-- Verification Script for Couples Booking Setup (FIXED)
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

-- 4. Check what service_category enum values exist
SELECT 
    'Available service categories:' as check_item,
    enumlabel as category_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_category'
ORDER BY enumsortorder;

-- 5. Check room capacities
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

-- 6. Check for any existing couples bookings
SELECT 
    'Existing couples bookings:' as check_item,
    COUNT(*) as total_couples_bookings,
    COUNT(DISTINCT booking_group_id) as unique_couples_groups
FROM bookings
WHERE booking_type = 'couple';

-- 7. Check services (without using enum values directly)
SELECT 
    'Services suitable for couples testing:' as check_item,
    id,
    name,
    category::text as category_text,
    duration,
    price,
    is_couples_service,
    requires_room_3
FROM services
WHERE is_active = true
AND (
    name ILIKE '%facial%'
    OR name ILIKE '%vajacial%' 
    OR name ILIKE '%brazilian%'
    OR name ILIKE '%cleansing%'
    OR name ILIKE '%deep%'
    OR name ILIKE '%special%'
    OR name ILIKE '%wax%'
)
ORDER BY category::text, name
LIMIT 20;

-- 8. Check all service categories and their services
SELECT 
    'All service categories and counts:' as check_item,
    category::text as category_name,
    COUNT(*) as service_count
FROM services
WHERE is_active = true
GROUP BY category
ORDER BY category::text;

-- 9. Check staff availability
SELECT 
    'Active staff members:' as check_item,
    id,
    name,
    array_to_string(capabilities, ', ') as capabilities_list
FROM staff
WHERE is_active = true
ORDER BY name;

-- 10. Show exact service IDs for testing
SELECT 
    'Exact service IDs for Deep Cleansing Facial and Vajacial:' as check_item,
    id as service_id,
    name as service_name,
    category::text as category
FROM services
WHERE is_active = true
AND (
    name ILIKE '%deep%cleansing%facial%'
    OR name ILIKE '%vajacial%'
    OR (name ILIKE '%vajacial%' AND name ILIKE '%brazilian%')
)
ORDER BY name;