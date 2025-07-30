-- =====================================================
-- BOOKING SYSTEM VERIFICATION SCRIPT
-- Run these queries in Supabase SQL editor to verify
-- =====================================================

-- 1. Check that all functions are installed
SELECT 
  proname as function_name,
  pronargs as num_arguments
FROM pg_proc 
WHERE proname IN (
  'get_available_time_slots',
  'process_booking',
  'assign_optimal_room',
  'check_staff_capability',
  'get_staff_schedule'
)
ORDER BY proname;

-- Expected: Should show all 5 functions

-- 2. Check RLS policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services', 'staff', 'rooms')
ORDER BY tablename, policyname;

-- Expected: Should show policies allowing anonymous access

-- 3. Test getting available time slots for tomorrow
SELECT * FROM get_available_time_slots(
  CURRENT_DATE + INTERVAL '1 day',
  NULL,
  NULL
) 
LIMIT 10;

-- Expected: Should return available time slots with staff and room combinations

-- 4. Test room assignment for a facial service
SELECT * FROM assign_optimal_room(
  'basic_facial',  -- or any facial service ID from your data
  'robyn',         -- or any staff ID
  CURRENT_DATE + INTERVAL '1 day',
  '10:00'
);

-- Expected: Should return a room assignment with reason

-- 5. Test staff capability check
SELECT 
  s.id as staff_id,
  s.name as staff_name,
  srv.id as service_id,
  srv.name as service_name,
  check_staff_capability(s.id, srv.id) as can_perform
FROM staff s
CROSS JOIN services srv
WHERE s.is_active = true
  AND srv.id IN ('basic_facial', 'swedish_massage', 'body_scrub_treatment')
ORDER BY s.name, srv.name;

-- Expected: Should show which staff can perform which services

-- 6. Check existing bookings
SELECT 
  b.id,
  b.appointment_date,
  b.start_time,
  b.end_time,
  s.name as service,
  st.name as staff,
  r.name as room,
  b.status
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN staff st ON b.staff_id = st.id
JOIN rooms r ON b.room_id = r.id
ORDER BY b.appointment_date DESC, b.start_time DESC
LIMIT 10;

-- Expected: Should show any existing bookings

-- 7. Test creating a booking (will rollback)
BEGIN;

-- First, create a test customer
INSERT INTO customers (first_name, last_name, email, phone)
VALUES ('Test', 'Customer', 'test_verify@example.com', '555-9999')
ON CONFLICT (email) DO NOTHING;

-- Try to create a test booking using the function
SELECT * FROM process_booking(
  'basic_facial',                           -- service_id
  'robyn',                                  -- staff_id
  1,                                        -- room_id
  'Test Verification',                      -- customer_name
  'test_verify@example.com',               -- customer_email
  CURRENT_DATE + INTERVAL '1 day',         -- booking_date
  '14:00',                                 -- start_time
  '555-9999',                              -- phone
  'This is a test booking for verification' -- special_requests
);

-- Check if it was created
SELECT * FROM bookings 
WHERE notes = 'This is a test booking for verification';

-- Rollback the test
ROLLBACK;

-- Expected: Should successfully create and then rollback the test booking

-- 8. Verify service categories and room capabilities
SELECT 
  s.category,
  COUNT(*) as service_count,
  ARRAY_AGG(DISTINCT r.name) as rooms_that_support
FROM services s
CROSS JOIN rooms r
WHERE s.is_active = true
  AND r.is_active = true
  AND s.category = ANY(r.capabilities)
GROUP BY s.category
ORDER BY s.category;

-- Expected: Should show which rooms support which service categories

-- 9. Check staff availability for the week
WITH next_week AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    INTERVAL '1 day'
  )::date as check_date
)
SELECT 
  nw.check_date,
  TO_CHAR(nw.check_date, 'Day') as day_name,
  EXTRACT(DOW FROM nw.check_date) as day_number,
  STRING_AGG(
    CASE 
      WHEN EXTRACT(DOW FROM nw.check_date) = ANY(s.work_days) 
      THEN s.name 
      ELSE NULL 
    END, ', '
  ) as available_staff
FROM next_week nw
CROSS JOIN staff s
WHERE s.is_active = true
GROUP BY nw.check_date
ORDER BY nw.check_date;

-- Expected: Should show which staff work on which days

-- 10. Summary check
SELECT 
  'Services' as data_type, COUNT(*) as count FROM services WHERE is_active = true
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff WHERE is_active = true
UNION ALL
SELECT 'Rooms', COUNT(*) FROM rooms WHERE is_active = true
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings WHERE status = 'confirmed'
UNION ALL
SELECT 'Functions', COUNT(*) FROM pg_proc WHERE proname IN (
  'get_available_time_slots', 'process_booking', 'assign_optimal_room',
  'check_staff_capability', 'get_staff_schedule'
);

-- Expected: Should show counts of all major entities

-- =====================================================
-- If all queries run successfully, your booking system
-- is properly configured and ready to use!
-- =====================================================