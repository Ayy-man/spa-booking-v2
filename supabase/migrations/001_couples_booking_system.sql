-- =====================================================
-- Couples Booking System - Consolidated Migration
-- =====================================================
-- Description: Comprehensive couples booking system with single-slot approach
-- This migration creates a robust couples booking system that:
-- - Creates one booking entry that represents both services
-- - Uses booking_group_id to link related bookings
-- - Stores detailed service information in internal_notes
-- - Provides proper room allocation with couples room priority
-- - Includes availability checking and conflict resolution

-- Drop any existing versions of couples booking functions
DROP FUNCTION IF EXISTS process_couples_booking CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v3 CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_single_slot CASCADE;
DROP FUNCTION IF EXISTS check_couples_booking_availability CASCADE;
DROP FUNCTION IF EXISTS diagnose_booking_conflicts CASCADE;

-- Create availability checking function
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
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE, 'Primary service not found: ' || p_primary_service_id, NULL::INTEGER, '[]'::JSONB;
        RETURN;
    END IF;
    
    SELECT s.duration, s.name, s.category::text
    INTO v_secondary_duration, v_secondary_service_name, v_secondary_service_category
    FROM services s
    WHERE s.id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE, 'Secondary service not found: ' || p_secondary_service_id, NULL::INTEGER, '[]'::JSONB;
        RETURN;
    END IF;
    
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
    
    -- Find available room with couples room priority
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
        -- Check Room 3 first (preferred for couples)
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 3
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 3;
        -- Check Room 2 second
        ELSIF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = 2
            AND b.appointment_date = p_booking_date
            AND b.status != 'cancelled'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time
        ) THEN
            v_room_id := 2;
        ELSE
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'room_conflict',
                'message', 'No couples rooms (Room 3 or 2) available at this time'
            );
            IF v_error_message IS NULL THEN
                v_error_message := 'No couples rooms available at the requested time';
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

-- Create the main couples booking function (single-slot approach)
CREATE OR REPLACE FUNCTION process_couples_booking_single_slot(
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
    v_booking_id UUID;
    v_primary_service_name TEXT;
    v_secondary_service_name TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
    v_max_duration INTEGER;
    v_end_time TIME;
    v_total_price NUMERIC;
    v_availability_check RECORD;
BEGIN
    -- Generate booking group ID
    v_booking_group_id := gen_random_uuid();
    
    -- Get service details
    SELECT duration, price, name 
    INTO v_primary_duration, v_primary_price, v_primary_service_name
    FROM services WHERE id = p_primary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary service not found: ' || p_primary_service_id;
        RETURN;
    END IF;
    
    SELECT duration, price, name
    INTO v_secondary_duration, v_secondary_price, v_secondary_service_name
    FROM services WHERE id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Secondary service not found: ' || p_secondary_service_id;
        RETURN;
    END IF;
    
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
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               v_availability_check.error_message;
        RETURN;
    END IF;
    
    v_room_id := v_availability_check.room_id;
    
    -- Use the longer duration for the slot
    v_max_duration := GREATEST(v_primary_duration, v_secondary_duration);
    v_end_time := p_start_time + (v_max_duration * INTERVAL '1 minute');
    v_total_price := v_primary_price + v_secondary_price;
    
    -- Find or create customer
    SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name, 
            last_name, 
            email, 
            phone,
            is_active
        ) VALUES (
            split_part(p_customer_name, ' ', 1),
            COALESCE(split_part(p_customer_name, ' ', 2), ''),
            p_customer_email,
            p_customer_phone,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create a SINGLE booking that represents BOTH services
    INSERT INTO bookings (
        id,
        customer_id,
        service_id,  -- Use primary service ID
        staff_id,    -- Use primary staff ID
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
        booking_group_id,
        internal_notes  -- Store secondary service info here
    ) VALUES (
        gen_random_uuid(),
        v_customer_id,
        p_primary_service_id,  -- Primary service
        p_primary_staff_id,     -- Primary staff
        v_room_id,
        p_booking_date,
        p_start_time,
        v_end_time,
        v_max_duration,
        v_total_price,          -- Combined price
        0,
        v_total_price,
        'confirmed',
        'pending',
        'deposit',
        COALESCE(p_special_requests, '') || 
        E'\n[COUPLES BOOKING]' ||
        E'\nPerson 1: ' || v_primary_service_name || ' (' || p_primary_staff_id || ')' ||
        E'\nPerson 2: ' || v_secondary_service_name || ' (' || p_secondary_staff_id || ')',
        'couple',
        v_booking_group_id,
        jsonb_build_object(
            'is_couples', true,
            'services', jsonb_build_array(
                jsonb_build_object(
                    'service_id', p_primary_service_id,
                    'service_name', v_primary_service_name,
                    'staff_id', p_primary_staff_id,
                    'duration', v_primary_duration,
                    'price', v_primary_price
                ),
                jsonb_build_object(
                    'service_id', p_secondary_service_id,
                    'service_name', v_secondary_service_name,
                    'staff_id', p_secondary_staff_id,
                    'duration', v_secondary_duration,
                    'price', v_secondary_price
                )
            )
        )::text
    )
    RETURNING id INTO v_booking_id;
    
    -- Return success
    RETURN QUERY
    SELECT v_booking_id, v_room_id, v_booking_group_id, TRUE, 
           'Couples booking created successfully in Room ' || v_room_id;
           
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Failed to create couples booking: ' || SQLERRM;
END;
$$;

-- Create the main couples booking function (backward compatibility)
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
AS $$
BEGIN
    -- Use the single slot approach
    RETURN QUERY
    SELECT * FROM process_couples_booking_single_slot(
        p_primary_service_id,
        p_secondary_service_id,
        p_primary_staff_id,
        p_secondary_staff_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_booking_date,
        p_start_time,
        p_special_requests
    );
END;
$$;

-- Create diagnostic function for troubleshooting conflicts
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

-- Create view to display couples bookings with both services
CREATE OR REPLACE VIEW couples_bookings_view AS
SELECT 
    b.id,
    b.customer_id,
    c.first_name || COALESCE(' ' || c.last_name, '') as customer_name,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.room_id,
    r.name as room_name,
    b.total_price,
    b.status,
    b.booking_group_id,
    b.internal_notes::jsonb as couples_details,
    (b.internal_notes::jsonb -> 'services' -> 0 ->> 'service_name') as service_1,
    (b.internal_notes::jsonb -> 'services' -> 0 ->> 'staff_id') as staff_1,
    (b.internal_notes::jsonb -> 'services' -> 1 ->> 'service_name') as service_2,
    (b.internal_notes::jsonb -> 'services' -> 1 ->> 'staff_id') as staff_2
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN rooms r ON b.room_id = r.id
WHERE b.booking_type = 'couple'
AND b.internal_notes IS NOT NULL
AND b.internal_notes::jsonb ? 'is_couples';

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_couples_booking_availability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_couples_booking_single_slot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION diagnose_booking_conflicts TO authenticated, anon;
GRANT SELECT ON couples_bookings_view TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION check_couples_booking_availability IS 
'Pre-checks availability for couples booking without creating any records. Returns detailed conflict information.';

COMMENT ON FUNCTION process_couples_booking_single_slot IS 
'Creates a SINGLE booking slot for couples that occupies one room/time slot but tracks both services internally using JSON in internal_notes';

COMMENT ON FUNCTION process_couples_booking_v3 IS 
'Main couples booking function using single-slot approach with comprehensive availability checking';

COMMENT ON FUNCTION diagnose_booking_conflicts IS
'Diagnostic function to identify what resources are blocking a specific time slot';

COMMENT ON VIEW couples_bookings_view IS
'Shows couples bookings with both services extracted from the internal_notes JSON';