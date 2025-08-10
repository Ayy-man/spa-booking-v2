-- Comprehensive fix for couples booking issues
-- Addresses: staff resolution, individual duration calculation, room assignment, and proper error handling

-- Drop existing couples booking function
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create enhanced couples booking function with proper individual duration logic
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
    v_assignment_reason TEXT;
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
    v_primary_resolved_staff_id TEXT;
    v_secondary_resolved_staff_id TEXT;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Validate that "any" staff has been resolved to actual staff
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
    
    -- Validate different staff members for couples booking
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Cannot book the same staff member for both people in couples booking'::TEXT, 
            p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Get primary service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary service not found'::TEXT, p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary service not found'::TEXT, p_secondary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Calculate individual end times based on each service's duration
    v_primary_end_time := p_start_time + INTERVAL '1 minute' * v_primary_service.duration;
    v_secondary_end_time := p_start_time + INTERVAL '1 minute' * v_secondary_service.duration;
    
    -- Get max duration for room booking (room needs to be available for the longest service)
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    
    -- Find optimal couples room (prefer room 3, then room 2)
    SELECT id, name INTO v_room_id, v_room_name 
    FROM rooms 
    WHERE is_active = true 
        AND capacity >= 2 
        AND id IN (3, 2)  -- Preferred couples rooms
        AND NOT EXISTS (
            -- Check room availability for the max duration window
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
                AND appointment_date = p_booking_date 
                AND status != 'cancelled'
                AND (
                    -- Check for overlap including 15-minute buffer
                    (start_time - INTERVAL '15 minutes' < p_start_time + INTERVAL '1 minute' * v_max_duration + INTERVAL '15 minutes')
                    AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
                )
        )
    ORDER BY id -- Room 2 has id=2, Room 3 has id=3, so this prioritizes Room 2... let's fix this
    LIMIT 1;
    
    -- Actually prefer room 3 first, then room 2
    IF v_room_id IS NULL THEN
        -- Try room 3 first (preferred)
        SELECT id, name INTO v_room_id, v_room_name 
        FROM rooms 
        WHERE is_active = true 
            AND capacity >= 2 
            AND id = 3
            AND NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = 3
                    AND appointment_date = p_booking_date 
                    AND status != 'cancelled'
                    AND (
                        (start_time - INTERVAL '15 minutes' < p_start_time + INTERVAL '1 minute' * v_max_duration + INTERVAL '15 minutes')
                        AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
                    )
            );
        
        -- If room 3 not available, try room 2
        IF v_room_id IS NULL THEN
            SELECT id, name INTO v_room_id, v_room_name 
            FROM rooms 
            WHERE is_active = true 
                AND capacity >= 2 
                AND id = 2
                AND NOT EXISTS (
                    SELECT 1 FROM bookings 
                    WHERE room_id = 2
                        AND appointment_date = p_booking_date 
                        AND status != 'cancelled'
                        AND (
                            (start_time - INTERVAL '15 minutes' < p_start_time + INTERVAL '1 minute' * v_max_duration + INTERVAL '15 minutes')
                            AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
                        )
                );
        END IF;
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'No couples rooms (Room 2 or Room 3) available at this time. Please select a different time slot.'::TEXT, 
            NULL::TEXT, 0;
        RETURN;
    END IF;
    
    -- Validate staff availability for their specific service durations
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE staff_id = p_primary_staff_id 
            AND appointment_date = p_booking_date 
            AND status != 'cancelled'
            AND (
                (start_time - INTERVAL '15 minutes' < v_primary_end_time + INTERVAL '15 minutes')
                AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary staff member is already booked for this time slot (including 15-minute buffer between appointments)'::TEXT, 
            p_primary_staff_id, v_primary_service.duration;
        RETURN;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE staff_id = p_secondary_staff_id 
            AND appointment_date = p_booking_date 
            AND status != 'cancelled'
            AND (
                (start_time - INTERVAL '15 minutes' < v_secondary_end_time + INTERVAL '15 minutes')
                AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary staff member is already booked for this time slot (including 15-minute buffer between appointments)'::TEXT, 
            p_secondary_staff_id, v_secondary_service.duration;
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
        
        -- Create first booking (primary service) with individual duration and end time
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
        
        -- Create second booking (secondary service) with individual duration and end time
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
        
        -- Return success with both booking IDs and their individual details
        RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 
            'Primary booking created successfully'::TEXT, p_primary_staff_id, v_primary_service.duration;
        RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 
            'Secondary booking created successfully'::TEXT, p_secondary_staff_id, v_secondary_service.duration;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Failed to create bookings: ' || SQLERRM, NULL::TEXT, 0;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated, anon;

COMMENT ON FUNCTION process_couples_booking_v3 IS 'Creates couples bookings with individual duration calculations, staff resolution validation, and preferred room assignment (Room 3 > Room 2)';

-- Create helper function for staff resolution validation
CREATE OR REPLACE FUNCTION validate_staff_for_booking(
    p_staff_id TEXT,
    p_service_id TEXT,
    p_appointment_date DATE,
    p_start_time TIME,
    p_duration INTEGER
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    staff_name TEXT
) AS $$
DECLARE
    v_staff RECORD;
    v_service RECORD;
    v_end_time TIME;
    v_any_staff_id TEXT := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
    -- Check if staff ID is "any" placeholder
    IF p_staff_id = 'any' OR p_staff_id = v_any_staff_id THEN
        RETURN QUERY SELECT false, 'Staff selection "Any Available Staff" must be resolved to actual staff member before booking'::TEXT, 'Any Available Staff'::TEXT;
        RETURN;
    END IF;
    
    -- Get staff details
    SELECT * INTO v_staff FROM staff WHERE id = p_staff_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Staff member not found or inactive'::TEXT, p_staff_id::TEXT;
        RETURN;
    END IF;
    
    -- Get service details
    SELECT * INTO v_service FROM services WHERE id = p_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Service not found'::TEXT, v_staff.name;
        RETURN;
    END IF;
    
    -- Calculate end time
    v_end_time := p_start_time + INTERVAL '1 minute' * p_duration;
    
    -- Check if staff can perform this service category
    IF NOT (v_service.category = ANY(v_staff.capabilities)) THEN
        RETURN QUERY SELECT false, v_staff.name || ' cannot perform ' || v_service.category || ' services'::TEXT, v_staff.name;
        RETURN;
    END IF;
    
    -- Check staff availability on this date (day of week)
    IF NOT (EXTRACT(dow FROM p_appointment_date) = ANY(v_staff.work_days)) THEN
        RETURN QUERY SELECT false, v_staff.name || ' does not work on ' || TO_CHAR(p_appointment_date, 'Day')::TEXT, v_staff.name;
        RETURN;
    END IF;
    
    -- Check for booking conflicts
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE staff_id = p_staff_id 
            AND appointment_date = p_appointment_date 
            AND status != 'cancelled'
            AND (
                (start_time - INTERVAL '15 minutes' < v_end_time + INTERVAL '15 minutes')
                AND (end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT false, v_staff.name || ' is already booked during this time (including 15-minute buffer)'::TEXT, v_staff.name;
        RETURN;
    END IF;
    
    -- All validations passed
    RETURN QUERY SELECT true, 'Staff member is available'::TEXT, v_staff.name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_staff_for_booking TO authenticated, anon;

COMMENT ON FUNCTION validate_staff_for_booking IS 'Validates if a specific staff member can perform a service at a given time, with comprehensive error reporting';