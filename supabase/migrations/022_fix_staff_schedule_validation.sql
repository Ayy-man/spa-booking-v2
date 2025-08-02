-- Fix staff schedule validation by handling existing function conflicts
-- This corrects the "function name is not unique" error

-- Drop any existing functions with conflicting names
DROP FUNCTION IF EXISTS check_staff_availability() CASCADE;
DROP FUNCTION IF EXISTS check_staff_availability(TEXT, DATE, TIME, TIME) CASCADE;
DROP FUNCTION IF EXISTS validate_staff_schedule(TEXT, DATE, TIME, TIME) CASCADE;

-- Function to validate if staff member is available on a specific date/time
CREATE OR REPLACE FUNCTION validate_staff_schedule(
    p_staff_id TEXT,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_schedule JSONB;
    day_name TEXT;
    day_schedule JSONB;
    is_available BOOLEAN;
    work_start TIME;
    work_end TIME;
BEGIN
    -- Get the day of week name
    day_name := LOWER(to_char(p_booking_date, 'dy'));
    
    -- Map day names to the format used in staff schedule JSON
    CASE day_name
        WHEN 'mon' THEN day_name := 'mon';
        WHEN 'tue' THEN day_name := 'tue';
        WHEN 'wed' THEN day_name := 'wed';
        WHEN 'thu' THEN day_name := 'thu';
        WHEN 'fri' THEN day_name := 'fri';
        WHEN 'sat' THEN day_name := 'sat';
        WHEN 'sun' THEN day_name := 'sun';
        ELSE
            RETURN FALSE; -- Invalid day
    END CASE;
    
    -- Get staff schedule from the staff table
    SELECT schedule INTO staff_schedule 
    FROM staff 
    WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE; -- Staff not found or inactive
    END IF;
    
    -- Get the specific day schedule
    day_schedule := staff_schedule->day_name;
    
    IF day_schedule IS NULL THEN
        RETURN FALSE; -- No schedule defined for this day
    END IF;
    
    -- Check if staff is available on this day
    is_available := COALESCE((day_schedule->>'available')::boolean, false);
    
    IF NOT is_available THEN
        RETURN FALSE; -- Staff not available on this day
    END IF;
    
    -- Check if booking time is within staff working hours
    work_start := COALESCE((day_schedule->>'start_time')::time, '09:00'::time);
    work_end := COALESCE((day_schedule->>'end_time')::time, '19:00'::time);
    
    -- Validate that the booking time is within working hours
    IF p_start_time < work_start OR p_end_time > work_end THEN
        RETURN FALSE; -- Booking outside working hours
    END IF;
    
    RETURN TRUE; -- Staff is available
END;
$$ LANGUAGE plpgsql;

-- Function to be called by trigger to validate staff availability
CREATE OR REPLACE FUNCTION validate_booking_staff_schedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- Validate staff availability using their schedule
    IF NOT validate_staff_schedule(
        NEW.staff_id, 
        NEW.appointment_date, 
        NEW.start_time, 
        NEW.end_time
    ) THEN
        RAISE EXCEPTION 'Staff member is not available at the requested time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_staff_availability_trigger ON bookings;
DROP TRIGGER IF EXISTS validate_booking_staff_schedule_trigger ON bookings;

-- Create trigger to validate staff availability before inserting/updating bookings
CREATE TRIGGER validate_booking_staff_schedule_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION validate_booking_staff_schedule();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_staff_schedule TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_booking_staff_schedule TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION validate_staff_schedule IS 'Validates if a staff member is available based on their schedule JSON for a specific date and time';
COMMENT ON FUNCTION validate_booking_staff_schedule IS 'Trigger function that validates staff availability before booking creation/update';

-- Test the validation with some sample data (these should all fail if run manually)
-- SELECT validate_staff_schedule('dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-08-05', '10:00', '11:00'); -- Leonel on Monday (should be FALSE)
-- SELECT validate_staff_schedule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-08-06', '10:00', '11:00'); -- Selma on Tuesday (should be FALSE)
-- SELECT validate_staff_schedule('dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-08-04', '10:00', '11:00'); -- Leonel on Sunday (should be TRUE)