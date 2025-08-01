-- URGENT FIX: Run this SQL directly in the Supabase dashboard
-- This fixes the couples booking function signature mismatch

-- Drop the old function to avoid conflicts
DROP FUNCTION IF EXISTS process_couples_booking CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create the function with the parameter order that matches the error message
-- All parameters with defaults must come at the end
CREATE OR REPLACE FUNCTION process_couples_booking_v2(
    p_booking_date DATE,
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_primary_service_id UUID,
    p_primary_staff_id UUID,
    p_secondary_service_id UUID,
    p_secondary_staff_id UUID,
    p_start_time TIME,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    room_id UUID,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id UUID;
    v_room_name VARCHAR;
    v_assignment_reason TEXT;
    v_booking1_id UUID;
    v_booking2_id UUID;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_end_time TIME;
    v_max_duration INTEGER;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get primary service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Primary service not found';
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Secondary service not found';
        RETURN;
    END IF;
    
    -- Calculate end time based on the longer service
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    v_end_time := p_start_time + INTERVAL '1 minute' * v_max_duration;
    
    -- Find optimal room for couples (prioritize rooms that can handle both services)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_id, v_room_name, v_assignment_reason
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, p_start_time);
    
    -- If primary service room doesn't work, try secondary service room
    IF v_room_id IS NULL THEN
        SELECT assigned_room_id, assigned_room_name, assignment_reason 
        INTO v_room_id, v_room_name, v_assignment_reason
        FROM assign_optimal_room(p_secondary_service_id, p_secondary_staff_id, p_booking_date, p_start_time);
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 
            COALESCE(v_assignment_reason, 'No suitable room available for couples booking');
        RETURN;
    END IF;
    
    -- Check room capacity
    IF (SELECT capacity FROM rooms WHERE id = v_room_id) < 2 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 
            'Selected room does not have capacity for couples';
        RETURN;
    END IF;
    
    -- Validate staff availability
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 
            'Cannot book the same staff member for both services';
        RETURN;
    END IF;
    
    -- Begin transaction for atomic booking creation
    BEGIN
        -- Create first booking (primary service)
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email,
            customer_phone, booking_date, start_time, end_time,
            booking_group_id, booking_type, special_requests, total_price
        ) VALUES (
            p_primary_service_id, p_primary_staff_id, v_room_id, 
            p_customer_name, p_customer_email, p_customer_phone, 
            p_booking_date, p_start_time, v_end_time,
            v_booking_group_id, 'couple', p_special_requests, v_primary_service.price
        ) RETURNING id INTO v_booking1_id;
        
        -- Create second booking (secondary service) - only if different from primary
        IF p_primary_service_id != p_secondary_service_id THEN
            INSERT INTO bookings (
                service_id, staff_id, room_id, customer_name, customer_email,
                customer_phone, booking_date, start_time, end_time,
                booking_group_id, booking_type, special_requests, total_price
            ) VALUES (
                p_secondary_service_id, p_secondary_staff_id, v_room_id, 
                p_customer_name || ' (Partner)', p_customer_email, p_customer_phone, 
                p_booking_date, p_start_time, v_end_time,
                v_booking_group_id, 'couple', p_special_requests, v_secondary_service.price
            ) RETURNING id INTO v_booking2_id;
        END IF;
        
        -- Return success with both booking IDs
        RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        IF v_booking2_id IS NOT NULL THEN
            RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 
            'Failed to create bookings: ' || SQLERRM;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated, anon;