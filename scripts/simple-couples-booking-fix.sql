-- Simplified couples booking function that should work
-- This version uses simpler logic and better debugging

-- First, let's verify rooms exist and are active
SELECT 'Checking rooms:' as check, id, name, capacity, is_active 
FROM rooms 
WHERE id IN (2, 3);

-- Check if there are ANY bookings on Aug 22, 2025
SELECT 'Bookings on Aug 22:' as check, COUNT(*) as total_bookings 
FROM bookings 
WHERE appointment_date = '2025-08-22' 
AND status != 'cancelled';

-- Drop old function
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create simplified function
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
AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_customer_id UUID;
    v_primary_duration INTEGER;
    v_secondary_duration INTEGER;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_error_message TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
    v_max_end_time TIME;
    v_booking_count INTEGER;
BEGIN
    -- Generate booking group ID
    v_booking_group_id := gen_random_uuid();
    
    -- Get service durations and prices
    SELECT duration, price 
    INTO v_primary_duration, v_primary_price 
    FROM services 
    WHERE id = p_primary_service_id;
    
    SELECT duration, price 
    INTO v_secondary_duration, v_secondary_price 
    FROM services 
    WHERE id = p_secondary_service_id;
    
    -- Calculate the latest end time
    v_max_end_time := p_start_time + GREATEST(v_primary_duration, v_secondary_duration) * INTERVAL '1 minute';
    
    -- Find or create customer
    SELECT c.id INTO v_customer_id
    FROM customers c
    WHERE c.email = p_customer_email
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name, last_name, email, phone, is_active
        ) VALUES (
            SPLIT_PART(p_customer_name, ' ', 1),
            COALESCE(SPLIT_PART(p_customer_name, ' ', 2), ''),
            p_customer_email,
            p_customer_phone,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Simple room assignment: Try Room 3 first (has all equipment), then Room 2
    -- Check Room 3
    SELECT COUNT(*) INTO v_booking_count
    FROM bookings b
    WHERE b.room_id = 3
    AND b.appointment_date = p_booking_date
    AND b.status = 'confirmed'
    AND b.start_time < v_max_end_time 
    AND b.end_time > p_start_time;
    
    IF v_booking_count = 0 THEN
        v_room_id := 3;
    ELSE
        -- Check Room 2
        SELECT COUNT(*) INTO v_booking_count
        FROM bookings b
        WHERE b.room_id = 2
        AND b.appointment_date = p_booking_date
        AND b.status = 'confirmed'
        AND b.start_time < v_max_end_time 
        AND b.end_time > p_start_time;
        
        IF v_booking_count = 0 THEN
            v_room_id := 2;
        END IF;
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'No couples rooms available at ' || p_start_time::TEXT || ' on ' || p_booking_date::TEXT;
        RETURN;
    END IF;
    
    -- Create primary booking
    INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id, appointment_date,
        start_time, end_time, duration, total_price, discount, final_price,
        status, payment_status, payment_option, notes, booking_type, booking_group_id
    ) VALUES (
        v_customer_id, 
        p_primary_service_id, 
        p_primary_staff_id, 
        v_room_id,
        p_booking_date, 
        p_start_time, 
        p_start_time + v_primary_duration * INTERVAL '1 minute',
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
    
    -- Create secondary booking
    INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id, appointment_date,
        start_time, end_time, duration, total_price, discount, final_price,
        status, payment_status, payment_option, notes, booking_type, booking_group_id
    ) VALUES (
        v_customer_id, 
        p_secondary_service_id, 
        p_secondary_staff_id, 
        v_room_id,
        p_booking_date, 
        p_start_time, 
        p_start_time + v_secondary_duration * INTERVAL '1 minute',
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
    
    -- Return success
    RETURN QUERY
    SELECT v_primary_booking_id, v_room_id, v_booking_group_id, TRUE, 'Success'::TEXT
    UNION ALL
    SELECT v_secondary_booking_id, v_room_id, v_booking_group_id, TRUE, 'Success'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up on error
        DELETE FROM bookings WHERE booking_group_id = v_booking_group_id;
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO anon;

-- Test it
SELECT 'Testing simplified function:' as test;

SELECT * FROM process_couples_booking_v2(
    'deep_cleansing_facial',
    'vajacial_brazilian',
    'any',
    'any',
    'Test Customer',
    'test2@example.com',
    '555-5678',
    '2025-08-22'::DATE,
    '14:00'::TIME,  -- Try 2 PM instead of 10:15
    'Test booking'
);