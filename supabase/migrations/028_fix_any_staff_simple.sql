-- Simple fix for "Any Staff" booking conflicts
-- Only skip staff conflict checking when staff_id = 'any'
-- Still validate room conflicts and specific staff assignments normally

-- Drop existing triggers to modify the function
DROP TRIGGER IF EXISTS check_booking_conflicts_trigger ON bookings;

-- Drop views that depend on staff_id column
DROP VIEW IF EXISTS staff_availability;

-- Keep the existing conflict checking function but modify it to handle 'any' staff
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    buffer_time INTERVAL := INTERVAL '15 minutes';
    conflict_count INTEGER;
BEGIN
    -- Always check for room conflicts (regardless of staff selection)
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE room_id = NEW.room_id 
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
        RAISE EXCEPTION 'Room is already booked for this time slot (including 15-minute buffer between appointments)';
    END IF;
    
    -- Only check for staff conflicts if a SPECIFIC staff member is selected (not 'any')
    IF NEW.staff_id != 'any' THEN
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the availability checking function to handle 'any' staff
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
    -- Always check room conflicts first
    SELECT EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = p_room_id
        AND appointment_date = p_appointment_date 
        AND status != 'cancelled'
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND (
            (p_start_time < (end_time + buffer_time) AND p_end_time > start_time)
            OR
            (start_time < (p_end_time + buffer_time) AND end_time > p_start_time)
        )
    ) INTO conflict_exists;
    
    -- If room is not available, slot is not available
    IF conflict_exists THEN
        RETURN FALSE;
    END IF;
    
    -- For specific staff requests, also check staff availability
    IF p_staff_id != 'any' THEN
        SELECT EXISTS (
            SELECT 1 FROM bookings 
            WHERE staff_id = p_staff_id
            AND appointment_date = p_appointment_date 
            AND status != 'cancelled'
            AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
            AND (
                (p_start_time < (end_time + buffer_time) AND p_end_time > start_time)
                OR
                (start_time < (p_end_time + buffer_time) AND end_time > p_start_time)
            )
        ) INTO conflict_exists;
        
        -- If specific staff is not available, slot is not available
        IF conflict_exists THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- For 'any' staff: as long as room is free, we consider it available
    -- (staff will be assigned manually later)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add index to help identify unassigned bookings (if staff_id becomes text later)
-- CREATE INDEX IF NOT EXISTS idx_unassigned_bookings 
-- ON bookings (staff_id, appointment_date, status) 
-- WHERE staff_id = 'any' AND status != 'cancelled';

-- Recreate the trigger
CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();

-- Add a helpful view to track unassigned bookings for admin (when staff_id becomes text)
-- CREATE OR REPLACE VIEW unassigned_bookings AS
-- SELECT 
--     b.*,
--     s.name as service_name,
--     r.name as room_name,
--     c.first_name || ' ' || c.last_name as customer_name,
--     c.email as customer_email
-- FROM bookings b
-- LEFT JOIN services s ON b.service_id = s.id
-- LEFT JOIN rooms r ON b.room_id = r.id
-- LEFT JOIN customers c ON b.customer_id = c.id
-- WHERE b.staff_id = 'any' 
-- AND b.status != 'cancelled'
-- ORDER BY b.appointment_date ASC, b.start_time ASC;

-- Update comment
COMMENT ON FUNCTION check_booking_conflicts() IS 'Prevents double-booking of rooms and staff with 15-minute buffer. Skips staff conflicts when staff_id = "any" for manual assignment.';