-- Final fix for couples booking with different service durations
-- This handles the case where one service is 60 min and another is 30 min

-- First, let's check what's actually blocking the rooms
SELECT 
    'Current bookings on Aug 22, 2025 around 10:15:' as status,
    b.id,
    b.room_id,
    b.start_time,
    b.end_time,
    b.status,
    s.name as service
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
WHERE b.appointment_date = '2025-08-22'
AND b.room_id IN (2, 3)
AND b.status != 'cancelled'
AND (
    (b.start_time <= '10:15'::TIME AND b.end_time > '10:15'::TIME) OR
    (b.start_time < '11:15'::TIME AND b.end_time > '10:15'::TIME)
)
ORDER BY b.room_id, b.start_time;

-- Drop and recreate the function with better duration handling
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

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
    v_max_duration INTEGER;
    v_end_time TIME;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_primary_service_category TEXT;
    v_secondary_service_category TEXT;
    v_primary_service_name TEXT;
    v_secondary_service_name TEXT;
    v_requires_special_equipment BOOLEAN := FALSE;
    v_error_message TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
BEGIN
    -- Generate a booking group ID
    v_booking_group_id := gen_random_uuid();
    
    -- Get primary service details
    SELECT 
        s.category::text, 
        s.duration, 
        s.name, 
        s.price,
        (s.category::text IN ('body_treatment', 'special') OR 
         s.requires_room_3 = true OR 
         s.name ILIKE '%brazilian%' OR 
         s.name ILIKE '%vajacial%')
    INTO v_primary_service_category, v_primary_duration, v_primary_service_name, v_primary_price, v_requires_special_equipment
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Primary service not found: ' || p_primary_service_id;
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT 
        s.category::text, 
        s.duration, 
        s.name, 
        s.price
    INTO v_secondary_service_category, v_secondary_duration, v_secondary_service_name, v_secondary_price
    FROM services s
    WHERE s.id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Secondary service not found: ' || p_secondary_service_id;
        RETURN;
    END IF;
    
    -- Check if secondary service requires special equipment
    IF v_secondary_service_category IN ('body_treatment', 'special') OR
       v_secondary_service_name ILIKE '%brazilian%' OR 
       v_secondary_service_name ILIKE '%vajacial%' THEN
        v_requires_special_equipment := TRUE;
    END IF;
    
    -- Calculate end times for each service
    v_primary_end_time := p_start_time + (v_primary_duration || ' minutes')::INTERVAL;
    v_secondary_end_time := p_start_time + (v_secondary_duration || ' minutes')::INTERVAL;
    
    -- Use the longer duration for room booking
    v_max_duration := GREATEST(v_primary_duration, v_secondary_duration);
    v_end_time := p_start_time + (v_max_duration || ' minutes')::INTERVAL;
    
    RAISE NOTICE 'Booking details: Primary: % (% min), Secondary: % (% min), Max duration: % min, End time: %',
                 v_primary_service_name, v_primary_duration, 
                 v_secondary_service_name, v_secondary_duration,
                 v_max_duration, v_end_time;
    
    -- Find or create customer
    SELECT c.id INTO v_customer_id
    FROM customers c
    WHERE c.email = p_customer_email
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name, last_name, email, phone, marketing_consent, is_active
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
    
    -- Room assignment with detailed checking
    BEGIN
        -- For mixed facials + special, prioritize Room 3
        IF (v_primary_service_category = 'facials' AND v_secondary_service_category = 'special') OR
           (v_primary_service_category = 'special' AND v_secondary_service_category = 'facials') OR
           v_requires_special_equipment THEN
            
            RAISE NOTICE 'Mixed service types or special equipment needed, checking Room 3...';
            
            -- Check Room 3 availability
            IF NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 3
                AND b.appointment_date = p_booking_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (
                    -- Check for any overlap with our desired time slot
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 3;
                RAISE NOTICE 'Room 3 is available!';
            ELSE
                RAISE NOTICE 'Room 3 is occupied, checking Room 2...';
                
                -- Check Room 2 as fallback
                IF NOT EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.room_id = 2
                    AND b.appointment_date = p_booking_date
                    AND b.status NOT IN ('cancelled', 'no_show')
                    AND (
                        (b.start_time < v_end_time AND b.end_time > p_start_time)
                    )
                ) THEN
                    v_room_id := 2;
                    RAISE NOTICE 'Room 2 is available as fallback!';
                END IF;
            END IF;
        ELSE
            -- Same service types, try Room 2 first
            RAISE NOTICE 'Same service types, checking Room 2 first...';
            
            IF NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 2
                AND b.appointment_date = p_booking_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 2;
                RAISE NOTICE 'Room 2 is available!';
            ELSE
                RAISE NOTICE 'Room 2 is occupied, checking Room 3...';
                
                IF NOT EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.room_id = 3
                    AND b.appointment_date = p_booking_date
                    AND b.status NOT IN ('cancelled', 'no_show')
                    AND (
                        (b.start_time < v_end_time AND b.end_time > p_start_time)
                    )
                ) THEN
                    v_room_id := 3;
                    RAISE NOTICE 'Room 3 is available as fallback!';
                END IF;
            END IF;
        END IF;
        
        -- If no room available, show what's blocking
        IF v_room_id IS NULL THEN
            -- Get details of what's blocking
            v_error_message := 'No couples room available at ' || p_start_time::TEXT || ' on ' || p_booking_date::TEXT || '. ';
            
            -- Check what's in Room 2
            FOR v_error_message IN
                SELECT 'Room 2 blocked by: ' || s.name || ' (' || b.start_time::TEXT || '-' || b.end_time::TEXT || ')'
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                WHERE b.room_id = 2
                AND b.appointment_date = p_booking_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (b.start_time < v_end_time AND b.end_time > p_start_time)
                LIMIT 1
            LOOP
                RAISE NOTICE '%', v_error_message;
            END LOOP;
            
            -- Check what's in Room 3
            FOR v_error_message IN
                SELECT 'Room 3 blocked by: ' || s.name || ' (' || b.start_time::TEXT || '-' || b.end_time::TEXT || ')'
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                WHERE b.room_id = 3
                AND b.appointment_date = p_booking_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (b.start_time < v_end_time AND b.end_time > p_start_time)
                LIMIT 1
            LOOP
                RAISE NOTICE '%', v_error_message;
            END LOOP;
            
            v_error_message := 'No couples room available. Both Room 2 and Room 3 are occupied during ' || 
                              p_start_time::TEXT || '-' || v_end_time::TEXT || ' on ' || p_booking_date::TEXT;
            
            RETURN QUERY
            SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE, v_error_message;
            RETURN;
        END IF;
    END;
    
    -- Check staff availability (skip 'any')
    IF p_primary_staff_id != 'any' AND p_secondary_staff_id != 'any' THEN
        IF EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.staff_id IN (p_primary_staff_id, p_secondary_staff_id)
            AND b.appointment_date = p_booking_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (b.start_time < v_end_time AND b.end_time > p_start_time)
        ) THEN
            RETURN QUERY
            SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
                   'One or more staff members are not available at this time';
            RETURN;
        END IF;
    END IF;
    
    -- Create primary booking
    BEGIN
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date,
            start_time, end_time, duration, total_price, discount, final_price,
            status, payment_status, payment_option, notes, booking_type, booking_group_id
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id,
            p_booking_date, p_start_time, v_primary_end_time, v_primary_duration,
            v_primary_price, 0, v_primary_price,
            'confirmed', 'pending', 'deposit',
            p_special_requests, 'couple', v_booking_group_id
        )
        RETURNING id INTO v_primary_booking_id;
        
        RAISE NOTICE 'Created primary booking % in room %', v_primary_booking_id, v_room_id;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY
            SELECT NULL::UUID, v_room_id, v_booking_group_id, FALSE,
                   'Failed to create primary booking: ' || SQLERRM;
            RETURN;
    END;
    
    -- Create secondary booking
    BEGIN
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date,
            start_time, end_time, duration, total_price, discount, final_price,
            status, payment_status, payment_option, notes, booking_type, booking_group_id
        ) VALUES (
            v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id,
            p_booking_date, p_start_time, v_secondary_end_time, v_secondary_duration,
            v_secondary_price, 0, v_secondary_price,
            'confirmed', 'pending', 'deposit',
            p_special_requests, 'couple', v_booking_group_id
        )
        RETURNING id INTO v_secondary_booking_id;
        
        RAISE NOTICE 'Created secondary booking % in room %', v_secondary_booking_id, v_room_id;
    EXCEPTION
        WHEN OTHERS THEN
            DELETE FROM bookings WHERE id = v_primary_booking_id;
            RETURN QUERY
            SELECT NULL::UUID, v_room_id, v_booking_group_id, FALSE,
                   'Failed to create secondary booking: ' || SQLERRM;
            RETURN;
    END;
    
    -- Return success
    RETURN QUERY
    SELECT v_primary_booking_id, v_room_id, v_booking_group_id, TRUE,
           'Booking 1: ' || v_primary_service_name
    UNION ALL
    SELECT v_secondary_booking_id, v_room_id, v_booking_group_id, TRUE,
           'Booking 2: ' || v_secondary_service_name;
    
EXCEPTION
    WHEN OTHERS THEN
        DELETE FROM bookings b WHERE b.booking_group_id = v_booking_group_id;
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Unexpected error: ' || SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO anon;

-- Test with actual services
SELECT 'Testing couples booking function...' as test;

SELECT * FROM process_couples_booking_v2(
    'deep_cleansing_facial'::TEXT,  -- 60 minutes
    'vajacial_brazilian'::TEXT,      -- 30 minutes
    'any'::TEXT,
    'any'::TEXT,
    'Test Customer',
    'test@example.com',
    '555-1234',
    '2025-08-23'::DATE,  -- Try tomorrow instead of Aug 22
    '10:15'::TIME,
    'Testing couples booking with different durations'
);