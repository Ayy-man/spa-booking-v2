-- Debug booking conflicts - check existing bookings for Wednesday
-- Run this to see what bookings exist that might conflict

-- 1. Check all active bookings for this week
SELECT 
    b.id,
    b.staff_id,
    b.room_id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.status,
    b.service_id,
    c.first_name,
    c.last_name
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE appointment_date >= CURRENT_DATE 
  AND appointment_date <= CURRENT_DATE + INTERVAL '7 days'
  AND status != 'cancelled'
ORDER BY appointment_date, start_time;

-- 2. Check staff availability on Wednesdays
SELECT 
    id,
    name,
    work_days,
    is_active,
    capabilities
FROM staff 
WHERE is_active = true
ORDER BY name;

-- 3. Check for any bookings on upcoming Wednesday
SELECT 
    b.id,
    b.staff_id,
    b.room_id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.status,
    b.service_id,
    c.first_name,
    c.last_name,
    EXTRACT(dow FROM appointment_date) as day_of_week
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE EXTRACT(dow FROM appointment_date) = 3  -- Wednesday = 3
  AND appointment_date >= CURRENT_DATE
  AND status != 'cancelled'
ORDER BY appointment_date, start_time;

-- 4. Check if there are ANY bookings at all
SELECT COUNT(*) as total_bookings FROM bookings;

-- 5. Check all bookings regardless of date
SELECT 
    id,
    staff_id,
    room_id,
    appointment_date,
    start_time,
    end_time,
    status,
    service_id
FROM bookings 
ORDER BY appointment_date DESC, start_time DESC
LIMIT 10;

-- 6. Test the validation function manually for Robyn on any Wednesday
-- This will help us see what the validation function returns
SELECT check_booking_conflicts(
    'robyn_camacho',      -- Robyn's staff ID
    3,                    -- Room 3 (her default)
    '2025-01-08'::DATE,   -- Next Wednesday
    '10:00'::TIME,        -- 10 AM start
    '11:00'::TIME         -- 11 AM end
);