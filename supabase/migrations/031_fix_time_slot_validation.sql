-- Fix time slot generation to ensure valid TIME format is always returned
-- This prevents "invalid input syntax for type time" errors

-- Drop existing function to recreate with better validation
DROP FUNCTION IF EXISTS get_available_time_slots(DATE, TEXT, TEXT);

-- Create the improved time slots function with proper validation
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_date DATE,
    p_service_id TEXT DEFAULT NULL,
    p_staff_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    available_time TIME
) AS $$
DECLARE
    service_duration INTEGER;
    business_start TIME := '09:00:00';
    business_end TIME := '19:00:00';
    buffer_minutes INTEGER := 15;
    current_slot TIME;
    slot_end_time TIME;
    has_conflict BOOLEAN;
BEGIN
    -- Input validation
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Date parameter cannot be null';
    END IF;
    
    -- Get service duration with validation
    IF p_service_id IS NOT NULL THEN
        SELECT duration INTO service_duration 
        FROM services 
        WHERE id = p_service_id AND is_active = true;
        
        IF service_duration IS NULL THEN
            -- Fallback to default if service not found
            service_duration := 60;
        END IF;
    ELSE
        service_duration := 60; -- Default 1 hour
    END IF;
    
    -- Validate service duration
    IF service_duration <= 0 OR service_duration > 480 THEN -- Max 8 hours
        service_duration := 60; -- Reset to safe default
    END IF;
    
    -- Generate time slots with validation
    current_slot := business_start;
    
    WHILE current_slot + INTERVAL '1 minute' * service_duration <= business_end LOOP
        -- Calculate slot end time
        slot_end_time := current_slot + INTERVAL '1 minute' * service_duration;
        
        -- Validate calculated times
        IF slot_end_time IS NULL OR current_slot IS NULL THEN
            -- Skip this slot if calculations failed
            current_slot := current_slot + INTERVAL '15 minutes';
            CONTINUE;
        END IF;
        
        -- Check for conflicts with existing bookings
        SELECT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.appointment_date = p_date
            AND b.status != 'cancelled'
            AND b.start_time IS NOT NULL
            AND b.end_time IS NOT NULL
            AND (
                -- Check overlap with buffer
                (current_slot < b.end_time + INTERVAL '1 minute' * buffer_minutes 
                 AND slot_end_time > b.start_time)
            )
        ) INTO has_conflict;
        
        -- If no conflict and time is valid, return this slot
        IF NOT has_conflict AND current_slot IS NOT NULL THEN
            available_time := current_slot;
            RETURN NEXT;
        END IF;
        
        -- Move to next slot (15-minute intervals)
        current_slot := current_slot + INTERVAL '15 minutes';
        
        -- Safety check to prevent infinite loops
        IF current_slot > business_end THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN;
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail completely - return empty result set
    RAISE WARNING 'Error in get_available_time_slots: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_time_slots TO authenticated, anon;

-- Add improved comment
COMMENT ON FUNCTION get_available_time_slots(DATE, TEXT, TEXT) IS 
'Generates available time slots with comprehensive validation to prevent invalid TIME values. 
Includes proper error handling and safety checks.';

-- Create a validation function to check time format before database operations
CREATE OR REPLACE FUNCTION validate_time_input(input_time TEXT)
RETURNS TIME AS $$
BEGIN
    -- Check if input is null or empty
    IF input_time IS NULL OR input_time = '' THEN
        RAISE EXCEPTION 'Time input cannot be null or empty';
    END IF;
    
    -- Check if input contains 'Invalid' or other corruption indicators
    IF input_time ILIKE '%invalid%' OR input_time ILIKE '%inval%' THEN
        RAISE EXCEPTION 'Invalid time format detected: %', input_time;
    END IF;
    
    -- Try to cast to TIME - this will fail if format is wrong
    RETURN input_time::TIME;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid time format: %. Expected format: HH:MM or HH:MM:SS', input_time;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_time_input TO authenticated, anon;

COMMENT ON FUNCTION validate_time_input IS 
'Validates time input format and prevents corrupted time values from reaching the database.';

-- Update the process_couples_booking_v2 function to use validation
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

CREATE OR REPLACE FUNCTION process_couples_booking_v2(
    p_primary_service_id TEXT,
    p_secondary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_staff_id TEXT,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_booking_date DATE,
    p_start_time TEXT, -- Accept as TEXT to validate
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
    v_validated_start_time TIME;
BEGIN
    -- Validate time input first
    BEGIN
        v_validated_start_time := validate_time_input(p_start_time);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Invalid start time format: ' || p_start_time || '. ' || SQLERRM;
        RETURN;
    END;
    
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
    v_end_time := v_validated_start_time + INTERVAL '1 minute' * v_max_duration;
    
    -- Find optimal room for couples (prioritize rooms that can handle both services)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_id, v_room_name, v_assignment_reason
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, v_validated_start_time);
    
    -- If primary service room doesn't work, try secondary service room
    IF v_room_id IS NULL THEN
        SELECT assigned_room_id, assigned_room_name, assignment_reason 
        INTO v_room_id, v_room_name, v_assignment_reason
        FROM assign_optimal_room(p_secondary_service_id, p_secondary_staff_id, p_booking_date, v_validated_start_time);
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            COALESCE(v_assignment_reason, 'No suitable room available for couples booking');
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
            p_booking_date, v_validated_start_time, v_end_time,
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
                p_booking_date, v_validated_start_time, v_end_time,
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

COMMENT ON FUNCTION process_couples_booking_v2 IS 'Creates couples bookings with comprehensive time validation and error handling.';