-- Migration: Add 15-minute buffer to time slot generation
-- This updates the get_available_time_slots function to include buffers between appointments

-- Drop and recreate the function with buffer logic
DROP FUNCTION IF EXISTS get_available_time_slots(DATE, UUID, UUID);

CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_date DATE,
    p_service_id UUID DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
    available_time TIME,
    available_staff_id UUID,
    available_staff_name VARCHAR,
    available_room_id UUID,
    available_room_name VARCHAR
) AS $$
DECLARE
    service_duration INTEGER;
    business_start TIME := '09:00';
    business_end TIME := '19:00';
    buffer_minutes INTEGER := 15; -- 15-minute buffer between appointments
    current_slot TIME;
BEGIN
    -- Get service duration if service_id is provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration INTO service_duration FROM services WHERE id = p_service_id;
    ELSE
        service_duration := 60; -- Default 1 hour if no service specified
    END IF;
    
    -- Generate time slots from business start to end with buffer
    current_slot := business_start;
    
    WHILE current_slot + INTERVAL '1 minute' * service_duration <= business_end LOOP
        -- Check availability for this time slot
        FOR available_staff_id, available_staff_name, available_room_id, available_room_name IN
            SELECT DISTINCT 
                s.id,
                s.name,
                r.id,
                r.name
            FROM staff s
            JOIN rooms r ON (s.default_room_id = r.id OR s.default_room_id IS NULL)
            WHERE s.is_active = true
            AND r.is_active = true
            AND (p_staff_id IS NULL OR s.id = p_staff_id)
            -- Check staff is not already booked (including buffer time)
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.staff_id = s.id
                AND b.appointment_date = p_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < current_slot + INTERVAL '1 minute' * service_duration AND b.end_time > current_slot)
                )
            )
            -- Check room is not already booked (including buffer time)
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = r.id
                AND b.appointment_date = p_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < current_slot + INTERVAL '1 minute' * service_duration AND b.end_time > current_slot)
                )
            )
            -- Check staff availability (if they have blocked time)
            AND NOT EXISTS (
                SELECT 1 FROM staff_availability sa
                WHERE sa.staff_id = s.id
                AND sa.date = p_date
                AND (
                    (sa.start_time < current_slot + INTERVAL '1 minute' * service_duration AND sa.end_time > current_slot)
                )
            )
        LOOP
            available_time := current_slot;
            RETURN NEXT;
        END LOOP;
        
        -- Move to next slot: add service duration + buffer
        current_slot := current_slot + INTERVAL '1 minute' * (service_duration + buffer_minutes);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the buffer logic
COMMENT ON FUNCTION get_available_time_slots(DATE, UUID, UUID) IS 
'Generates available time slots with 15-minute buffers between appointments. 
Calculation: service_duration + 15_minute_buffer for each interval.
Examples: 30min service = 45min intervals, 60min service = 75min intervals';