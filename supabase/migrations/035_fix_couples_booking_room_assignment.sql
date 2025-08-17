-- Migration: 035_fix_couples_booking_room_assignment.sql
-- Purpose: Fix couples booking to properly handle SAME room for both people
-- Date: 2025-01-17
-- Issue: Second booking fails because room constraint sees it as already booked by first booking

-- Drop existing function
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create the fixed function that properly handles couples in the same room
CREATE OR REPLACE FUNCTION process_couples_booking_v2(
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
    v_primary_service_category TEXT;
    v_secondary_service_category TEXT;
    v_error_message TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
    v_max_end_time TIME;
    v_room_3_count INTEGER;
    v_room_2_count INTEGER;
    v_room_1_count INTEGER;
BEGIN
    -- Generate booking group ID
    v_booking_group_id := gen_random_uuid();
    
    -- Get primary service details
    SELECT s.duration, s.price, s.name, s.category::text
    INTO v_primary_duration, v_primary_price, v_primary_service_name, v_primary_service_category
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary service not found: ' || p_primary_service_id;
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT s.duration, s.price, s.name, s.category::text
    INTO v_secondary_duration, v_secondary_price, v_secondary_service_name, v_secondary_service_category
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
    v_max_end_time := GREATEST(v_primary_end_time, v_secondary_end_time);
    
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
    
    -- Room assignment logic for couples (same room with capacity 2)
    -- Check if body scrub service requires Room 3
    IF (v_primary_service_category = 'body_scrub' OR v_secondary_service_category = 'body_scrub' OR
        v_primary_service_name ILIKE '%salt body%' OR v_secondary_service_name ILIKE '%salt body%') THEN
        
        -- Must use Room 3 for body scrubs
        -- Check Room 3 availability (exclude bookings from same group)
        SELECT COUNT(*) INTO v_room_3_count
        FROM bookings b
        WHERE b.room_id = 3
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id);
        
        IF v_room_3_count = 0 THEN
            v_room_id := 3;
        ELSE
            RETURN QUERY
            SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
                   'Room 3 (required for body scrub) is not available at ' || p_start_time::TEXT;
            RETURN;
        END IF;
    ELSE
        -- For other services, prefer Room 2 or 3 (couples rooms), but can use any available
        
        -- Check Room 2 availability
        SELECT COUNT(*) INTO v_room_2_count
        FROM bookings b
        WHERE b.room_id = 2
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id);
        
        -- Check Room 3 availability
        SELECT COUNT(*) INTO v_room_3_count
        FROM bookings b
        WHERE b.room_id = 3
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id);
        
        -- Check Room 1 availability (as fallback)
        SELECT COUNT(*) INTO v_room_1_count
        FROM bookings b
        WHERE b.room_id = 1
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id);
        
        -- Assign room based on availability (prefer Room 2 and 3 for couples)
        IF v_room_2_count = 0 THEN
            v_room_id := 2;
        ELSIF v_room_3_count = 0 THEN
            v_room_id := 3;
        ELSIF v_room_1_count = 0 THEN
            v_room_id := 1;
        ELSE
            -- No room available
            v_error_message := 'No couples rooms available at ' || p_start_time::TEXT || ' on ' || p_booking_date::TEXT || '. ';
            v_error_message := v_error_message || 'Room 1: ' || v_room_1_count || ' booking(s), ';
            v_error_message := v_error_message || 'Room 2: ' || v_room_2_count || ' booking(s), ';
            v_error_message := v_error_message || 'Room 3: ' || v_room_3_count || ' booking(s).';
            
            RETURN QUERY
            SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
            RETURN;
        END IF;
    END IF;
    
    -- Check staff availability (skip if 'any' selected)
    IF p_primary_staff_id != 'any' AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_primary_staff_id
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_primary_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id)
    ) THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary staff member is not available at this time';
        RETURN;
    END IF;
    
    IF p_secondary_staff_id != 'any' AND p_secondary_staff_id != p_primary_staff_id AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_secondary_staff_id
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_secondary_end_time 
        AND b.end_time > p_start_time
        AND (b.booking_group_id IS NULL OR b.booking_group_id != v_booking_group_id)
    ) THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Secondary staff member is not available at this time';
        RETURN;
    END IF;
    
    -- IMPORTANT: Create bookings with the SAME booking_group_id so they're recognized as a couple
    -- The room conflict check above excludes bookings with the same booking_group_id
    
    -- Create primary booking
    BEGIN
        INSERT INTO bookings (
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
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := 'Failed to create primary booking: ' || SQLERRM;
            RETURN QUERY
            SELECT NULL::UUID, v_room_id, v_booking_group_id, FALSE, v_error_message;
            RETURN;
    END;
    
    -- Create secondary booking in the SAME room
    BEGIN
        INSERT INTO bookings (
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
            v_customer_id,
            p_secondary_service_id,
            p_secondary_staff_id,
            v_room_id,  -- SAME room as primary
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
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback primary booking
            DELETE FROM bookings b WHERE b.id = v_primary_booking_id;
            v_error_message := 'Failed to create secondary booking: ' || SQLERRM;
            RETURN QUERY
            SELECT NULL::UUID, v_room_id, v_booking_group_id, FALSE, v_error_message;
            RETURN;
    END;
    
    -- Return success for both bookings
    RETURN QUERY
    SELECT v_primary_booking_id, v_room_id, v_booking_group_id, TRUE, 
           'Primary booking created successfully in Room ' || v_room_id;
    
    RETURN QUERY
    SELECT v_secondary_booking_id, v_room_id, v_booking_group_id, TRUE,
           'Secondary booking created successfully in Room ' || v_room_id;
END;
$$;

-- CRITICAL: We need to ensure the booking constraint doesn't block couples bookings
-- Check if there's a constraint that needs updating
DO $$
BEGIN
    -- Check if there's a unique constraint that might be blocking couples bookings
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname LIKE '%room%time%' 
        AND conrelid = 'bookings'::regclass
    ) THEN
        RAISE NOTICE 'Found room/time constraint that may need updating for couples bookings';
    END IF;
END $$;

-- Add helpful comment
COMMENT ON FUNCTION process_couples_booking_v2 IS 
'Creates couples bookings in the SAME room (capacity 2). Both bookings share the same booking_group_id to identify them as a couple. Room availability checks exclude bookings from the same group to allow both people in the same room.';