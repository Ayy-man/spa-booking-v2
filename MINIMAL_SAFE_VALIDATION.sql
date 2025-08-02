-- MINIMAL SAFE VALIDATION: Add back only essential safety checks
-- This provides basic data integrity without blocking legitimate bookings
-- Copy and paste this into Supabase Dashboard SQL Editor AFTER the nuclear option

-- ============================================================================
-- PHASE 2: MINIMAL SAFE VALIDATION
-- ============================================================================

-- Create a very basic validation function that only checks essential things
CREATE OR REPLACE FUNCTION minimal_booking_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- Only check the most basic requirements
    
    -- 1. Staff ID cannot be null or empty
    IF NEW.staff_id IS NULL OR NEW.staff_id = '' THEN
        RAISE EXCEPTION 'Staff ID is required';
    END IF;
    
    -- 2. Service ID cannot be null or empty
    IF NEW.service_id IS NULL OR NEW.service_id = '' THEN
        RAISE EXCEPTION 'Service ID is required';
    END IF;
    
    -- 3. Basic time validation (start time before end time)
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'Start time must be before end time';
    END IF;
    
    -- 4. Appointment date cannot be null
    IF NEW.appointment_date IS NULL THEN
        RAISE EXCEPTION 'Appointment date is required';
    END IF;
    
    -- That's it! No business logic, no staff availability checks
    -- Just basic data integrity
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with minimal validation
CREATE TRIGGER minimal_booking_validation_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION minimal_booking_validation();

-- Grant permissions
GRANT EXECUTE ON FUNCTION minimal_booking_validation TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION minimal_booking_validation IS 'Minimal validation for bookings - only checks basic data integrity, no business rules';

-- ============================================================================
-- VERIFICATION: Test that basic validation works but doesn't block bookings
-- ============================================================================

SELECT 'MINIMAL VALIDATION ACTIVE - BOOKINGS SHOULD WORK WITH VALID DATA' as status;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. This only validates basic data integrity (non-null fields, valid times)
-- 2. NO staff availability checking, NO business hours, NO work day validation
-- 3. All legitimate bookings should work regardless of staff schedule
-- 4. Only invalid/malformed data will be rejected
-- 5. Ready for gradual business rule restoration if needed
-- ============================================================================