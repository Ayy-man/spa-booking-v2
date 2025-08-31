-- Migration: Add triggers for automatic booking status timestamp management
-- Purpose: Automatically set cancelled_at, completed_at, and checked_in_at timestamps
-- when booking status changes

-- Create a function to handle booking status changes
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'cancelled', set cancelled_at
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
        
        -- Extract cancellation reason from internal_notes if it starts with "Cancelled:"
        IF NEW.internal_notes IS NOT NULL AND NEW.internal_notes LIKE 'Cancelled:%' THEN
            NEW.cancellation_reason = SUBSTRING(NEW.internal_notes FROM 11);
        ELSIF NEW.cancellation_reason IS NULL THEN
            NEW.cancellation_reason = 'Cancelled by admin';
        END IF;
    END IF;
    
    -- When status changes to 'completed', set completed_at
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- When status changes to 'in_progress', set checked_in_at
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
        NEW.checked_in_at = NOW();
    END IF;
    
    -- When status changes from 'cancelled' to something else, clear cancelled_at
    IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
        NEW.cancelled_at = NULL;
        NEW.cancellation_reason = NULL;
    END IF;
    
    -- Always update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;

-- Create the trigger
CREATE TRIGGER booking_status_change_trigger
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_booking_status_change();

-- Create a function to handle direct updates to cancellation fields
CREATE OR REPLACE FUNCTION handle_booking_cancellation_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If cancellation_reason is being set and status is not cancelled, update status
    IF NEW.cancellation_reason IS NOT NULL AND NEW.cancellation_reason != '' 
       AND NEW.status != 'cancelled' THEN
        NEW.status = 'cancelled';
        NEW.cancelled_at = COALESCE(NEW.cancelled_at, NOW());
    END IF;
    
    -- If internal_notes contains cancellation info and we're cancelling, extract it
    IF NEW.status = 'cancelled' AND NEW.internal_notes LIKE 'Cancelled:%' 
       AND (NEW.cancellation_reason IS NULL OR NEW.cancellation_reason = '') THEN
        NEW.cancellation_reason = SUBSTRING(NEW.internal_notes FROM 11);
        NEW.cancelled_at = COALESCE(NEW.cancelled_at, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS booking_cancellation_fields_trigger ON public.bookings;

-- Create the trigger for cancellation fields
CREATE TRIGGER booking_cancellation_fields_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_booking_cancellation_fields();

-- Add indexes for performance on status queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_cancelled ON public.bookings(status) 
    WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON public.bookings(cancelled_at) 
    WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON public.bookings(completed_at) 
    WHERE completed_at IS NOT NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_booking_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_booking_status_change() TO anon;
GRANT EXECUTE ON FUNCTION handle_booking_cancellation_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_booking_cancellation_fields() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION handle_booking_status_change() IS 
'Automatically manages timestamp fields (cancelled_at, completed_at, checked_in_at) based on booking status changes';

COMMENT ON FUNCTION handle_booking_cancellation_fields() IS 
'Handles cancellation reason extraction from internal_notes and ensures consistency between status and cancellation fields';