-- FINAL FIX for Couples Booking System
-- This script fixes all issues with the couples booking function

-- First, drop any existing function
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create the properly working function
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
            COALESCE(SPLIT_PART(p_customer_name, ' ', 1), p_customer_name),
            COALESCE(NULLIF(SPLIT_PART(p_customer_name, ' ', 2), ''), ''),
            p_customer_email,
            p_customer_phone,
            false,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Room assignment logic
    -- For mixed facials + special services, prioritize Room 3
    IF (v_primary_service_category = 'facials' AND v_secondary_service_category = 'special') OR
       (v_primary_service_category = 'special' AND v_secondary_service_category = 'facials') OR
       v_primary_service_name ILIKE '%brazilian%' OR v_secondary_service_name ILIKE '%brazilian%' OR
       v_primary_service_name ILIKE '%vajacial%' OR v_secondary_service_name ILIKE '%vajacial%' THEN
        
        -- Check Room 3 availability
        SELECT COUNT(*) INTO v_room_3_count
        FROM bookings b
        WHERE b.room_id = 3
        AND b.appointment_date = p_booking_date
        AND b.status = 'confirmed'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time;
        
        IF v_room_3_count = 0 THEN
            v_room_id := 3;
        ELSE
            -- Try Room 2 as fallback
            SELECT COUNT(*) INTO v_room_2_count
            FROM bookings b
            WHERE b.room_id = 2
            AND b.appointment_date = p_booking_date
            AND b.status = 'confirmed'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time;
            
            IF v_room_2_count = 0 THEN
                v_room_id := 2;
            END IF;
        END IF;
    ELSE
        -- For same service types, try Room 2 first
        SELECT COUNT(*) INTO v_room_2_count
        FROM bookings b
        WHERE b.room_id = 2
        AND b.appointment_date = p_booking_date
        AND b.status = 'confirmed'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time;
        
        IF v_room_2_count = 0 THEN
            v_room_id := 2;
        ELSE
            -- Try Room 3 as fallback
            SELECT COUNT(*) INTO v_room_3_count
            FROM bookings b
            WHERE b.room_id = 3
            AND b.appointment_date = p_booking_date
            AND b.status = 'confirmed'
            AND b.start_time < v_max_end_time 
            AND b.end_time > p_start_time;
            
            IF v_room_3_count = 0 THEN
                v_room_id := 3;
            END IF;
        END IF;
    END IF;
    
    -- If no room available, return detailed error
    IF v_room_id IS NULL THEN
        v_error_message := 'No couples rooms available at ' || p_start_time::TEXT || ' on ' || p_booking_date::TEXT || '. ';
        v_error_message := v_error_message || 'Room 2 has ' || v_room_2_count || ' booking(s), Room 3 has ' || v_room_3_count || ' booking(s) during this time.';
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
        RETURN;
    END IF;
    
    -- Check staff availability (skip if 'any' selected)
    IF p_primary_staff_id != 'any' AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_primary_staff_id
        AND b.appointment_date = p_booking_date
        AND b.status = 'confirmed'
        AND b.start_time < v_primary_end_time 
        AND b.end_time > p_start_time
    ) THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary staff member is not available at this time';
        RETURN;
    END IF;
    
    IF p_secondary_staff_id != 'any' AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_secondary_staff_id
        AND b.appointment_date = p_booking_date
        AND b.status = 'confirmed'
        AND b.start_time < v_secondary_end_time 
        AND b.end_time > p_start_time
    ) THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Secondary staff member is not available at this time';
        RETURN;
    END IF;
    
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
    
    -- Create secondary booking
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
            -- Rollback primary booking
            DELETE FROM bookings b WHERE b.id = v_primary_booking_id;
            v_error_message := 'Failed to create secondary booking: ' || SQLERRM;
            RETURN QUERY
            SELECT NULL::UUID, v_room_id, v_booking_group_id, FALSE, v_error_message;
            RETURN;
    END;
    
    -- Return success for both bookings
    RETURN QUERY
    SELECT 
        v_primary_booking_id,
        v_room_id,
        v_booking_group_id,
        TRUE,
        'Booking 1: ' || v_primary_service_name || ' in Room ' || v_room_id
    UNION ALL
    SELECT 
        v_secondary_booking_id,
        v_room_id,
        v_booking_group_id,
        TRUE,
        'Booking 2: ' || v_secondary_service_name || ' in Room ' || v_room_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up any partial bookings (FIX: Use table alias to avoid ambiguity)
        DELETE FROM bookings b WHERE b.booking_group_id = v_booking_group_id;
        v_error_message := 'Unexpected error in couples booking: ' || SQLERRM;
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO anon;

-- Add helpful comment
COMMENT ON FUNCTION process_couples_booking_v2 IS 'Creates couples bookings with proper room assignment. Fixed: ambiguous column references, room availability checking, and different service durations.';

-- Verify the function was created
SELECT 
    'Function created successfully!' as status,
    proname as function_name,
    pronargs as num_arguments
FROM pg_proc 
WHERE proname = 'process_couples_booking_v2';

-- Test the function with your exact services
SELECT 'Testing couples booking:' as test_status;

SELECT * FROM process_couples_booking_v2(
    'deep_cleansing_facial'::TEXT,  -- 60 minutes
    'vajacial_brazilian'::TEXT,      -- 30 minutes
    'any'::TEXT,
    'any'::TEXT,
    'Test Customer',
    'finaltest@example.com',
    '555-9999',
    '2025-08-22'::DATE,
    '10:15'::TIME,
    'Final test of couples booking'
);

-- If test succeeds, check the bookings
SELECT 
    'Verify bookings created:' as check,
    b.id,
    s.name as service,
    b.room_id,
    b.start_time,
    b.end_time,
    b.booking_group_id,
    b.status
FROM bookings b
JOIN services s ON b.service_id = s.id
WHERE b.booking_group_id IN (
    SELECT DISTINCT booking_group_id 
    FROM bookings 
    WHERE booking_group_id IS NOT NULL
    ORDER BY created_at DESC 
    LIMIT 1
);