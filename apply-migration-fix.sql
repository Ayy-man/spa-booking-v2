-- Quick fix for couples booking SQL error
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS process_couples_booking_v3 CASCADE;

CREATE OR REPLACE FUNCTION process_couples_booking_v3(
    p_booking_date DATE,
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_primary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_service_id TEXT,
    p_secondary_staff_id TEXT,
    p_start_time TIME,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    room_id INTEGER,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT,
    staff_id TEXT,
    service_duration INTEGER
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_room_name VARCHAR;
    v_booking1_id UUID;
    v_booking2_id UUID;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
    v_max_duration INTEGER;
    v_customer_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_any_staff_id TEXT := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
    -- Generate group ID
    v_booking_group_id := uuid_generate_v4();
    
    -- Validate staff resolved
    IF p_primary_staff_id = 'any' OR p_primary_staff_id = v_any_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary staff must be resolved to actual staff member before booking'::TEXT, 
            p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    IF p_secondary_staff_id = 'any' OR p_secondary_staff_id = v_any_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary staff must be resolved to actual staff member before booking'::TEXT, 
            p_secondary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Get services
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    
    -- Calculate individual end times
    v_primary_end_time := p_start_time + INTERVAL '1 minute' * v_primary_service.duration;
    v_secondary_end_time := p_start_time + INTERVAL '1 minute' * v_secondary_service.duration;
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    
    -- Find couples room with proper aliases
    SELECT r.id, r.name INTO v_room_id, v_room_name 
    FROM rooms r
    WHERE r.is_active = true 
        AND r.capacity >= 2 
        AND r.id IN (3, 2)
        AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id 
                AND b.appointment_date = p_booking_date 
                AND b.status != 'cancelled'
                AND (
                    (b.start_time - INTERVAL '15 minutes' < p_start_time + INTERVAL '1 minute' * v_max_duration + INTERVAL '15 minutes')
                    AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
                )
        )
    ORDER BY CASE r.id WHEN 3 THEN 1 WHEN 2 THEN 2 ELSE 3 END
    LIMIT 1;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'No couples rooms available at this time'::TEXT, NULL::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check staff availability with proper aliases  
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_primary_staff_id 
            AND b.appointment_date = p_booking_date 
            AND b.status != 'cancelled'
            AND (
                (b.start_time - INTERVAL '15 minutes' < v_primary_end_time + INTERVAL '15 minutes')
                AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary staff member is already booked for this time slot'::TEXT, 
            p_primary_staff_id, v_primary_service.duration;
        RETURN;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_secondary_staff_id 
            AND b.appointment_date = p_booking_date 
            AND b.status != 'cancelled'
            AND (
                (b.start_time - INTERVAL '15 minutes' < v_secondary_end_time + INTERVAL '15 minutes')
                AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary staff member is already booked for this time slot'::TEXT, 
            p_secondary_staff_id, v_secondary_service.duration;
        RETURN;
    END IF;
    
    -- Create customer
    v_first_name := SPLIT_PART(p_customer_name, ' ', 1);
    v_last_name := SUBSTRING(p_customer_name FROM LENGTH(v_first_name) + 2);
    IF v_last_name IS NULL OR v_last_name = '' THEN v_last_name := ''; END IF;
    
    SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email;
    
    IF NOT FOUND THEN
        INSERT INTO customers (first_name, last_name, email, phone, marketing_consent, is_active) 
        VALUES (v_first_name, v_last_name, p_customer_email, p_customer_phone, false, true) 
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create bookings with individual durations
    INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
        duration, total_price, discount, final_price, status, payment_status,
        booking_group_id, booking_type, notes
    ) VALUES (
        v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id, 
        p_booking_date, p_start_time, v_primary_end_time,
        v_primary_service.duration, v_primary_service.price, 0, v_primary_service.price,
        'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
    ) RETURNING id INTO v_booking1_id;
    
    INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
        duration, total_price, discount, final_price, status, payment_status,
        booking_group_id, booking_type, notes
    ) VALUES (
        v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id, 
        p_booking_date, p_start_time, v_secondary_end_time,
        v_secondary_service.duration, v_secondary_service.price, 0, v_secondary_service.price,
        'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
    ) RETURNING id INTO v_booking2_id;
    
    RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 
        'Primary booking created successfully'::TEXT, p_primary_staff_id, v_primary_service.duration;
    RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 
        'Secondary booking created successfully'::TEXT, p_secondary_staff_id, v_secondary_service.duration;
        
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated, anon;