-- Fix room assignment function to use correct column name 'appointment_date' instead of 'booking_date'
-- This fixes the "room not available for given time" error

DROP FUNCTION IF EXISTS assign_optimal_room CASCADE;

CREATE OR REPLACE FUNCTION assign_optimal_room(
    p_service_id TEXT,
    p_preferred_staff_id TEXT DEFAULT NULL,
    p_booking_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL
)
RETURNS TABLE (
    assigned_room_id INTEGER,
    assigned_room_name VARCHAR,
    assignment_reason TEXT
) AS $$
DECLARE
    service_record RECORD;
    room_record RECORD;
    available_rooms INTEGER[];
    selected_room_id INTEGER;
    assignment_reason TEXT;
BEGIN
    -- Get service details
    SELECT * INTO service_record FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'Service not found'::TEXT;
        RETURN;
    END IF;
    
    -- Special handling for body scrub services (must use Room 3)
    IF service_record.requires_room_3 = true THEN
        -- Check if Room 3 is available
        IF p_booking_date IS NOT NULL AND p_start_time IS NOT NULL THEN
            -- Check for conflicts in Room 3 using correct column name
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = 3 
                AND appointment_date = p_booking_date 
                AND (
                    (start_time <= p_start_time AND end_time > p_start_time) OR
                    (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                )
                AND status != 'cancelled'
            ) THEN
                RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Required for body scrub services'::TEXT;
                RETURN;
            ELSE
                RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'Room 3 required but not available at this time'::TEXT;
                RETURN;
            END IF;
        ELSE
            -- No time specified, assume Room 3 is available
            RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Required for body scrub services'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- For couples services, prefer rooms with capacity >= 2
    IF service_record.is_couples_service = true THEN
        -- Try Room 3 first (largest capacity)
        IF p_booking_date IS NOT NULL AND p_start_time IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = 3 
                AND appointment_date = p_booking_date 
                AND (
                    (start_time <= p_start_time AND end_time > p_start_time) OR
                    (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                )
                AND status != 'cancelled'
            ) THEN
                RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Preferred for couples services'::TEXT;
                RETURN;
            END IF;
            
            -- Try Room 2 as fallback
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = 2 
                AND appointment_date = p_booking_date 
                AND (
                    (start_time <= p_start_time AND end_time > p_start_time) OR
                    (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                )
                AND status != 'cancelled'
            ) THEN
                RETURN QUERY SELECT 2::INTEGER, 'Room 2'::VARCHAR, 'Fallback for couples services'::TEXT;
                RETURN;
            END IF;
        ELSE
            -- No time specified, prefer Room 3
            RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Preferred for couples services'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- For regular services, use standard room assignment logic
    -- Check staff's preferred room first
    IF p_preferred_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO selected_room_id 
        FROM staff 
        WHERE id = p_preferred_staff_id AND is_active = true;
        
        IF selected_room_id IS NOT NULL THEN
            -- Check if preferred room is available
            IF p_booking_date IS NOT NULL AND p_start_time IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM bookings 
                    WHERE room_id = selected_room_id 
                    AND appointment_date = p_booking_date 
                    AND (
                        (start_time <= p_start_time AND end_time > p_start_time) OR
                        (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                    )
                    AND status != 'cancelled'
                ) THEN
                    SELECT name INTO assignment_reason FROM rooms WHERE id = selected_room_id;
                    RETURN QUERY SELECT selected_room_id, assignment_reason::VARCHAR, 'Staff preferred room'::TEXT;
                    RETURN;
                END IF;
            ELSE
                -- No time specified, use staff's preferred room
                SELECT name INTO assignment_reason FROM rooms WHERE id = selected_room_id;
                RETURN QUERY SELECT selected_room_id, assignment_reason::VARCHAR, 'Staff preferred room'::TEXT;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- Find any available room based on service category
    FOR room_record IN 
        SELECT r.* FROM rooms r 
        WHERE r.is_active = true 
        AND service_record.category = ANY(r.capabilities)
        ORDER BY r.id
    LOOP
        -- Check availability if date/time provided
        IF p_booking_date IS NOT NULL AND p_start_time IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = room_record.id 
                AND appointment_date = p_booking_date 
                AND (
                    (start_time <= p_start_time AND end_time > p_start_time) OR
                    (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                )
                AND status != 'cancelled'
            ) THEN
                RETURN QUERY SELECT room_record.id, room_record.name::VARCHAR, 'Available room with required capabilities'::TEXT;
                RETURN;
            END IF;
        ELSE
            -- No time specified, use first room with capabilities
            RETURN QUERY SELECT room_record.id, room_record.name::VARCHAR, 'Room with required capabilities'::TEXT;
            RETURN;
        END IF;
    END LOOP;
    
    -- If no room found based on capabilities, try any available room (failsafe)
    FOR room_record IN 
        SELECT r.* FROM rooms r 
        WHERE r.is_active = true 
        ORDER BY r.id
    LOOP
        -- Check availability if date/time provided
        IF p_booking_date IS NOT NULL AND p_start_time IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = room_record.id 
                AND appointment_date = p_booking_date 
                AND (
                    (start_time <= p_start_time AND end_time > p_start_time) OR
                    (start_time < (p_start_time + INTERVAL '1 minute' * service_record.duration) AND end_time >= (p_start_time + INTERVAL '1 minute' * service_record.duration))
                )
                AND status != 'cancelled'
            ) THEN
                RETURN QUERY SELECT room_record.id, room_record.name::VARCHAR, 'Available room (fallback)'::TEXT;
                RETURN;
            END IF;
        ELSE
            -- No time specified, use first available room
            RETURN QUERY SELECT room_record.id, room_record.name::VARCHAR, 'Room available (fallback)'::TEXT;
            RETURN;
        END IF;
    END LOOP;
    
    -- No suitable room found
    RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'No suitable room available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated, anon;

-- Comment
COMMENT ON FUNCTION assign_optimal_room IS 'Assigns optimal room based on service requirements and availability - Fixed date column reference';