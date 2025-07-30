-- =====================================================
-- STEP-BY-STEP SUPABASE FUNCTIONS
-- Run each function one at a time if you prefer
-- =====================================================

-- STEP 1: Simple function to test if functions work
CREATE OR REPLACE FUNCTION test_function()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Functions are working!';
END;
$$;

-- Test it with: SELECT test_function();

-- =====================================================
-- STEP 2: Get Available Time Slots (Simplified Version)
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_date DATE,
  p_service_id TEXT DEFAULT NULL,
  p_staff_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  available_time TEXT,
  available_staff_id TEXT,
  available_room_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, just return all possible time slots
  -- You can enhance this later
  RETURN QUERY
  SELECT 
    TO_CHAR(slot_time, 'HH24:MI') as available_time,
    'any' as available_staff_id,
    1 as available_room_id
  FROM generate_series(
    p_date + '09:00:00'::TIME,
    p_date + '18:00:00'::TIME,
    '60 minutes'::INTERVAL
  ) AS slot_time;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_available_time_slots TO anon, authenticated;

-- =====================================================
-- STEP 3: Check Staff Capability (Simple Version)
-- =====================================================
CREATE OR REPLACE FUNCTION check_staff_capability(
  p_staff_id TEXT,
  p_service_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, just return true
  -- You can add real logic later
  RETURN TRUE;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION check_staff_capability TO anon, authenticated;

-- =====================================================
-- STEP 4: Assign Optimal Room (Simple Version)
-- =====================================================
CREATE OR REPLACE FUNCTION assign_optimal_room(
  p_service_id TEXT,
  p_preferred_staff_id TEXT DEFAULT NULL,
  p_booking_date DATE DEFAULT NULL,
  p_start_time TEXT DEFAULT NULL
)
RETURNS TABLE (
  room_id INTEGER,
  room_name TEXT,
  reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, just return room 1
  RETURN QUERY
  SELECT 
    1::INTEGER as room_id,
    'Room 1'::TEXT as room_name,
    'Default assignment'::TEXT as reason;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION assign_optimal_room TO anon, authenticated;

-- =====================================================
-- STEP 5: Get Staff Schedule (Simple Version)
-- =====================================================
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_staff_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  staff_id TEXT,
  staff_name TEXT,
  work_start TIME,
  work_end TIME,
  is_available BOOLEAN,
  break_start TIME,
  break_end TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_staff_id as staff_id,
    'Staff Member'::TEXT as staff_name,
    '09:00:00'::TIME as work_start,
    '19:00:00'::TIME as work_end,
    TRUE as is_available,
    NULL::TIME as break_start,
    NULL::TIME as break_end;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_staff_schedule TO anon, authenticated;

-- =====================================================
-- STEP 6: Process Booking (Simple Version)
-- =====================================================
CREATE OR REPLACE FUNCTION process_booking(
  p_service_id TEXT,
  p_staff_id TEXT,
  p_room_id INTEGER,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_booking_date DATE,
  p_start_time TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_booking_id TEXT;
BEGIN
  -- Generate a new booking ID
  v_new_booking_id := gen_random_uuid()::TEXT;
  
  -- For now, just return success
  -- You can add the actual booking logic later
  RETURN QUERY 
  SELECT 
    v_new_booking_id,
    TRUE,
    'Booking created successfully (test mode)'::TEXT;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION process_booking TO anon, authenticated;