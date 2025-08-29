-- Enforce 15-minute buffer constraints at the database level
-- This ensures NO bookings can violate buffer zones, whether from admin or customer portal

-- Create function to check buffer conflicts
CREATE OR REPLACE FUNCTION check_buffer_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
    conflicting_booking RECORD;
BEGIN
    -- Skip check for cancelled bookings
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Calculate buffer times if not provided
    IF NEW.buffer_start IS NULL THEN
        NEW.buffer_start := (NEW.start_time::time - INTERVAL '15 minutes')::time;
        IF NEW.buffer_start < '09:00:00'::time THEN
            NEW.buffer_start := '09:00:00'::time;
        END IF;
    END IF;
    
    IF NEW.buffer_end IS NULL THEN
        NEW.buffer_end := (NEW.end_time::time + INTERVAL '15 minutes')::time;
        IF NEW.buffer_end > '20:00:00'::time THEN
            NEW.buffer_end := '20:00:00'::time;
        END IF;
    END IF;

    -- Check for conflicts with existing bookings and their buffers
    -- A conflict occurs when:
    -- 1. New booking overlaps with existing booking
    -- 2. New booking overlaps with existing buffer zones
    -- 3. New buffer zones overlap with existing bookings
    
    SELECT COUNT(*), MIN(b.*) INTO conflict_count, conflicting_booking
    FROM bookings b
    WHERE b.appointment_date = NEW.appointment_date
      AND b.status != 'cancelled'
      AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid) -- Exclude self for updates
      AND (
          -- Check if the new appointment (including its buffers) conflicts with existing appointments (including their buffers)
          (
              -- For existing bookings WITH buffer data
              b.buffer_start IS NOT NULL AND b.buffer_end IS NOT NULL AND (
                  -- New appointment time overlaps with existing buffer zone
                  (NEW.start_time < b.buffer_end AND NEW.end_time > b.buffer_start) OR
                  -- New buffer zone overlaps with existing buffer zone
                  (NEW.buffer_start < b.buffer_end AND NEW.buffer_end > b.buffer_start)
              )
          ) OR (
              -- For existing bookings WITHOUT buffer data (legacy), calculate on the fly
              b.buffer_start IS NULL AND b.buffer_end IS NULL AND (
                  -- Calculate buffer times for existing booking
                  (NEW.start_time < (b.end_time::time + INTERVAL '15 minutes')::time AND 
                   NEW.end_time > (b.start_time::time - INTERVAL '15 minutes')::time) OR
                  -- New buffer zone overlaps with existing booking plus calculated buffer
                  (NEW.buffer_start < (b.end_time::time + INTERVAL '15 minutes')::time AND 
                   NEW.buffer_end > (b.start_time::time - INTERVAL '15 minutes')::time)
              )
          )
      )
      AND (
          -- Same staff conflict
          (NEW.staff_id = b.staff_id) OR
          -- Same room conflict
          (NEW.room_id = b.room_id)
      );

    IF conflict_count > 0 THEN
        -- Provide detailed error message
        IF conflicting_booking.staff_id = NEW.staff_id THEN
            RAISE EXCEPTION 'Cannot book appointment: conflicts with 15-minute buffer zone. Staff % has an appointment from % to % (with buffers until %). Please select a time after %.',
                (SELECT name FROM staff WHERE id = NEW.staff_id LIMIT 1),
                conflicting_booking.start_time,
                conflicting_booking.end_time,
                COALESCE(conflicting_booking.buffer_end, (conflicting_booking.end_time::time + INTERVAL '15 minutes')::time),
                COALESCE(conflicting_booking.buffer_end, (conflicting_booking.end_time::time + INTERVAL '15 minutes')::time);
        ELSE
            RAISE EXCEPTION 'Cannot book appointment: Room % is occupied from % to % (with buffers until %). Please select a time after %.',
                NEW.room_id,
                conflicting_booking.start_time,
                conflicting_booking.end_time,
                COALESCE(conflicting_booking.buffer_end, (conflicting_booking.end_time::time + INTERVAL '15 minutes')::time),
                COALESCE(conflicting_booking.buffer_end, (conflicting_booking.end_time::time + INTERVAL '15 minutes')::time);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce buffer constraints on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_buffer_constraints_trigger ON bookings;
CREATE TRIGGER enforce_buffer_constraints_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_buffer_conflicts();

-- Add comment explaining the trigger
COMMENT ON FUNCTION check_buffer_conflicts() IS 'Enforces 15-minute buffer zones before and after all appointments to prevent overlapping bookings';
COMMENT ON TRIGGER enforce_buffer_constraints_trigger ON bookings IS 'Prevents bookings that would violate 15-minute buffer zones';

-- Update any existing bookings that don't have buffer times set
UPDATE bookings
SET 
    buffer_start = CASE 
        WHEN (start_time::time - INTERVAL '15 minutes')::time < '09:00:00'::time 
        THEN '09:00:00'::time 
        ELSE (start_time::time - INTERVAL '15 minutes')::time
    END,
    buffer_end = CASE 
        WHEN (end_time::time + INTERVAL '15 minutes')::time > '20:00:00'::time 
        THEN '20:00:00'::time 
        ELSE (end_time::time + INTERVAL '15 minutes')::time
    END
WHERE buffer_start IS NULL 
   OR buffer_end IS NULL;