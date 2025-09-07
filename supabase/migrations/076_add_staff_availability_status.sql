-- Migration: Add Staff Availability Status System
-- This migration adds support for three staff status modes: working, on_call, and off
-- It enables flexible staff scheduling with advance notice requirements

-- Create enum type for availability status
DO $$ BEGIN
    CREATE TYPE staff_availability_status AS ENUM ('working', 'on_call', 'off');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add availability status fields to staff_schedules table
ALTER TABLE staff_schedules 
ADD COLUMN IF NOT EXISTS availability_status staff_availability_status DEFAULT 'working',
ADD COLUMN IF NOT EXISTS advance_notice_hours INTEGER DEFAULT 2 CHECK (advance_notice_hours >= 0),
ADD COLUMN IF NOT EXISTS status_note TEXT;

-- Add default advance notice hours to staff table for their general preference
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS default_advance_notice_hours INTEGER DEFAULT 2 CHECK (default_advance_notice_hours >= 0),
ADD COLUMN IF NOT EXISTS current_status staff_availability_status DEFAULT 'working',
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_staff_schedules_status 
ON staff_schedules(staff_id, date, availability_status);

CREATE INDEX IF NOT EXISTS idx_staff_current_status 
ON staff(id, current_status);

-- Create function to get staff availability status for a specific date/time
CREATE OR REPLACE FUNCTION get_staff_availability_status(
    p_staff_id TEXT,
    p_date DATE,
    p_time TIME
) RETURNS TABLE (
    status staff_availability_status,
    advance_notice_hours INTEGER,
    is_available BOOLEAN,
    status_note TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ss.availability_status, s.current_status, 'working'::staff_availability_status) as status,
        COALESCE(ss.advance_notice_hours, s.default_advance_notice_hours, 2) as advance_notice_hours,
        CASE 
            WHEN COALESCE(ss.availability_status, s.current_status, 'working') = 'off' THEN false
            WHEN ss.is_available IS NOT NULL THEN ss.is_available
            ELSE true
        END as is_available,
        ss.status_note
    FROM staff s
    LEFT JOIN staff_schedules ss ON s.id = ss.staff_id 
        AND ss.date = p_date
        AND p_time BETWEEN ss.start_time AND ss.end_time
    WHERE s.id = p_staff_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if a time slot is bookable based on staff availability status
CREATE OR REPLACE FUNCTION is_slot_bookable_for_staff(
    p_staff_id TEXT,
    p_date DATE,
    p_time TIME,
    p_current_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
    v_status staff_availability_status;
    v_advance_notice_hours INTEGER;
    v_slot_timestamp TIMESTAMP WITH TIME ZONE;
    v_minimum_booking_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get staff availability status
    SELECT status, advance_notice_hours 
    INTO v_status, v_advance_notice_hours
    FROM get_staff_availability_status(p_staff_id, p_date, p_time);

    -- If staff is off, slot is not bookable
    IF v_status = 'off' THEN
        RETURN false;
    END IF;

    -- Calculate the timestamp of the requested slot
    v_slot_timestamp := p_date::timestamp + p_time;

    -- If staff is working, use default 2-hour advance notice
    IF v_status = 'working' THEN
        v_minimum_booking_time := p_current_timestamp + INTERVAL '2 hours';
    -- If staff is on_call, use their specific advance notice requirement
    ELSIF v_status = 'on_call' THEN
        v_minimum_booking_time := p_current_timestamp + (v_advance_notice_hours || ' hours')::INTERVAL;
    END IF;

    -- Check if the slot meets the minimum advance notice requirement
    RETURN v_slot_timestamp >= v_minimum_booking_time;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying of current staff availability
CREATE OR REPLACE VIEW staff_availability_overview AS
SELECT 
    s.id,
    s.name,
    s.current_status,
    s.default_advance_notice_hours,
    s.status_updated_at,
    CASE 
        WHEN s.current_status = 'off' THEN 'Not Available'
        WHEN s.current_status = 'on_call' THEN 'On Call (' || s.default_advance_notice_hours || 'h notice)'
        ELSE 'Available'
    END as status_display,
    s.is_active
FROM staff s
WHERE s.is_active = true
ORDER BY s.name;

-- Add trigger to update status_updated_at when current_status changes
CREATE OR REPLACE FUNCTION update_staff_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_status IS DISTINCT FROM OLD.current_status THEN
        NEW.status_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_status_timestamp
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_status_timestamp();

-- Add RLS policies for the new columns
-- Staff members can view availability status but only admins can modify
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing availability status (public read)
CREATE POLICY "Anyone can view staff availability status" 
    ON staff_schedules FOR SELECT 
    USING (true);

CREATE POLICY "Anyone can view staff current status" 
    ON staff FOR SELECT 
    USING (true);

-- Create policy for updating availability status (admin only)
CREATE POLICY "Only admins can update staff availability status" 
    ON staff_schedules FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

CREATE POLICY "Only admins can update staff current status" 
    ON staff FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- Insert some example data for testing (optional, can be removed in production)
-- This sets all current staff to 'working' status by default
UPDATE staff 
SET current_status = 'working', 
    default_advance_notice_hours = 2,
    status_updated_at = NOW()
WHERE current_status IS NULL;

-- Add helpful comments
COMMENT ON COLUMN staff_schedules.availability_status IS 'Staff availability status: working (immediate booking), on_call (requires advance notice), off (not available)';
COMMENT ON COLUMN staff_schedules.advance_notice_hours IS 'Hours of advance notice required when staff is on_call';
COMMENT ON COLUMN staff.current_status IS 'Default availability status for the staff member';
COMMENT ON COLUMN staff.default_advance_notice_hours IS 'Default hours of advance notice when on_call';
COMMENT ON FUNCTION get_staff_availability_status IS 'Get the current availability status for a staff member at a specific date/time';
COMMENT ON FUNCTION is_slot_bookable_for_staff IS 'Check if a time slot is bookable based on staff availability status and advance notice requirements';