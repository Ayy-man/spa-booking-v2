-- Apply Couples Booking Fix
-- Run this script in Supabase SQL Editor to fix the couples booking room assignment issue

-- First, check if the function exists and what version
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'process_couples_booking_v2'
LIMIT 1;

-- Apply the migration (copy the contents of 031_fix_couples_booking_room_logic.sql here)
-- The migration will:
-- 1. Drop the old function if it exists
-- 2. Create the new improved function
-- 3. Grant necessary permissions

-- After applying, test with this query
SELECT * FROM process_couples_booking_v2(
    'facial-deep-cleansing'::TEXT,  -- Replace with actual service ID
    'special-vajacial-basic'::TEXT,  -- Replace with actual service ID  
    'any'::TEXT,  -- Primary staff
    'any'::TEXT,  -- Secondary staff
    'Test Customer',
    'test@example.com',
    '555-1234',
    '2025-08-22'::DATE,
    '10:15'::TIME,
    'Test couples booking'
);

-- Verify room assignments are working
SELECT 
    b.id,
    b.booking_group_id,
    b.appointment_date,
    b.start_time,
    s.name as service,
    st.name as staff,
    r.name as room,
    b.booking_type
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN staff st ON b.staff_id = st.id
JOIN rooms r ON b.room_id = r.id
WHERE b.booking_type = 'couple'
AND b.appointment_date >= CURRENT_DATE
ORDER BY b.appointment_date DESC, b.start_time DESC
LIMIT 10;