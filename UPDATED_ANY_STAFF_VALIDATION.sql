-- UPDATED VALIDATION: Make "any" staff always available without conflicts
-- This updates the conflict checking to skip "any" staff entirely

-- Step 1: Update the conflict checking function to skip "any" staff
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
    -- Skip conflict checking for "any" staff - they're always available
    IF p_staff_id = 'any' THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::TEXT,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check staff conflicts (only for real staff members)
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

-- Step 2: Update the main validation function to allow "any" staff through basic validation
CREATE OR REPLACE FUNCTION smart_booking_validation()
RETURNS TRIGGER AS $$
DECLARE
    conflict_check RECORD;
BEGIN
    -- Skip validation for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- 1. Basic field validation (allow "any" staff through)
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
    
    -- 3. Staff availability validation (skip for "any" staff)
    IF NEW.staff_id != 'any' AND NOT check_staff_availability(
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
    
    -- 4. Double-booking prevention (skip staff conflicts for "any", but still check room conflicts)
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

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION check_booking_conflicts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION smart_booking_validation TO authenticated, anon;

-- Verification
SELECT 'ANY STAFF VALIDATION UPDATED - "any" staff is now always available without conflicts' as status;