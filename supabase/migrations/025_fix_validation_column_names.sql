-- Fix validation functions to use correct column name 'appointment_date' instead of 'booking_date'
-- This fixes the "Staff member is not available at the requested time" error

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS validate_booking_trigger ON bookings;
DROP TRIGGER IF EXISTS check_booking_conflicts_trigger ON bookings;
DROP FUNCTION IF EXISTS validate_booking_time();
DROP FUNCTION IF EXISTS check_booking_conflicts();

-- Recreate the validation function with correct column name
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

-- Recreate the conflict checking function with correct column name
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for room conflicts
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = NEW.room_id 
        AND appointment_date = NEW.appointment_date 
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Room is already booked for this time slot';
    END IF;
    
    -- Check for staff conflicts
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE staff_id = NEW.staff_id 
        AND appointment_date = NEW.appointment_date 
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Staff member is already booked for this time slot';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking_time();

CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();

-- Add helpful comment
COMMENT ON FUNCTION validate_booking_time() IS 'Validates booking time constraints (business hours, date range)';
COMMENT ON FUNCTION check_booking_conflicts() IS 'Prevents double-booking of staff and rooms';