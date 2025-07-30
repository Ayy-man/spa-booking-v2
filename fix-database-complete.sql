-- =====================================================
-- COMPLETE DATABASE FIX SCRIPT FOR SPA BOOKING SYSTEM
-- This script includes both RPC functions and RLS fixes
-- Run this entire script in your Supabase SQL editor
-- =====================================================

-- PART 1: DROP EXISTING FUNCTIONS IF THEY EXIST
-- =====================================================
DROP FUNCTION IF EXISTS get_available_time_slots CASCADE;
DROP FUNCTION IF EXISTS process_booking CASCADE;
DROP FUNCTION IF EXISTS assign_optimal_room CASCADE;
DROP FUNCTION IF EXISTS check_staff_capability CASCADE;
DROP FUNCTION IF EXISTS get_staff_schedule CASCADE;

-- PART 2: CREATE RPC FUNCTIONS
-- =====================================================

-- 1. GET AVAILABLE TIME SLOTS
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
DECLARE
  v_service_duration INTEGER;
  v_business_start TIME := '09:00:00';
  v_business_end TIME := '19:00:00';
  v_buffer_time INTEGER := 15; -- minutes
BEGIN
  -- Get service duration if service_id is provided
  IF p_service_id IS NOT NULL THEN
    SELECT duration INTO v_service_duration
    FROM services
    WHERE id = p_service_id;
  ELSE
    v_service_duration := 60; -- default duration
  END IF;

  -- Generate time slots with available staff and rooms
  RETURN QUERY
  WITH time_slots AS (
    -- Generate all possible time slots from 9 AM to 7 PM
    SELECT 
      TO_CHAR(slot_time, 'HH24:MI') as time_slot
    FROM generate_series(
      p_date + v_business_start,
      p_date + v_business_end - (v_service_duration || ' minutes')::INTERVAL,
      '30 minutes'::INTERVAL
    ) AS slot_time
  ),
  available_staff AS (
    -- Get staff working on this day
    SELECT DISTINCT s.id as staff_id
    FROM staff s
    WHERE s.is_active = true
      AND EXTRACT(DOW FROM p_date) = ANY(s.work_days)
      AND (p_staff_id IS NULL OR s.id = p_staff_id)
      AND (
        p_service_id IS NULL 
        OR EXISTS (
          SELECT 1 
          FROM unnest(s.capabilities) AS cap
          WHERE cap::text = (SELECT category::text FROM services WHERE id = p_service_id)
        )
      )
  ),
  booked_slots AS (
    -- Get all bookings for the date
    SELECT 
      b.staff_id,
      b.room_id,
      b.start_time,
      b.end_time,
      b.appointment_date
    FROM bookings b
    WHERE b.appointment_date = p_date
      AND b.status::text IN ('confirmed', 'in_progress')
  )
  -- Find available combinations
  SELECT DISTINCT
    ts.time_slot as available_time,
    ast.staff_id as available_staff_id,
    r.id as available_room_id
  FROM time_slots ts
  CROSS JOIN available_staff ast
  CROSS JOIN rooms r
  WHERE r.is_active = true
    -- Check room capabilities
    AND (
      p_service_id IS NULL 
      OR EXISTS (
        SELECT 1 
        FROM unnest(r.capabilities) AS cap
        WHERE cap::text = (SELECT category::text FROM services WHERE id = p_service_id)
      )
    )
    -- Check for conflicts
    AND NOT EXISTS (
      SELECT 1
      FROM booked_slots bs
      WHERE bs.staff_id = ast.staff_id
        AND bs.appointment_date = p_date
        AND (
          -- Check time overlap with buffer
          (ts.time_slot::TIME >= (bs.start_time - (v_buffer_time || ' minutes')::INTERVAL))
          AND (ts.time_slot::TIME < (bs.end_time + (v_buffer_time || ' minutes')::INTERVAL))
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM booked_slots bs
      WHERE bs.room_id = r.id
        AND bs.appointment_date = p_date
        AND (
          -- Check time overlap with buffer
          (ts.time_slot::TIME >= (bs.start_time - (v_buffer_time || ' minutes')::INTERVAL))
          AND (ts.time_slot::TIME < (bs.end_time + (v_buffer_time || ' minutes')::INTERVAL))
        )
    )
  ORDER BY ts.time_slot, ast.staff_id;
END;
$$;

-- 2. ASSIGN OPTIMAL ROOM
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
DECLARE
  v_service_record RECORD;
  v_requires_room_3 BOOLEAN;
  v_service_category TEXT;
  v_is_couples_service BOOLEAN;
BEGIN
  -- Get service details
  SELECT * INTO v_service_record
  FROM services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, 'Service not found'::TEXT;
    RETURN;
  END IF;

  v_requires_room_3 := v_service_record.requires_room_3;
  v_service_category := v_service_record.category::TEXT;
  v_is_couples_service := v_service_record.is_couples_service;

  -- If service requires Room 3 (body scrubs)
  IF v_requires_room_3 OR v_service_category = 'body_scrub' THEN
    RETURN QUERY
    SELECT r.id, r.name, 'Service requires specialized equipment in Room 3'::TEXT
    FROM rooms r
    WHERE r.id = 3 AND r.is_active = true;
    RETURN;
  END IF;

  -- If couples service, prefer Room 3, then Room 2 (never Room 1)
  IF v_is_couples_service THEN
    -- Try Room 3 first
    RETURN QUERY
    SELECT r.id, r.name, 'Couples service assigned to premium Room 3'::TEXT
    FROM rooms r
    WHERE r.id = 3 AND r.is_active = true
      AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.room_id = r.id
          AND b.appointment_date = p_booking_date
          AND b.status::text IN ('confirmed', 'in_progress')
          AND (
            (p_start_time::TIME >= b.start_time AND p_start_time::TIME < b.end_time)
            OR (p_start_time::TIME + (v_service_record.duration || ' minutes')::INTERVAL > b.start_time 
                AND p_start_time::TIME < b.end_time)
          )
      ))
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Try Room 2 next
    RETURN QUERY
    SELECT r.id, r.name, 'Couples service assigned to Room 2'::TEXT
    FROM rooms r
    WHERE r.id = 2 AND r.is_active = true
      AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.room_id = r.id
          AND b.appointment_date = p_booking_date
          AND b.status::text IN ('confirmed', 'in_progress')
          AND (
            (p_start_time::TIME >= b.start_time AND p_start_time::TIME < b.end_time)
            OR (p_start_time::TIME + (v_service_record.duration || ' minutes')::INTERVAL > b.start_time 
                AND p_start_time::TIME < b.end_time)
          )
      ))
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- No couples rooms available
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, 'No couples rooms available for this time'::TEXT;
    RETURN;
  END IF;

  -- Check staff default room preference for single services
  IF p_preferred_staff_id IS NOT NULL AND p_preferred_staff_id != 'any' THEN
    RETURN QUERY
    SELECT r.id, r.name, 'Assigned to staff preferred room'::TEXT
    FROM staff s
    JOIN rooms r ON r.id = s.default_room_id
    WHERE s.id = p_preferred_staff_id
      AND r.is_active = true
      AND v_service_category = ANY(
        SELECT unnest(r.capabilities)::text
      )
      AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.room_id = r.id
          AND b.appointment_date = p_booking_date
          AND b.status::text IN ('confirmed', 'in_progress')
          AND (
            (p_start_time::TIME >= b.start_time AND p_start_time::TIME < b.end_time)
            OR (p_start_time::TIME + (v_service_record.duration || ' minutes')::INTERVAL > b.start_time 
                AND p_start_time::TIME < b.end_time)
          )
      ))
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Find any available room with the right capabilities (prefer smaller rooms)
  RETURN QUERY
  SELECT r.id, r.name, 'First available room with required capabilities'::TEXT
  FROM rooms r
  WHERE r.is_active = true
    AND v_service_category = ANY(
      SELECT unnest(r.capabilities)::text
    )
    AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.room_id = r.id
        AND b.appointment_date = p_booking_date
        AND b.status::text IN ('confirmed', 'in_progress')
        AND (
          (p_start_time::TIME >= b.start_time AND p_start_time::TIME < b.end_time)
          OR (p_start_time::TIME + (v_service_record.duration || ' minutes')::INTERVAL > b.start_time 
              AND p_start_time::TIME < b.end_time)
        )
    ))
  ORDER BY r.capacity, r.id  -- Prefer smaller rooms first
  LIMIT 1;
END;
$$;

-- 3. CHECK STAFF CAPABILITY
CREATE OR REPLACE FUNCTION check_staff_capability(
  p_staff_id TEXT,
  p_service_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_service_category TEXT;
  v_staff_capabilities TEXT[];
BEGIN
  -- Get service category
  SELECT category::TEXT INTO v_service_category
  FROM services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Special case for "any" staff
  IF p_staff_id = 'any' THEN
    RETURN TRUE;
  END IF;

  -- Get staff capabilities as text array
  SELECT ARRAY(
    SELECT unnest(capabilities)::text
  ) INTO v_staff_capabilities
  FROM staff
  WHERE id = p_staff_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if staff can perform this service category
  RETURN v_service_category = ANY(v_staff_capabilities);
END;
$$;

-- 4. GET STAFF SCHEDULE
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
DECLARE
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    CASE 
      WHEN v_day_of_week = ANY(s.work_days) THEN '09:00:00'::TIME
      ELSE NULL::TIME
    END as work_start,
    CASE 
      WHEN v_day_of_week = ANY(s.work_days) THEN '19:00:00'::TIME
      ELSE NULL::TIME
    END as work_end,
    v_day_of_week = ANY(s.work_days) as is_available,
    NULL::TIME as break_start,
    NULL::TIME as break_end
  FROM staff s
  WHERE s.id = p_staff_id
    AND s.is_active = true;
END;
$$;

-- 5. PROCESS BOOKING (Main booking creation function)
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
  booking_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_service_record RECORD;
  v_end_time TIME;
  v_customer_id UUID;
  v_new_booking_id UUID;
  v_conflict_count INTEGER;
BEGIN
  -- Get service details
  SELECT * INTO v_service_record
  FROM services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Service not found';
    RETURN;
  END IF;

  -- Calculate end time
  v_end_time := p_start_time::TIME + (v_service_record.duration || ' minutes')::INTERVAL;

  -- Check for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings b
  WHERE b.appointment_date = p_booking_date
    AND b.status::text IN ('confirmed', 'in_progress')
    AND (
      (b.staff_id = p_staff_id AND b.staff_id != 'any')
      OR b.room_id = p_room_id
    )
    AND (
      (p_start_time::TIME >= b.start_time AND p_start_time::TIME < b.end_time)
      OR (v_end_time > b.start_time AND v_end_time <= b.end_time)
      OR (p_start_time::TIME <= b.start_time AND v_end_time >= b.end_time)
    );

  IF v_conflict_count > 0 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Time slot conflicts with existing booking';
    RETURN;
  END IF;

  -- Create or find customer
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES (
    split_part(p_customer_name, ' ', 1),
    CASE 
      WHEN split_part(p_customer_name, ' ', 2) = '' 
      THEN split_part(p_customer_name, ' ', 1)
      ELSE split_part(p_customer_name, ' ', 2)
    END,
    p_customer_email,
    p_customer_phone
  )
  ON CONFLICT (email) DO UPDATE
  SET phone = COALESCE(EXCLUDED.phone, customers.phone)
  RETURNING id INTO v_customer_id;

  -- Create booking
  v_new_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (
    id,
    customer_id,
    service_id,
    staff_id,
    room_id,
    appointment_date,
    start_time,
    end_time,
    duration,
    total_price,
    final_price,
    status,
    payment_status,
    notes
  ) VALUES (
    v_new_booking_id,
    v_customer_id,
    p_service_id,
    p_staff_id,
    p_room_id,
    p_booking_date,
    p_start_time::TIME,
    v_end_time,
    v_service_record.duration,
    v_service_record.price,
    v_service_record.price,
    'confirmed'::booking_status,
    'pending'::payment_status,
    p_special_requests
  );

  RETURN QUERY SELECT v_new_booking_id, TRUE, 'Booking created successfully';
END;
$$;

-- PART 3: GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_available_time_slots TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_optimal_room TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_staff_capability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_schedule TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_booking TO anon, authenticated;

-- PART 4: FIX ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous customer creation" ON customers;
DROP POLICY IF EXISTS "Allow anonymous customer reads" ON customers;
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous booking reads" ON bookings;
DROP POLICY IF EXISTS "Allow public to read services" ON services;
DROP POLICY IF EXISTS "Allow public to read staff" ON staff;
DROP POLICY IF EXISTS "Allow public to read rooms" ON rooms;

-- Create new policies for anonymous users

-- Customers table policies
CREATE POLICY "Allow anonymous customer creation" ON customers
FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous customer reads" ON customers
FOR SELECT TO anon 
USING (true);

CREATE POLICY "Allow anonymous customer updates" ON customers
FOR UPDATE TO anon 
USING (true)
WITH CHECK (true);

-- Bookings table policies
CREATE POLICY "Allow anonymous booking creation" ON bookings
FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous booking reads" ON bookings
FOR SELECT TO anon 
USING (true);

-- Services, Staff, and Rooms should be publicly readable
CREATE POLICY "Allow public to read services" ON services
FOR SELECT TO anon 
USING (true);

CREATE POLICY "Allow public to read staff" ON staff
FOR SELECT TO anon 
USING (true);

CREATE POLICY "Allow public to read rooms" ON rooms
FOR SELECT TO anon 
USING (true);

-- PART 5: CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- PART 6: VERIFY INSTALLATION
-- =====================================================
-- After running this script, test with these queries:

-- Test 1: Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'get_available_time_slots',
  'process_booking',
  'assign_optimal_room',
  'check_staff_capability',
  'get_staff_schedule'
);

-- Test 2: Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services', 'staff', 'rooms')
ORDER BY tablename, policyname;

-- Test 3: Try getting available time slots
SELECT * FROM get_available_time_slots(CURRENT_DATE, NULL, NULL) LIMIT 10;

-- =====================================================
-- END OF SCRIPT
-- =====================================================