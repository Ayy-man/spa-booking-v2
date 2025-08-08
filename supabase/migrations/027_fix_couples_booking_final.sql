-- Final fix for process_couples_booking_v2 function
-- Ensure the function exists with the correct signature matching the schema

DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

CREATE OR REPLACE FUNCTION process_couples_booking_v2(
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
    error_message TEXT
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_room_name VARCHAR;
    v_assignment_reason TEXT;
    v_booking1_id UUID;
    v_booking2_id UUID;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_end_time TIME;
    v_max_duration INTEGER;
    v_customer_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get primary service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 'Primary service not found';
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 'Secondary service not found';
        RETURN;
    END IF;
    
    -- Calculate end time based on the longer service
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    v_end_time := p_start_time + INTERVAL '1 minute' * v_max_duration;
    
    -- Find optimal room for couples (prioritize rooms that can handle both services)
    -- If we don't have the assign_optimal_room function, use basic room assignment
    BEGIN
        SELECT assigned_room_id, assigned_room_name, assignment_reason 
        INTO v_room_id, v_room_name, v_assignment_reason
        FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, p_start_time);
    EXCEPTION WHEN OTHERS THEN
        -- Fallback: assign first available room with capacity >= 2
        SELECT id INTO v_room_id 
        FROM rooms 
        WHERE is_active = true AND capacity >= 2 
        ORDER BY id 
        LIMIT 1;
    END;
    
    -- If primary service room doesn't work, try secondary service room
    IF v_room_id IS NULL THEN
        BEGIN
            SELECT assigned_room_id, assigned_room_name, assignment_reason 
            INTO v_room_id, v_room_name, v_assignment_reason
            FROM assign_optimal_room(p_secondary_service_id, p_secondary_staff_id, p_booking_date, p_start_time);
        EXCEPTION WHEN OTHERS THEN
            -- Fallback: assign first available room with capacity >= 2
            SELECT id INTO v_room_id 
            FROM rooms 
            WHERE is_active = true AND capacity >= 2 
            ORDER BY id 
            LIMIT 1;
        END;
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'No suitable room available for couples booking';
        RETURN;
    END IF;
    
    -- Check room capacity
    IF (SELECT capacity FROM rooms WHERE id = v_room_id) < 2 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Selected room does not have capacity for couples';
        RETURN;
    END IF;
    
    -- Validate staff availability
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Cannot book the same staff member for both services';
        RETURN;
    END IF;
    
    -- Create or find customer record
    BEGIN
        -- Split customer name into first and last name
        v_first_name := SPLIT_PART(p_customer_name, ' ', 1);
        v_last_name := SUBSTRING(p_customer_name FROM LENGTH(v_first_name) + 2);
        IF v_last_name IS NULL OR v_last_name = '' THEN
            v_last_name := '';
        END IF;
        
        -- Try to find existing customer by email
        SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email;
        
        IF NOT FOUND THEN
            -- Create new customer
            INSERT INTO customers (
                first_name, last_name, email, phone, marketing_consent, is_active
            ) VALUES (
                v_first_name, v_last_name, p_customer_email, p_customer_phone, false, true
            ) RETURNING id INTO v_customer_id;
        ELSE
            -- Update existing customer's phone if provided and different
            IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
                UPDATE customers 
                SET phone = p_customer_phone, 
                    first_name = COALESCE(NULLIF(v_first_name, ''), first_name),
                    last_name = COALESCE(NULLIF(v_last_name, ''), last_name)
                WHERE id = v_customer_id;
            END IF;
        END IF;
        
        -- Create first booking (primary service)
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
            duration, total_price, discount, final_price, status, payment_status,
            booking_group_id, booking_type, notes
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id, 
            p_booking_date, p_start_time, v_end_time,
            v_primary_service.duration, v_primary_service.price, 0, v_primary_service.price,
            'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
        ) RETURNING id INTO v_booking1_id;
        
        -- Create second booking (secondary service) - only if different from primary
        IF p_primary_service_id != p_secondary_service_id THEN
            INSERT INTO bookings (
                customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
                duration, total_price, discount, final_price, status, payment_status,
                booking_group_id, booking_type, notes
            ) VALUES (
                v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id, 
                p_booking_date, p_start_time, v_end_time,
                v_secondary_service.duration, v_secondary_service.price, 0, v_secondary_service.price,
                'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
            ) RETURNING id INTO v_booking2_id;
        END IF;
        
        -- Return success with both booking IDs
        RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        IF v_booking2_id IS NOT NULL THEN
            RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Failed to create bookings: ' || SQLERRM;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated, anon;

COMMENT ON FUNCTION process_couples_booking_v2 IS 'Creates couples bookings with proper customer_id schema compatibility and fallback room assignment';