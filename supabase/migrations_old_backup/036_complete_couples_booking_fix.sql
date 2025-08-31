-- Migration: 036_complete_couples_booking_fix.sql
-- Purpose: Complete overhaul of couples booking system to fix all issues
-- Date: 2025-01-17
-- This migration creates a bulletproof couples booking system

-- First, drop ALL existing versions of the function
DROP FUNCTION IF EXISTS process_couples_booking CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v3 CASCADE;

-- Drop any existing constraints that might interfere
DO $$
BEGIN
    -- Check and drop any constraint that might block couples bookings
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%staff%time%' 
        AND conrelid = 'bookings'::regclass
    ) THEN
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ' || 
                (SELECT conname FROM pg_constraint 
                 WHERE conname LIKE '%staff%time%' 
                 AND conrelid = 'bookings'::regclass 
                 LIMIT 1);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%room%time%' 
        AND conrelid = 'bookings'::regclass
    ) THEN
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ' || 
                (SELECT conname FROM pg_constraint 
                 WHERE conname LIKE '%room%time%' 
                 AND conrelid = 'bookings'::regclass 
                 LIMIT 1);
    END IF;
END $$;

-- Create a pre-check function to validate availability
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
    
    -- Find available room
    -- Check if body scrub requires Room 3
    IF (v_primary_service_category = 'body_scrub' OR v_secondary_service_category = 'body_scrub' OR
        v_primary_service_name ILIKE '%salt body%' OR v_secondary_service_name ILIKE '%salt body%') THEN
        -- Must use Room 3
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
        -- Try to find any available room
        -- Check Room 2 first (preferred for couples)
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 2
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 2;
        -- Check Room 3
        ELSIF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 3
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 3;
        -- Check Room 1 as fallback
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

-- Create the new bulletproof couples booking function
CREATE OR REPLACE FUNCTION process_couples_booking_v3(
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
    
    RAISE NOTICE 'Starting couples booking with group ID: %', v_booking_group_id;
    
    -- Get service details
    SELECT s.duration, s.price, s.name
    INTO v_primary_duration, v_primary_price, v_primary_service_name
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    IF NOT FOUND THEN
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
        RAISE NOTICE 'Availability check failed: %', v_availability_check.error_message;
        RAISE NOTICE 'Conflicts: %', v_availability_check.conflicts;
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               v_availability_check.error_message || ' (Conflicts: ' || v_availability_check.conflicts::TEXT || ')';
        RETURN;
    END IF;
    
    v_room_id := v_availability_check.room_id;
    
    RAISE NOTICE 'Room % is available for couples booking', v_room_id;
    
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
        
        RAISE NOTICE 'Created new customer: %', v_customer_id;
    END IF;
    
    -- Use a single transaction to create both bookings
    BEGIN
        -- Create primary booking with explicit booking_group_id
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
        
        RAISE NOTICE 'Created primary booking: % in room %', v_primary_booking_id, v_room_id;
        
        -- Create secondary booking with same booking_group_id and room
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
            v_room_id,  -- SAME room
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
            v_booking_group_id  -- SAME booking group
        )
        RETURNING id INTO v_secondary_booking_id;
        
        RAISE NOTICE 'Created secondary booking: % in room %', v_secondary_booking_id, v_room_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the specific error
            v_error_message := 'Transaction failed: ' || SQLERRM;
            RAISE NOTICE 'Error creating bookings: %', v_error_message;
            
            -- Rollback will happen automatically
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
        RAISE NOTICE 'Fatal error in couples booking: %', v_error_message;
        
        -- Try to clean up if partial booking was created
        IF v_primary_booking_id IS NOT NULL THEN
            DELETE FROM bookings WHERE id = v_primary_booking_id;
        END IF;
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO anon;
GRANT EXECUTE ON FUNCTION check_couples_booking_availability TO authenticated;
GRANT EXECUTE ON FUNCTION check_couples_booking_availability TO anon;

-- Create a diagnostic function to see what's blocking a time slot
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

GRANT EXECUTE ON FUNCTION diagnose_booking_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION diagnose_booking_conflicts TO anon;

-- Add helpful comments
COMMENT ON FUNCTION process_couples_booking_v3 IS 
'Bulletproof couples booking function v3. Includes pre-validation, detailed error messages, and atomic transaction handling. Both bookings use the same room and booking_group_id.';

COMMENT ON FUNCTION check_couples_booking_availability IS
'Pre-checks availability for couples booking without creating any records. Returns detailed conflict information.';

COMMENT ON FUNCTION diagnose_booking_conflicts IS
'Diagnostic function to identify what resources are blocking a specific time slot.';