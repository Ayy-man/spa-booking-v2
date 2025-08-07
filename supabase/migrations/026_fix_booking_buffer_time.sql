-- Fix booking conflicts to include 15-minute buffer time between appointments
-- This prevents errors like "Room is already booked for this time slot"

-- Drop existing triggers first (they depend on the function)
DROP TRIGGER IF EXISTS check_booking_conflicts_trigger ON bookings;
DROP TRIGGER IF EXISTS validate_booking_trigger ON bookings;

-- Drop existing functions
DROP FUNCTION IF EXISTS check_booking_conflicts();
DROP FUNCTION IF EXISTS validate_booking_time();

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
    AND (NEW.id IS NULL OR id != NEW.id)
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
    AND (NEW.id IS NULL OR id != NEW.id)
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

-- Create the validate_booking_time function
CREATE OR REPLACE FUNCTION validate_booking_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if booking is within business hours (9 AM - 7 PM)
    IF NEW.start_time < '09:00'::time OR NEW.end_time > '19:00'::time THEN
        RAISE EXCEPTION 'Bookings must be between 9 AM and 7 PM';
    END IF;
    
    -- Check if booking date is not in the past
    IF NEW.appointment_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot book appointments in the past';
    END IF;
    
    -- Check if booking date is not more than 30 days in advance
    IF NEW.appointment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Cannot book more than 30 days in advance';
    END IF;
    
    -- Check if end time is after start time
    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'End time must be after start time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_booking_time() IS 'Validates booking time constraints (business hours, date range)';

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
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
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

-- Remove problematic view - causing SQL syntax errors

-- Add index to improve performance of conflict checking
CREATE INDEX IF NOT EXISTS idx_bookings_conflicts 
ON bookings (room_id, staff_id, appointment_date, start_time, end_time) 
WHERE status != 'cancelled';

-- Update existing bookings to ensure end_time is calculated correctly
UPDATE bookings 
SET end_time = start_time + (duration || ' minutes')::INTERVAL
WHERE end_time != start_time + (duration || ' minutes')::INTERVAL;

-- Add constraint to ensure duration matches the time difference (after fixing data)
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS check_duration_matches_times;

ALTER TABLE bookings 
ADD CONSTRAINT check_duration_matches_times 
CHECK (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60 = duration
);

-- Recreate the triggers
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking_time();

CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();