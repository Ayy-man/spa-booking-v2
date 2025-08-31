-- Implement buffer system using buffer_start and buffer_end columns
-- This migration reverts to using buffer columns instead of separate buffer appointments

-- 1. First disable the automatic buffer appointment creation
DROP TRIGGER IF EXISTS auto_create_buffer_trigger ON bookings;
DROP FUNCTION IF EXISTS create_buffer_appointment();

-- 2. Add buffer columns back to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS buffer_start TIME,
ADD COLUMN IF NOT EXISTS buffer_end TIME;

-- 3. Create function to automatically set buffer times on booking insert/update
CREATE OR REPLACE FUNCTION set_buffer_times()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate buffer times for non-cancelled bookings
    IF NEW.status != 'cancelled' AND NEW.booking_type != 'buffer' THEN
        -- Calculate buffer start (15 minutes before start_time)
        NEW.buffer_start = GREATEST(
            (NEW.start_time::time - INTERVAL '15 minutes')::time,
            '09:00:00'::time  -- Don't go before business hours
        );
        
        -- Calculate buffer end (15 minutes after end_time) 
        NEW.buffer_end = LEAST(
            (NEW.end_time::time + INTERVAL '15 minutes')::time,
            '20:00:00'::time  -- Don't go after business hours
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically set buffer times
CREATE TRIGGER set_buffer_times_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_buffer_times();

-- 5. Update existing bookings to have buffer times
UPDATE bookings
SET 
    buffer_start = GREATEST(
        (start_time::time - INTERVAL '15 minutes')::time,
        '09:00:00'::time
    ),
    buffer_end = LEAST(
        (end_time::time + INTERVAL '15 minutes')::time,
        '20:00:00'::time
    )
WHERE buffer_start IS NULL 
  OR buffer_end IS NULL
  AND status != 'cancelled'
  AND booking_type != 'buffer';

-- 6. Create function to check buffer conflicts
CREATE OR REPLACE FUNCTION check_buffer_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Skip conflict check for cancelled bookings or buffer appointments
    IF NEW.status = 'cancelled' OR NEW.booking_type = 'buffer' THEN
        RETURN NEW;
    END IF;
    
    -- Check for conflicts with existing bookings' buffer zones
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND appointment_date = NEW.appointment_date
      AND (staff_id = NEW.staff_id OR room_id = NEW.room_id)
      AND status != 'cancelled'
      AND booking_type != 'buffer'
      -- Check if NEW booking's buffer overlaps with existing booking's buffer
      AND (
        (NEW.buffer_start < buffer_end AND NEW.buffer_end > buffer_start)
      );
    
    -- If conflicts found, raise an error
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Booking conflicts with existing buffer zones. Please choose a different time slot.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to enforce buffer constraints
CREATE TRIGGER enforce_buffer_constraints_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_buffer_conflicts();

-- 8. Clean up any existing buffer appointments (separate bookings with type='buffer')
DELETE FROM bookings 
WHERE booking_type = 'buffer' 
  AND service_id IN (
    SELECT id FROM services WHERE name = 'Buffer Time'
  );

-- 9. Optionally deactivate the Buffer Time service since we're not using it anymore
UPDATE services 
SET is_active = false 
WHERE name = 'Buffer Time';

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_buffer_times 
ON bookings (appointment_date, buffer_start, buffer_end) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_staff_date_buffer
ON bookings (staff_id, appointment_date, buffer_start, buffer_end)
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_room_date_buffer
ON bookings (room_id, appointment_date, buffer_start, buffer_end)
WHERE status != 'cancelled';

-- 11. Add comments explaining the buffer system
COMMENT ON COLUMN bookings.buffer_start IS 'Start time of 15-minute prep buffer (max 15 min before start_time, not before 9 AM)';
COMMENT ON COLUMN bookings.buffer_end IS 'End time of 15-minute cleanup buffer (max 15 min after end_time, not after 8 PM)';
COMMENT ON TABLE bookings IS 'Bookings with automatic 15-minute buffer zones for room prep/cleanup. Buffer times stored in buffer_start and buffer_end columns.';