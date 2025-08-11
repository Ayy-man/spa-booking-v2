-- Fix get_available_time_slots function to handle text IDs properly
-- and ensure it correctly filters out booked time slots

DROP FUNCTION IF EXISTS get_available_time_slots(DATE, UUID, UUID);
DROP FUNCTION IF EXISTS get_available_time_slots(DATE, TEXT, TEXT);

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
    business_start TIME := '09:00';
    business_end TIME := '19:00';
    buffer_minutes INTEGER := 15; -- 15-minute buffer between appointments
    current_slot TIME;
    slot_end_time TIME;
    has_conflict BOOLEAN;
BEGIN
    -- Get service duration if service_id is provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration INTO service_duration FROM services WHERE id = p_service_id;
        IF service_duration IS NULL THEN
            service_duration := 60; -- Default if service not found
        END IF;
    ELSE
        service_duration := 60; -- Default 1 hour if no service specified
    END IF;
    
    -- Generate time slots from business start to end with buffer
    current_slot := business_start;
    
    WHILE current_slot + INTERVAL '1 minute' * service_duration <= business_end LOOP
        -- Calculate when this slot would end (service duration only, buffer is for spacing)
        slot_end_time := current_slot + INTERVAL '1 minute' * service_duration;
        
        -- Check if this time slot conflicts with existing bookings
        SELECT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.appointment_date = p_date
            AND b.status != 'cancelled'
            AND (
                -- New slot overlaps with existing booking (including buffer)
                (current_slot < b.end_time + INTERVAL '1 minute' * buffer_minutes 
                 AND slot_end_time > b.start_time)
            )
        ) INTO has_conflict;
        
        -- If no conflict, add this time slot
        IF NOT has_conflict THEN
            available_time := current_slot;
            RETURN NEXT;
        END IF;
        
        -- Move to next slot (15-minute intervals)
        current_slot := current_slot + INTERVAL '15 minutes';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_time_slots TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_available_time_slots(DATE, TEXT, TEXT) IS 
'Generates available time slots excluding booked times with 15-minute buffers. Uses text IDs for services and staff.';

-- Also create a simpler version that just returns time slots without complex room/staff logic
-- This can be used as a fallback
CREATE OR REPLACE FUNCTION get_simple_time_slots(
    p_date DATE,
    p_service_duration INTEGER DEFAULT 60
)
RETURNS TABLE (
    available_time TIME
) AS $$
DECLARE
    business_start TIME := '09:00';
    business_end TIME := '19:00';
    current_slot TIME;
    slot_end_time TIME;
    has_conflict BOOLEAN;
BEGIN
    -- Generate time slots every 15 minutes
    current_slot := business_start;
    
    WHILE current_slot + INTERVAL '1 minute' * p_service_duration <= business_end LOOP
        slot_end_time := current_slot + INTERVAL '1 minute' * p_service_duration;
        
        -- Check if this time slot conflicts with existing bookings
        SELECT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.appointment_date = p_date
            AND b.status != 'cancelled'
            AND (
                -- Check for overlap
                (current_slot < b.end_time AND slot_end_time > b.start_time)
            )
        ) INTO has_conflict;
        
        -- If no conflict, add this time slot
        IF NOT has_conflict THEN
            available_time := current_slot;
            RETURN NEXT;
        END IF;
        
        -- Move to next slot (15-minute intervals)
        current_slot := current_slot + INTERVAL '15 minutes';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_simple_time_slots TO authenticated, anon;

COMMENT ON FUNCTION get_simple_time_slots(DATE, INTEGER) IS 
'Simple time slot generation that excludes booked times. Fallback function for when complex logic fails.';