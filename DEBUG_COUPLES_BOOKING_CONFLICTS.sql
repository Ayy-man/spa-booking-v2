-- ============================================================================
-- DEBUG COUPLES BOOKING CONFLICTS
-- ============================================================================
-- Run these queries in your Supabase SQL Editor to identify the exact issue

-- STEP 1: Check what bookings exist for August 13, 2025 around 15:15 (3:15 PM)
-- Replace the date and time with your actual booking attempt
SELECT 
    b.id as booking_id,
    b.staff_id,
    s.name as staff_name,
    b.service_id,
    srv.name as service_name,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.status,
    b.booking_type,
    -- Calculate if this booking would conflict with 15:15 start time
    CASE 
        WHEN (b.start_time - INTERVAL '15 minutes' < '15:15'::time + INTERVAL '60 minutes' + INTERVAL '15 minutes')
         AND (b.end_time + INTERVAL '15 minutes' > '15:15'::time - INTERVAL '15 minutes')
        THEN 'CONFLICTS with 15:15 booking'
        ELSE 'No conflict'
    END as conflict_status
FROM bookings b
JOIN staff s ON s.id = b.staff_id  
JOIN services srv ON srv.id = b.service_id
WHERE b.appointment_date = '2025-08-13'  -- Your booking date
  AND b.status != 'cancelled'
ORDER BY b.start_time, s.name;

-- STEP 2: Check all active staff and their availability on the date
SELECT 
    s.id,
    s.name,
    s.work_days,
    s.is_active,
    -- Check if Wednesday (day 3) is in work_days array
    CASE 
        WHEN 3 = ANY(s.work_days) THEN 'Works Wednesdays'
        ELSE 'Does NOT work Wednesdays'
    END as wednesday_availability,
    -- Count existing bookings on this date
    (SELECT count(*) 
     FROM bookings b 
     WHERE b.staff_id = s.id 
       AND b.appointment_date = '2025-08-13' 
       AND b.status != 'cancelled'
    ) as bookings_count,
    -- List the times they're booked
    (SELECT string_agg(b.start_time::text || '-' || b.end_time::text, ', ')
     FROM bookings b 
     WHERE b.staff_id = s.id 
       AND b.appointment_date = '2025-08-13' 
       AND b.status != 'cancelled'
    ) as booked_times
FROM staff s
WHERE s.is_active = true
ORDER BY s.name;

-- STEP 3: Check if couples rooms (Room 2 and 3) are available at 15:15
SELECT 
    r.id,
    r.name,
    r.capacity,
    -- Count existing bookings in this room at the target time
    (SELECT count(*) 
     FROM bookings b 
     WHERE b.room_id = r.id 
       AND b.appointment_date = '2025-08-13' 
       AND b.status != 'cancelled'
       AND (
           (b.start_time - INTERVAL '15 minutes' < '15:15'::time + INTERVAL '60 minutes' + INTERVAL '15 minutes')
           AND (b.end_time + INTERVAL '15 minutes' > '15:15'::time - INTERVAL '15 minutes')
       )
    ) as conflicting_bookings,
    -- List what's booked in this room
    (SELECT string_agg(b.start_time::text || '-' || b.end_time::text || ' (Staff: ' || s.name || ')', ', ')
     FROM bookings b 
     JOIN staff s ON s.id = b.staff_id
     WHERE b.room_id = r.id 
       AND b.appointment_date = '2025-08-13' 
       AND b.status != 'cancelled'
    ) as room_bookings
FROM rooms r
WHERE r.id IN (2, 3)  -- Couples rooms only
ORDER BY r.id;

-- STEP 4: Simulate the exact staff conflict check from the couples booking function
-- Replace 'YOUR_PRIMARY_STAFF_ID' and 'YOUR_SECONDARY_STAFF_ID' with the actual staff IDs being passed

-- Example staff conflict check (update the staff IDs)
SELECT 
    'Primary Staff Conflict Check' as check_type,
    EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = 'YOUR_PRIMARY_STAFF_ID'  -- Replace with actual staff ID
            AND b.appointment_date = '2025-08-13' 
            AND b.status != 'cancelled'
            AND (
                (b.start_time - INTERVAL '15 minutes' < '15:15'::time + INTERVAL '60 minutes' + INTERVAL '15 minutes')
                AND (b.end_time + INTERVAL '15 minutes' > '15:15'::time - INTERVAL '15 minutes')
            )
    ) as has_conflict;

-- STEP 5: Check the browser console logs
-- Look for these log messages in your browser:
-- [CouplesBooking] Resolved staff IDs: { original: {...}, resolved: {...} }
-- [CouplesBooking] Calling database function with: { primary_staff_id: "...", secondary_staff_id: "..." }

-- Once you have the actual staff IDs from the console, replace them in STEP 4 above

-- COMMON SOLUTIONS:
-- 1. If both staff IDs are the same -> You need to select different staff for couples booking
-- 2. If staff work_days doesn't include 3 (Wednesday) -> Choose staff who work Wednesdays  
-- 3. If staff have conflicting bookings -> Choose a different time slot
-- 4. If no couples rooms available -> Choose a different time when Room 2 or 3 is free