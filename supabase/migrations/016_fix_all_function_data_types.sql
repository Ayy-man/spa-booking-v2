-- CRITICAL FIX: Update all database functions to use TEXT instead of UUID for service_id and staff_id
-- This fixes the "invalid input syntax for type uuid" error in couples booking

-- 1. Fix assign_optimal_room function
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
            -- Check for conflicts in Room 3
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = 3 
                AND booking_date = p_booking_date 
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
                AND booking_date = p_booking_date 
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
                AND booking_date = p_booking_date 
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
                    AND booking_date = p_booking_date 
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
                AND booking_date = p_booking_date 
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
    
    -- No suitable room found
    RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'No suitable room available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix check_staff_capability function
DROP FUNCTION IF EXISTS check_staff_capability CASCADE;

CREATE OR REPLACE FUNCTION check_staff_capability(
    p_staff_id TEXT,
    p_service_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    service_category service_category;
    staff_capabilities service_category[];
BEGIN
    -- Get service category
    SELECT category INTO service_category FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get staff capabilities
    SELECT capabilities INTO staff_capabilities FROM staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if staff has the required capability
    RETURN service_category = ANY(staff_capabilities);
END;
$$ LANGUAGE plpgsql;

-- 3. Fix get_staff_schedule function
DROP FUNCTION IF EXISTS get_staff_schedule CASCADE;

CREATE OR REPLACE FUNCTION get_staff_schedule(
    p_staff_id TEXT,
    p_date DATE
)
RETURNS TABLE (
    is_working BOOLEAN,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    notes TEXT
) AS $$
DECLARE
    schedule_record RECORD;
    day_of_week INTEGER;
    staff_work_days INTEGER[];
BEGIN
    -- Get the day of week (0 = Sunday, 1 = Monday, etc.)
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- First check if there's a specific schedule for this date
    SELECT * INTO schedule_record 
    FROM staff_schedules 
    WHERE staff_id = p_staff_id AND date = p_date;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            schedule_record.is_available,
            schedule_record.start_time,
            schedule_record.end_time,
            schedule_record.break_start,
            schedule_record.break_end,
            schedule_record.notes;
        RETURN;
    END IF;
    
    -- Fall back to staff's regular work days
    SELECT work_days INTO staff_work_days FROM staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, NULL::TIME, NULL::TIME, 'Staff not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if staff works on this day of week
    IF day_of_week = ANY(staff_work_days) THEN
        -- Return default working hours (can be customized)
        RETURN QUERY SELECT true, '09:00'::TIME, '18:00'::TIME, '12:00'::TIME, '13:00'::TIME, 'Regular schedule'::TEXT;
    ELSE
        RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, NULL::TIME, NULL::TIME, 'Not scheduled to work'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_staff_capability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_staff_schedule TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION assign_optimal_room IS 'Assigns optimal room based on service requirements and availability - TEXT parameters';
COMMENT ON FUNCTION check_staff_capability IS 'Checks if staff member can perform specific service - TEXT parameters';
COMMENT ON FUNCTION get_staff_schedule IS 'Gets staff schedule for specific date - TEXT parameters';