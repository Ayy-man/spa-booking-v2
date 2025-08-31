-- ============================================
-- COUPLES BOOKING SYSTEM - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Complete couples booking system with all functionality
-- Created: 2025-01-31
-- Consolidates: Multiple couples booking migrations (030-038)

-- ============================================
-- SECTION 1: BOOKING GROUP SUPPORT
-- ============================================

-- Add booking_group_id to bookings table if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_group_id UUID;

-- Add booking_type column to support couple booking identification
DO $$ 
BEGIN
    -- Check if booking_type column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_type'
    ) THEN
        ALTER TABLE bookings ADD COLUMN booking_type TEXT DEFAULT 'single';
        ALTER TABLE bookings ADD CONSTRAINT bookings_booking_type_check 
            CHECK (booking_type IN ('single', 'couple', 'group', 'buffer'));
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(booking_group_id);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date_time ON bookings(staff_id, appointment_date, start_time, end_time) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_room_date_time ON bookings(room_id, appointment_date, start_time, end_time) WHERE status != 'cancelled';

-- ============================================
-- SECTION 2: BOOKING ERRORS TRACKING
-- ============================================

-- Create booking_errors table for error logging
CREATE TABLE IF NOT EXISTS public.booking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_attempt_id UUID,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  customer_email TEXT,
  service_ids TEXT[],
  staff_ids TEXT[],
  appointment_date DATE,
  start_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on booking_errors
ALTER TABLE public.booking_errors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for booking_errors
CREATE POLICY "booking_errors_admin_access" ON public.booking_errors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Create index for error lookups
CREATE INDEX IF NOT EXISTS idx_booking_errors_date ON booking_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_errors_type ON booking_errors(error_type);

-- ============================================
-- SECTION 3: AVAILABILITY CHECK FUNCTION
-- ============================================

-- Pre-check function to validate availability for couples bookings
CREATE OR REPLACE FUNCTION check_couples_booking_availability(
    p_primary_service_id TEXT,
    p_secondary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_staff_id TEXT,
    p_booking_date DATE,
    p_start_time TIME
)
RETURNS TABLE (
    is_available BOOLEAN,
    error_message TEXT,
    room_id INTEGER,
    conflicts JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_primary_duration INTEGER;
    v_secondary_duration INTEGER;
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
    v_max_end_time TIME;
    v_room_id INTEGER;
    v_conflicts JSONB := '[]'::JSONB;
    v_error_message TEXT;
    v_primary_service_name TEXT;
    v_secondary_service_name TEXT;
    v_primary_service_category TEXT;
    v_secondary_service_category TEXT;
BEGIN
    -- Get service details
    SELECT s.duration, s.name, s.category::text
    INTO v_primary_duration, v_primary_service_name, v_primary_service_category
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    SELECT s.duration, s.name, s.category::text
    INTO v_secondary_duration, v_secondary_service_name, v_secondary_service_category
    FROM services s
    WHERE s.id = p_secondary_service_id;
    
    -- Calculate end times
    v_primary_end_time := p_start_time + (v_primary_duration * INTERVAL '1 minute');
    v_secondary_end_time := p_start_time + (v_secondary_duration * INTERVAL '1 minute');
    v_max_end_time := GREATEST(v_primary_end_time, v_secondary_end_time);
    
    -- Check staff availability for primary
    IF p_primary_staff_id != 'any' THEN
        IF EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.staff_id = p_primary_staff_id
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_primary_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'staff_conflict',
                'staff_id', p_primary_staff_id,
                'message', 'Primary staff is already booked'
            );
            v_error_message := 'Primary staff member is not available at this time';
        END IF;
    END IF;
    
    -- Check staff availability for secondary (if different)
    IF p_secondary_staff_id != 'any' AND p_secondary_staff_id != p_primary_staff_id THEN
        IF EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.staff_id = p_secondary_staff_id
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_secondary_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'staff_conflict',
                'staff_id', p_secondary_staff_id,
                'message', 'Secondary staff is already booked'
            );
            IF v_error_message IS NULL THEN
                v_error_message := 'Secondary staff member is not available at this time';
            ELSE
                v_error_message := v_error_message || ' and secondary staff is also unavailable';
            END IF;
        END IF;
    END IF;
    
    -- Find available room with proper logic for body scrub requirements
    IF (v_primary_service_category = 'body_scrub' OR v_secondary_service_category = 'body_scrub' OR
        v_primary_service_name ILIKE '%salt body%' OR v_secondary_service_name ILIKE '%salt body%') THEN
        -- Must use Room 3 for body scrub services
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 3
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 3;
        ELSE
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'room_conflict',
                'room_id', 3,
                'message', 'Room 3 (required for body scrub) is not available'
            );
            IF v_error_message IS NULL THEN
                v_error_message := 'Room 3 (required for body scrub) is not available';
            END IF;
        END IF;
    ELSE
        -- Try to find any available room (prefer Room 2 for couples)
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 2
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 2;
        ELSIF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 3
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 3;
        ELSIF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 1
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 1;
        ELSE
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'room_conflict',
                'message', 'No rooms available at this time'
            );
            IF v_error_message IS NULL THEN
                v_error_message := 'No rooms available at the requested time';
            END IF;
        END IF;
    END IF;
    
    -- Return result
    RETURN QUERY
    SELECT 
        (v_error_message IS NULL) as is_available,
        v_error_message,
        v_room_id,
        v_conflicts;
END;
$$;

-- ============================================
-- SECTION 4: COUPLES BOOKING FUNCTION
-- ============================================

-- Main couples booking processing function
CREATE OR REPLACE FUNCTION process_couples_booking(
    p_primary_service_id TEXT,
    p_secondary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_staff_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_booking_date DATE DEFAULT CURRENT_DATE,
    p_start_time TIME DEFAULT '09:00'::TIME,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    room_id INTEGER,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_customer_id UUID;
    v_primary_duration INTEGER;
    v_secondary_duration INTEGER;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_primary_service_name TEXT;
    v_secondary_service_name TEXT;
    v_error_message TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
    v_availability_check RECORD;
BEGIN
    -- Generate booking group ID first
    v_booking_group_id := gen_random_uuid();
    
    -- Get service details
    SELECT s.duration, s.price, s.name
    INTO v_primary_duration, v_primary_price, v_primary_service_name
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    IF NOT FOUND THEN
        -- Log error
        INSERT INTO booking_errors (error_type, error_message, service_ids, customer_email, appointment_date, start_time)
        VALUES ('service_not_found', 'Primary service not found: ' || p_primary_service_id, 
                ARRAY[p_primary_service_id], p_customer_email, p_booking_date, p_start_time);
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary service not found: ' || p_primary_service_id;
        RETURN;
    END IF;
    
    SELECT s.duration, s.price, s.name
    INTO v_secondary_duration, v_secondary_price, v_secondary_service_name
    FROM services s
    WHERE s.id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        -- Log error
        INSERT INTO booking_errors (error_type, error_message, service_ids, customer_email, appointment_date, start_time)
        VALUES ('service_not_found', 'Secondary service not found: ' || p_secondary_service_id, 
                ARRAY[p_secondary_service_id], p_customer_email, p_booking_date, p_start_time);
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Secondary service not found: ' || p_secondary_service_id;
        RETURN;
    END IF;
    
    -- Calculate end times
    v_primary_end_time := p_start_time + (v_primary_duration * INTERVAL '1 minute');
    v_secondary_end_time := p_start_time + (v_secondary_duration * INTERVAL '1 minute');
    
    -- Check availability first
    SELECT * INTO v_availability_check
    FROM check_couples_booking_availability(
        p_primary_service_id,
        p_secondary_service_id,
        p_primary_staff_id,
        p_secondary_staff_id,
        p_booking_date,
        p_start_time
    );
    
    IF NOT v_availability_check.is_available THEN
        -- Log error
        INSERT INTO booking_errors (error_type, error_message, error_details, service_ids, staff_ids, 
                                   customer_email, appointment_date, start_time)
        VALUES ('availability_conflict', v_availability_check.error_message, v_availability_check.conflicts,
                ARRAY[p_primary_service_id, p_secondary_service_id], 
                ARRAY[p_primary_staff_id, p_secondary_staff_id],
                p_customer_email, p_booking_date, p_start_time);
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               v_availability_check.error_message;
        RETURN;
    END IF;
    
    v_room_id := v_availability_check.room_id;
    
    -- Find or create customer
    SELECT c.id INTO v_customer_id
    FROM customers c
    WHERE c.email = p_customer_email
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name, 
            last_name, 
            email, 
            phone,
            marketing_consent,
            is_active
        ) VALUES (
            split_part(p_customer_name, ' ', 1),
            CASE 
                WHEN array_length(string_to_array(p_customer_name, ' '), 1) > 1 
                THEN substring(p_customer_name from position(' ' in p_customer_name) + 1)
                ELSE ''
            END,
            p_customer_email,
            p_customer_phone,
            false,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create both bookings in a single transaction
    BEGIN
        -- Create primary booking
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
            discount,
            final_price,
            status,
            payment_status,
            payment_option,
            notes,
            booking_type,
            booking_group_id
        ) VALUES (
            gen_random_uuid(),
            v_customer_id,
            p_primary_service_id,
            p_primary_staff_id,
            v_room_id,
            p_booking_date,
            p_start_time,
            v_primary_end_time,
            v_primary_duration,
            v_primary_price,
            0,
            v_primary_price,
            'confirmed',
            'pending',
            'deposit',
            p_special_requests,
            'couple',
            v_booking_group_id
        )
        RETURNING id INTO v_primary_booking_id;
        
        -- Create secondary booking with same room and booking group
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
            discount,
            final_price,
            status,
            payment_status,
            payment_option,
            notes,
            booking_type,
            booking_group_id
        ) VALUES (
            gen_random_uuid(),
            v_customer_id,
            p_secondary_service_id,
            p_secondary_staff_id,
            v_room_id,
            p_booking_date,
            p_start_time,
            v_secondary_end_time,
            v_secondary_duration,
            v_secondary_price,
            0,
            v_secondary_price,
            'confirmed',
            'pending',
            'deposit',
            p_special_requests,
            'couple',
            v_booking_group_id
        )
        RETURNING id INTO v_secondary_booking_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error
            v_error_message := 'Transaction failed: ' || SQLERRM;
            INSERT INTO booking_errors (error_type, error_message, error_details, service_ids, staff_ids,
                                       customer_email, appointment_date, start_time)
            VALUES ('booking_creation_failed', v_error_message, 
                    jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE),
                    ARRAY[p_primary_service_id, p_secondary_service_id],
                    ARRAY[p_primary_staff_id, p_secondary_staff_id],
                    p_customer_email, p_booking_date, p_start_time);
            
            RAISE;
    END;
    
    -- Return success for both bookings
    RETURN QUERY
    SELECT v_primary_booking_id, v_room_id, v_booking_group_id, TRUE, 
           'Primary booking created successfully in Room ' || v_room_id;
    
    RETURN QUERY
    SELECT v_secondary_booking_id, v_room_id, v_booking_group_id, TRUE,
           'Secondary booking created successfully in Room ' || v_room_id;
           
EXCEPTION
    WHEN OTHERS THEN
        -- Catch all error handler
        v_error_message := 'Unexpected error: ' || SQLERRM;
        
        -- Log the error
        INSERT INTO booking_errors (error_type, error_message, error_details, service_ids, staff_ids,
                                   customer_email, appointment_date, start_time)
        VALUES ('fatal_error', v_error_message,
                jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE),
                ARRAY[p_primary_service_id, p_secondary_service_id],
                ARRAY[p_primary_staff_id, p_secondary_staff_id],
                p_customer_email, p_booking_date, p_start_time);
        
        -- Clean up partial bookings
        IF v_primary_booking_id IS NOT NULL THEN
            DELETE FROM bookings WHERE id = v_primary_booking_id;
        END IF;
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
END;
$$;

-- ============================================
-- SECTION 5: DIAGNOSTIC FUNCTION
-- ============================================

-- Function to diagnose what's blocking a time slot
CREATE OR REPLACE FUNCTION diagnose_booking_conflicts(
    p_date DATE,
    p_start_time TIME,
    p_duration INTEGER
)
RETURNS TABLE (
    conflict_type TEXT,
    resource_id TEXT,
    resource_name TEXT,
    existing_booking_id UUID,
    existing_start TIME,
    existing_end TIME,
    existing_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_end_time TIME;
BEGIN
    v_end_time := p_start_time + (p_duration * INTERVAL '1 minute');
    
    -- Check staff conflicts
    RETURN QUERY
    SELECT 
        'staff_conflict'::TEXT as conflict_type,
        b.staff_id as resource_id,
        s.name as resource_name,
        b.id as existing_booking_id,
        b.start_time as existing_start,
        b.end_time as existing_end,
        b.status::TEXT as existing_status
    FROM bookings b
    JOIN staff s ON b.staff_id = s.id
    WHERE b.appointment_date = p_date
    AND b.status != 'cancelled'
    AND b.start_time < v_end_time 
    AND b.end_time > p_start_time;
    
    -- Check room conflicts
    RETURN QUERY
    SELECT 
        'room_conflict'::TEXT as conflict_type,
        b.room_id::TEXT as resource_id,
        r.name as resource_name,
        b.id as existing_booking_id,
        b.start_time as existing_start,
        b.end_time as existing_end,
        b.status::TEXT as existing_status
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.appointment_date = p_date
    AND b.status != 'cancelled'
    AND b.start_time < v_end_time 
    AND b.end_time > p_start_time;
END;
$$;

-- ============================================
-- SECTION 6: PERMISSIONS AND GRANTS
-- ============================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION process_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking TO anon;
GRANT EXECUTE ON FUNCTION check_couples_booking_availability TO authenticated;
GRANT EXECUTE ON FUNCTION check_couples_booking_availability TO anon;
GRANT EXECUTE ON FUNCTION diagnose_booking_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION diagnose_booking_conflicts TO anon;

-- Grant permissions on booking_errors table
GRANT ALL ON public.booking_errors TO authenticated;
GRANT SELECT ON public.booking_errors TO anon;

-- ============================================
-- SECTION 7: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON FUNCTION process_couples_booking IS 
'Main couples booking function. Creates two bookings with the same room and booking_group_id. Includes comprehensive error handling and logging.';

COMMENT ON FUNCTION check_couples_booking_availability IS
'Pre-checks availability for couples booking without creating any records. Returns detailed conflict information.';

COMMENT ON FUNCTION diagnose_booking_conflicts IS
'Diagnostic function to identify what resources are blocking a specific time slot.';

COMMENT ON TABLE booking_errors IS
'Stores detailed error information for failed booking attempts to help with debugging and customer support.';

COMMENT ON COLUMN bookings.booking_group_id IS
'Groups related bookings together (e.g., couples bookings). All bookings in a group should be managed together.';

COMMENT ON COLUMN bookings.booking_type IS
'Type of booking: single (default), couple, group, or buffer. Used for business logic and reporting.';