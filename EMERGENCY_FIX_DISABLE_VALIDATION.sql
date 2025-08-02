-- EMERGENCY FIX: Disable staff validation temporarily to restore booking functionality
-- Copy and paste this into Supabase Dashboard SQL Editor IMMEDIATELY

-- Remove the trigger that's blocking bookings
DROP TRIGGER IF EXISTS validate_booking_staff_schedule_trigger ON bookings;

-- Create a simple, non-blocking validation function for basic safety
CREATE OR REPLACE FUNCTION validate_booking_staff_schedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- Very basic validation - just check staff exists and is active
    IF NOT EXISTS (SELECT 1 FROM staff WHERE id = NEW.staff_id AND is_active = true) THEN
        RAISE EXCEPTION 'Staff member not found or inactive';
    END IF;
    
    -- Allow all bookings to proceed - we'll add proper validation back later
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger with the non-blocking function
CREATE TRIGGER validate_booking_staff_schedule_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION validate_booking_staff_schedule();

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_booking_staff_schedule TO authenticated, anon;

-- This immediately restores booking functionality while we fix the validation logic