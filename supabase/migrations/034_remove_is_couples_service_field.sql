-- ============================================================================
-- Migration: Remove misleading is_couples_service field
-- ============================================================================
-- This field is confusing because ALL services can be booked as single OR couples
-- The customer chooses the booking type, not the service

-- Step 1: Drop any functions that depend on is_couples_service field
-- We need to check and update functions that reference this column

-- First, let's update the assign_optimal_room function to remove the check
CREATE OR REPLACE FUNCTION assign_optimal_room(
    p_service_id text,
    p_appointment_date date,
    p_start_time time,
    p_end_time time,
    p_staff_id text DEFAULT NULL,
    p_booking_type varchar DEFAULT 'single'
)
RETURNS integer AS $$
DECLARE
    v_room_id integer;
    v_requires_room_3 boolean;
    v_staff_default_room integer;
    service_record RECORD;
BEGIN
    -- Get service details (without is_couples_service)
    SELECT requires_room_3 
    INTO service_record
    FROM services 
    WHERE id = p_service_id;
    
    -- Get staff's default room if specified
    IF p_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO v_staff_default_room
        FROM staff
        WHERE id = p_staff_id;
    END IF;
    
    -- Room assignment logic
    -- 1. Body scrub/treatment services must use Room 3
    IF service_record.requires_room_3 = true THEN
        -- Check if Room 3 is available
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE room_id = 3
            AND appointment_date = p_appointment_date
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < p_end_time AND end_time > p_start_time)
            )
        ) THEN
            RETURN 3;
        ELSE
            RETURN NULL; -- Room 3 required but not available
        END IF;
    END IF;
    
    -- 2. For couples bookings, prefer rooms 2 or 3 (capacity 2)
    IF p_booking_type = 'couple' THEN
        -- Try Room 3 first (preferred for couples)
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE room_id = 3
            AND appointment_date = p_appointment_date
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < p_end_time AND end_time > p_start_time)
            )
        ) THEN
            RETURN 3;
        END IF;
        
        -- Try Room 2
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE room_id = 2
            AND appointment_date = p_appointment_date
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < p_end_time AND end_time > p_start_time)
            )
        ) THEN
            RETURN 2;
        END IF;
        
        RETURN NULL; -- No couples room available
    END IF;
    
    -- 3. Try staff's default room if they have one
    IF v_staff_default_room IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE room_id = v_staff_default_room
            AND appointment_date = p_appointment_date
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < p_end_time AND end_time > p_start_time)
            )
        ) THEN
            RETURN v_staff_default_room;
        END IF;
    END IF;
    
    -- 4. Find any available room
    SELECT id INTO v_room_id
    FROM rooms
    WHERE is_active = true
    AND id NOT IN (
        SELECT DISTINCT room_id
        FROM bookings
        WHERE appointment_date = p_appointment_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        )
    )
    ORDER BY 
        CASE 
            WHEN id = 3 THEN 1  -- Prefer Room 3
            WHEN id = 2 THEN 2  -- Then Room 2
            ELSE 3              -- Then Room 1
        END
    LIMIT 1;
    
    RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop the column from the services table
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- Step 3: Add a comment to document the business model
COMMENT ON TABLE services IS 'All services can be booked as either single (one person) or couples (two people). The customer chooses the booking type, not the service.';

-- Step 4: Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed is_couples_service field. All services now support both single and couples bookings as per business requirements.';
END $$;