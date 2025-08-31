-- Fix couples booking to use SINGLE SLOT approach
-- Instead of creating two separate bookings that conflict, create ONE booking with both services

DROP FUNCTION IF EXISTS process_couples_booking_single_slot CASCADE;

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
    v_combined_service_name TEXT;
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
    
    -- Use the longer duration for the slot
    v_max_duration := GREATEST(v_primary_duration, v_secondary_duration);
    v_end_time := p_start_time + (v_max_duration * INTERVAL '1 minute');
    v_total_price := v_primary_price + v_secondary_price;
    
    -- Create combined service name for display
    v_combined_service_name := 'Couples: ' || v_primary_service_name || ' & ' || v_secondary_service_name;
    
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
    
    -- Find available room (prefer Room 3, then Room 2)
    -- Check Room 3 first
    IF NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = 3
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_end_time
        AND b.end_time > p_start_time
    ) THEN
        v_room_id := 3;
    -- Check Room 2
    ELSIF NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = 2
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND b.start_time < v_end_time
        AND b.end_time > p_start_time
    ) THEN
        v_room_id := 2;
    ELSE
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'No couples rooms (Room 3 or 2) available at the requested time';
        RETURN;
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
    
    -- Return success (return twice for compatibility with existing code)
    RETURN QUERY
    SELECT v_booking_id, v_room_id, v_booking_group_id, TRUE, 
           'Couples booking created successfully in Room ' || v_room_id;
    
    -- Return second result for compatibility
    RETURN QUERY
    SELECT v_booking_id, v_room_id, v_booking_group_id, TRUE,
           'Couples booking (single slot) confirmed';
           
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::INTEGER, v_booking_group_id, FALSE,
               'Failed to create couples booking: ' || SQLERRM;
END;
$$;

-- Update v3 to use the single slot approach
DROP FUNCTION IF EXISTS process_couples_booking_v3 CASCADE;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_single_slot TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_single_slot TO anon;
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO anon;

-- Create a view to show couples bookings with both services
CREATE OR REPLACE VIEW couples_bookings_view AS
SELECT 
    b.id,
    b.customer_id,
    c.first_name || ' ' || c.last_name as customer_name,
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

COMMENT ON FUNCTION process_couples_booking_single_slot IS 
'Creates a SINGLE booking slot for couples that occupies one room/time slot but tracks both services internally';

COMMENT ON VIEW couples_bookings_view IS
'Shows couples bookings with both services extracted from the internal_notes JSON';