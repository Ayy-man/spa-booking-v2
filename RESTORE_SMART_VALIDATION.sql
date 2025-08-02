-- SMART VALIDATION: Restore essential business rules without buffer time issues
-- This enforces staff schedules, business hours, and prevents double-booking
-- But does NOT enforce buffer time between appointments

-- Step 1: Drop existing minimal validation
DROP TRIGGER IF EXISTS minimal_booking_validation_trigger ON bookings;
DROP FUNCTION IF EXISTS minimal_booking_validation() CASCADE;

-- Step 2: Create function to check staff work days and schedules
CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id TEXT,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_record RECORD;
    day_of_week INTEGER;
    schedule_override RECORD;
BEGIN
    -- Special handling for "any" staff
    IF p_staff_id = 'any' THEN
        RETURN TRUE;
    END IF;
    
    -- Get staff details with work_days
    SELECT * INTO staff_record 
    FROM staff 
    WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE; -- Staff not found or inactive
    END IF;
    
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    day_of_week := EXTRACT(dow FROM p_booking_date);
    
    -- Check if staff works on this day
    IF NOT (day_of_week = ANY(staff_record.work_days)) THEN
        RETURN FALSE; -- Staff doesn't work on this day
    END IF;
    
    -- Check for specific schedule override in staff_schedules table
    SELECT * INTO schedule_override
    FROM staff_schedules
    WHERE staff_id = p_staff_id 
      AND date = p_booking_date;
    
    IF FOUND THEN
        -- Check if marked unavailable
        IF NOT schedule_override.is_available THEN
            RETURN FALSE;
        END IF;
        
        -- Check if within scheduled hours
        IF p_start_time < schedule_override.start_time OR p_end_time > schedule_override.end_time THEN
            RETURN FALSE;
        END IF;
        
        -- Check break time (if any)
        IF schedule_override.break_start IS NOT NULL AND schedule_override.break_end IS NOT NULL THEN
            IF NOT (p_end_time <= schedule_override.break_start OR p_start_time >= schedule_override.break_end) THEN
                RETURN FALSE; -- Conflicts with break
            END IF;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to check for double-booking (without buffer time)
CREATE OR REPLACE FUNCTION check_booking_conflicts(
    p_staff_id TEXT,
    p_room_id INTEGER,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
    has_conflict BOOLEAN,
    conflict_type TEXT,
    conflict_details TEXT
) AS $$
BEGIN
    -- Check staff conflicts
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
          AND appointment_date = p_booking_date
          AND status != 'cancelled'
          AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
          AND (
              -- New booking overlaps with existing
              (p_start_time < end_time AND p_end_time > start_time)
          )
    ) THEN
        RETURN QUERY SELECT 
            TRUE,
            'staff'::TEXT,
            'Staff member is already booked at this time'::TEXT;
        RETURN;
    END IF;
    
    -- Check room conflicts
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
          AND appointment_date = p_booking_date
          AND status != 'cancelled'
          AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
          AND (
              -- New booking overlaps with existing
              (p_start_time < end_time AND p_end_time > start_time)
          )
    ) THEN
        RETURN QUERY SELECT 
            TRUE,
            'room'::TEXT,
            'Room is already booked at this time'::TEXT;
        RETURN;
    END IF;
    
    -- No conflicts
    RETURN QUERY SELECT 
        FALSE,
        NULL::TEXT,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create main validation function
CREATE OR REPLACE FUNCTION smart_booking_validation()
RETURNS TRIGGER AS $$
DECLARE
    conflict_check RECORD;
BEGIN
    -- Skip validation for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- 1. Basic field validation
    IF NEW.staff_id IS NULL OR NEW.staff_id = '' THEN
        RAISE EXCEPTION 'Staff ID is required';
    END IF;
    
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'Start time must be before end time';
    END IF;
    
    -- 2. Business hours validation (9 AM - 7 PM)
    IF NEW.start_time < '09:00'::time OR NEW.end_time > '19:00'::time THEN
        RAISE EXCEPTION 'Booking must be within business hours (9 AM - 7 PM)';
    END IF;
    
    -- 3. Staff availability validation
    IF NOT check_staff_availability(
        NEW.staff_id,
        NEW.appointment_date,
        NEW.start_time,
        NEW.end_time
    ) THEN
        -- Provide specific error messages based on staff
        IF NEW.staff_id = 'leonel_sidon' AND EXTRACT(dow FROM NEW.appointment_date) != 0 THEN
            RAISE EXCEPTION 'Leonel Sidon only works on Sundays';
        ELSIF NEW.staff_id IN ('selma_villaver', 'tanisha_harris') 
          AND EXTRACT(dow FROM NEW.appointment_date) IN (2, 4) THEN
            RAISE EXCEPTION 'This staff member does not work on Tuesdays or Thursdays';
        ELSE
            RAISE EXCEPTION 'Staff member is not available at the requested time';
        END IF;
    END IF;
    
    -- 4. Double-booking prevention (no buffer time)
    SELECT * INTO conflict_check
    FROM check_booking_conflicts(
        NEW.staff_id,
        NEW.room_id,
        NEW.appointment_date,
        NEW.start_time,
        NEW.end_time,
        CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
    );
    
    IF conflict_check.has_conflict THEN
        IF conflict_check.conflict_type = 'staff' THEN
            RAISE EXCEPTION 'Staff member is already booked at this time';
        ELSIF conflict_check.conflict_type = 'room' THEN
            RAISE EXCEPTION 'Room is already booked at this time';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger
CREATE TRIGGER smart_booking_validation_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION smart_booking_validation();

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION check_staff_availability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_booking_conflicts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION smart_booking_validation TO authenticated, anon;

-- Step 7: Add helpful comments
COMMENT ON FUNCTION check_staff_availability IS 'Checks if staff is available based on work_days and staff_schedules';
COMMENT ON FUNCTION check_booking_conflicts IS 'Checks for double-booking conflicts without buffer time';
COMMENT ON FUNCTION smart_booking_validation IS 'Smart validation that enforces business rules without buffer time issues';

-- Verification
SELECT 'SMART VALIDATION ACTIVE - Essential business rules enforced without buffer time' as status;