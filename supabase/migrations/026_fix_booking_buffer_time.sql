-- Fix booking conflicts to include 15-minute buffer time between appointments
-- This prevents errors like "Room is already booked for this time slot"

-- Drop existing triggers first (they depend on the function)
DROP TRIGGER IF EXISTS check_booking_conflicts_trigger ON bookings;
DROP TRIGGER IF EXISTS validate_booking_trigger ON bookings;

-- Drop existing conflict checking function
DROP FUNCTION IF EXISTS check_booking_conflicts();

-- Recreate the conflict checking function with 15-minute buffer
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    buffer_time INTERVAL := INTERVAL '15 minutes';
    conflict_count INTEGER;
BEGIN
    -- Check for room conflicts with buffer time
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE room_id = NEW.room_id 
    AND appointment_date = NEW.appointment_date 
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        -- Check if new booking overlaps with existing bookings INCLUDING buffer time
        -- New booking starts before existing ends (with buffer) AND new booking ends after existing starts
        (NEW.start_time < (end_time + buffer_time) AND NEW.end_time > start_time)
        OR
        -- Existing booking starts before new ends (with buffer) AND existing ends after new starts
        (start_time < (NEW.end_time + buffer_time) AND end_time > NEW.start_time)
    );
    
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Room is already booked for this time slot (including 15-minute buffer between appointments)';
    END IF;
    
    -- Check for staff conflicts with buffer time
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE staff_id = NEW.staff_id 
    AND appointment_date = NEW.appointment_date 
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
        -- Check if new booking overlaps with existing bookings INCLUDING buffer time
        (NEW.start_time < (end_time + buffer_time) AND NEW.end_time > start_time)
        OR
        (start_time < (NEW.end_time + buffer_time) AND end_time > NEW.start_time)
    );
    
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Staff member is already booked for this time slot (including 15-minute buffer between appointments)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the comment to reflect buffer time
COMMENT ON FUNCTION check_booking_conflicts() IS 'Prevents double-booking of staff and rooms with 15-minute buffer between appointments';

-- Create a helper function to check availability before booking
CREATE OR REPLACE FUNCTION is_time_slot_available(
    p_room_id INTEGER,
    p_staff_id TEXT,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    buffer_time INTERVAL := INTERVAL '15 minutes';
    conflict_exists BOOLEAN;
BEGIN
    -- Check for any conflicts
    SELECT EXISTS (
        SELECT 1 FROM bookings 
        WHERE (room_id = p_room_id OR staff_id = p_staff_id)
        AND appointment_date = p_appointment_date 
        AND status != 'cancelled'
        AND id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (p_start_time < (end_time + buffer_time) AND p_end_time > start_time)
            OR
            (start_time < (p_end_time + buffer_time) AND end_time > p_start_time)
        )
    ) INTO conflict_exists;
    
    RETURN NOT conflict_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_time_slot_available IS 'Checks if a time slot is available for booking considering 15-minute buffer';

-- Create a function to calculate the actual end time with buffer
CREATE OR REPLACE FUNCTION calculate_end_time_with_buffer(
    p_start_time TIME,
    p_duration INTEGER
)
RETURNS TIME AS $$
BEGIN
    -- Add duration to start time to get base end time
    -- Note: Duration is in minutes
    RETURN p_start_time + (p_duration || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_end_time_with_buffer IS 'Calculates the end time of a service based on start time and duration';

-- Create a view to show available time slots for a given date and service
CREATE OR REPLACE VIEW available_time_slots AS
SELECT DISTINCT
    generate_series(
        '09:00'::TIME,
        '18:00'::TIME,  -- Last appointment start time (closes at 19:00)
        '15 minutes'::INTERVAL
    ) AS time_slot,
    NULL::DATE AS appointment_date,
    NULL::TEXT AS service_id,
    NULL::INTEGER AS room_id,
    NULL::TEXT AS staff_id;

COMMENT ON VIEW available_time_slots IS 'Template view for generating available time slots - use with WHERE conditions';

-- Add index to improve performance of conflict checking
CREATE INDEX IF NOT EXISTS idx_bookings_conflicts 
ON bookings (room_id, staff_id, appointment_date, start_time, end_time) 
WHERE status != 'cancelled';

-- Add constraint to ensure duration matches the time difference
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS check_duration_matches_times;

ALTER TABLE bookings 
ADD CONSTRAINT check_duration_matches_times 
CHECK (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60 = duration
);

-- Update existing bookings to ensure end_time is calculated correctly
UPDATE bookings 
SET end_time = start_time + (duration || ' minutes')::INTERVAL
WHERE end_time != start_time + (duration || ' minutes')::INTERVAL;

-- Recreate the triggers
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking_time();

CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();