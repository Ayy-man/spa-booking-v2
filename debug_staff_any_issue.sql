-- Debug the "Staff ID is required" issue when selecting "Any Available Staff"

-- 1. Check what staff IDs actually exist in database
SELECT id, name, work_days, capabilities, is_active FROM staff ORDER BY name;

-- 2. Check if there's an 'any' staff record that shouldn't be there
SELECT * FROM staff WHERE id = 'any';

-- 3. Test the individual validation functions that should work
SELECT check_staff_availability(
    'robyn_camacho',
    '2025-01-08'::DATE,
    '10:00'::TIME,
    '11:00'::TIME
) as robyn_available;

-- 4. Check the validation trigger
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    prosrc as function_code
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid 
WHERE tgrelid = 'bookings'::regclass;

-- 5. Test inserting a booking manually to see what validation fires
-- (Don't run this - just see the structure)
/*
INSERT INTO bookings (
    customer_id, service_id, staff_id, room_id, 
    appointment_date, start_time, end_time, 
    duration, total_price, final_price
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test_service', 'robyn_camacho', 1,
    '2025-01-08', '10:00', '11:00',
    60, 100, 100
);
*/