-- URGENT FIX: Copy and paste this SQL into Supabase Dashboard SQL Editor
-- This fixes the "column 'schedule' does not exist" error causing booking failures

-- Step 1: Drop the problematic functions from the previous migration
DROP FUNCTION IF EXISTS validate_staff_schedule(TEXT, DATE, TIME, TIME) CASCADE;
DROP FUNCTION IF EXISTS validate_booking_staff_schedule() CASCADE;
DROP TRIGGER IF EXISTS validate_booking_staff_schedule_trigger ON bookings;

-- Step 2: Create corrected staff schedule validation function
CREATE OR REPLACE FUNCTION validate_staff_schedule(
    p_staff_id TEXT,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_record RECORD;
    day_of_week INTEGER;
    schedule_record RECORD;
BEGIN
    -- Get staff details
    SELECT * INTO staff_record 
    FROM staff 
    WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE; -- Staff not found or inactive
    END IF;
    
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week := EXTRACT(dow FROM p_booking_date);
    
    -- Check if staff works on this day using work_days array
    IF NOT (day_of_week = ANY(staff_record.work_days)) THEN
        RETURN FALSE; -- Staff doesn't work on this day
    END IF;
    
    -- Check if there's a specific schedule entry for this date
    SELECT * INTO schedule_record
    FROM staff_schedules
    WHERE staff_id = p_staff_id 
      AND date = p_booking_date;
    
    -- If specific schedule exists, use it
    IF FOUND THEN
        -- Check if staff is available on this specific date
        IF NOT schedule_record.is_available THEN
            RETURN FALSE;
        END IF;
        
        -- Check if booking time is within scheduled hours
        IF p_start_time < schedule_record.start_time OR p_end_time > schedule_record.end_time THEN
            RETURN FALSE;
        END IF;
        
        -- Check if booking conflicts with break time
        IF schedule_record.break_start IS NOT NULL AND schedule_record.break_end IS NOT NULL THEN
            IF NOT (p_end_time <= schedule_record.break_start OR p_start_time >= schedule_record.break_end) THEN
                RETURN FALSE; -- Booking conflicts with break time
            END IF;
        END IF;
    ELSE
        -- No specific schedule, use default business hours (9 AM - 7 PM)
        IF p_start_time < '09:00'::time OR p_end_time > '19:00'::time THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE; -- Staff is available
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function that validates staff availability
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
        RAISE EXCEPTION 'Staff member % is not available at the requested time on %', 
            NEW.staff_id, NEW.appointment_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to validate staff availability before inserting/updating bookings
CREATE TRIGGER validate_booking_staff_schedule_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION validate_booking_staff_schedule();

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_staff_schedule TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_booking_staff_schedule TO authenticated, anon;