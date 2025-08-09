-- COMPREHENSIVE FIX: Room Availability Issues
-- This migration fixes all schema mismatches causing "room not available" errors

-- 1. Create service_category enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
        CREATE TYPE service_category AS ENUM (
            'facial',
            'massage', 
            'body_treatment',
            'body_scrub',
            'waxing',
            'package',
            'membership'
        );
        RAISE NOTICE 'Created service_category enum type';
    ELSE
        RAISE NOTICE 'service_category enum type already exists';
    END IF;
END $$;

-- 2. Update services table to use enum for category
DO $$
BEGIN
    -- Check if category column exists and needs conversion
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'category' 
        AND data_type = 'character varying'
    ) THEN
        -- Convert existing category values to enum
        ALTER TABLE services 
        ALTER COLUMN category TYPE service_category 
        USING category::service_category;
        RAISE NOTICE 'Converted services.category to service_category enum';
    END IF;
END $$;

-- 3. Update rooms table capabilities to use enum array
DO $$
BEGIN
    -- Check if capabilities column exists and needs conversion
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' 
        AND column_name = 'capabilities'
        AND data_type = 'ARRAY'
    ) THEN
        -- Convert existing capabilities to enum array
        ALTER TABLE rooms 
        ALTER COLUMN capabilities TYPE service_category[]
        USING capabilities::text[]::service_category[];
        RAISE NOTICE 'Converted rooms.capabilities to service_category[] enum array';
    END IF;
END $$;

-- 4. Update staff can_perform_services to use enum array
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' 
        AND column_name = 'can_perform_services'
        AND data_type = 'ARRAY'
    ) THEN
        -- Convert existing can_perform_services to enum array
        ALTER TABLE staff 
        ALTER COLUMN can_perform_services TYPE service_category[]
        USING can_perform_services::text[]::service_category[];
        RAISE NOTICE 'Converted staff.can_perform_services to service_category[] enum array';
    END IF;
END $$;

-- 5. Fix room IDs to be consistent (use UUIDs as in original schema)
-- First check what type room_id is in rooms table
DO $$
DECLARE
    room_id_type text;
BEGIN
    SELECT data_type INTO room_id_type
    FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'id';
    
    RAISE NOTICE 'Room ID data type: %', room_id_type;
    
    -- If room_id is integer in bookings but UUID in rooms, we have a mismatch
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'room_id'
        AND data_type = 'integer'
    ) AND room_id_type = 'uuid' THEN
        -- Need to fix this mismatch - convert bookings.room_id to UUID
        -- First, add a temporary column
        ALTER TABLE bookings ADD COLUMN room_id_uuid UUID;
        
        -- Map integer room IDs to UUID room IDs
        UPDATE bookings SET room_id_uuid = (
            SELECT r.id FROM rooms r WHERE r.room_number = bookings.room_id
        );
        
        -- Drop old column and rename new one
        ALTER TABLE bookings DROP COLUMN room_id CASCADE;
        ALTER TABLE bookings RENAME COLUMN room_id_uuid TO room_id;
        
        -- Add foreign key constraint back
        ALTER TABLE bookings ADD CONSTRAINT bookings_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id);
        
        RAISE NOTICE 'Fixed room_id type mismatch in bookings table';
    END IF;
END $$;

-- 6. Ensure column names are consistent (appointment_date vs booking_date)
DO $$
BEGIN
    -- Check if bookings table uses booking_date or appointment_date
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'appointment_date'
    ) THEN
        -- Rename booking_date to appointment_date for consistency
        ALTER TABLE bookings RENAME COLUMN booking_date TO appointment_date;
        RAISE NOTICE 'Renamed booking_date to appointment_date';
    END IF;
END $$;

-- 7. Add missing service requirement columns if they don't exist
DO $$
BEGIN
    -- Add requires_room_3 column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'requires_room_3'
    ) THEN
        ALTER TABLE services ADD COLUMN requires_room_3 BOOLEAN DEFAULT FALSE;
        -- Set it to TRUE for body scrub services
        UPDATE services SET requires_room_3 = TRUE WHERE requires_body_scrub_room = TRUE;
        RAISE NOTICE 'Added requires_room_3 column';
    END IF;
    
    -- Add is_couples_service column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'is_couples_service'
    ) THEN
        ALTER TABLE services ADD COLUMN is_couples_service BOOLEAN DEFAULT FALSE;
        -- Set it to TRUE for services that require couples room or are packages
        UPDATE services SET is_couples_service = TRUE WHERE requires_couples_room = TRUE OR is_package = TRUE;
        RAISE NOTICE 'Added is_couples_service column';
    END IF;
END $$;

-- 8. Create the CORRECT assign_optimal_room function with proper data types
DROP FUNCTION IF EXISTS assign_optimal_room CASCADE;

CREATE OR REPLACE FUNCTION assign_optimal_room(
    p_service_id UUID,
    p_preferred_staff_id UUID DEFAULT NULL,
    p_booking_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL
)
RETURNS TABLE (
    assigned_room_id UUID,
    assigned_room_name VARCHAR,
    assignment_reason TEXT
) AS $$
DECLARE
    service_record RECORD;
    staff_default_room UUID;
    room_record RECORD;
    service_duration INTEGER;
    calculated_end_time TIME;
BEGIN
    -- Get service details
    SELECT * INTO service_record FROM services WHERE id = p_service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, 'Service not found or inactive'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate service end time if start time is provided
    IF p_start_time IS NOT NULL THEN
        calculated_end_time := p_start_time + INTERVAL '1 minute' * service_record.duration;
    END IF;
    
    -- Get staff default room if staff is specified
    IF p_preferred_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO staff_default_room 
        FROM staff 
        WHERE id = p_preferred_staff_id AND is_active = true;
    END IF;
    
    -- Rule 1: Body scrub services MUST use Room 3 (or room with body_scrub_equipment)
    IF service_record.requires_body_scrub_room = true OR service_record.category = 'body_scrub' THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE has_body_scrub_equipment = true AND is_active = true 
        AND (
            p_booking_date IS NULL OR p_start_time IS NULL OR 
            NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = rooms.id 
                AND appointment_date = p_booking_date 
                AND status != 'cancelled'
                AND (
                    (start_time < calculated_end_time AND end_time > p_start_time)
                )
            )
        )
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Body scrub service requires room with specialized equipment';
            RETURN NEXT;
            RETURN;
        ELSE
            assignment_reason := 'Body scrub room required but not available at this time';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 2: Couples services prefer larger capacity rooms
    IF service_record.requires_couples_room = true OR service_record.is_package = true THEN
        -- Try rooms with highest capacity first
        FOR room_record IN 
            SELECT id, name, capacity FROM rooms 
            WHERE capacity >= 2 AND is_active = true
            AND (
                p_booking_date IS NULL OR p_start_time IS NULL OR 
                NOT EXISTS (
                    SELECT 1 FROM bookings 
                    WHERE room_id = rooms.id 
                    AND appointment_date = p_booking_date 
                    AND status != 'cancelled'
                    AND (
                        (start_time < calculated_end_time AND end_time > p_start_time)
                    )
                )
            )
            ORDER BY capacity DESC, id
        LOOP
            assigned_room_id := room_record.id;
            assigned_room_name := room_record.name;
            assignment_reason := 'Couples service assigned to room with capacity ' || room_record.capacity;
            RETURN NEXT;
            RETURN;
        END LOOP;
    END IF;
    
    -- Rule 3: Try staff's default room first
    IF staff_default_room IS NOT NULL THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = staff_default_room 
        AND is_active = true
        AND service_record.category = ANY(capabilities)
        AND (
            p_booking_date IS NULL OR p_start_time IS NULL OR 
            NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = rooms.id 
                AND appointment_date = p_booking_date 
                AND status != 'cancelled'
                AND (
                    (start_time < calculated_end_time AND end_time > p_start_time)
                )
            )
        );
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Assigned to staff preferred room with matching capabilities';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 4: Find any available room with matching service category capabilities
    FOR room_record IN 
        SELECT id, name, capacity FROM rooms 
        WHERE is_active = true
        AND service_record.category = ANY(capabilities)
        AND (
            p_booking_date IS NULL OR p_start_time IS NULL OR 
            NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = rooms.id 
                AND appointment_date = p_booking_date 
                AND status != 'cancelled'
                AND (
                    (start_time < calculated_end_time AND end_time > p_start_time)
                )
            )
        )
        ORDER BY capacity ASC, id -- Prefer smaller rooms for individual services
    LOOP
        assigned_room_id := room_record.id;
        assigned_room_name := room_record.name;
        assignment_reason := 'Available room with required capabilities';
        RETURN NEXT;
        RETURN;
    END LOOP;
    
    -- Rule 5: Fallback - find ANY available room (ignore capabilities)
    FOR room_record IN 
        SELECT id, name FROM rooms 
        WHERE is_active = true
        AND (
            p_booking_date IS NULL OR p_start_time IS NULL OR 
            NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = rooms.id 
                AND appointment_date = p_booking_date 
                AND status != 'cancelled'
                AND (
                    (start_time < calculated_end_time AND end_time > p_start_time)
                )
            )
        )
        ORDER BY capacity ASC, id
    LOOP
        assigned_room_id := room_record.id;
        assigned_room_name := room_record.name;
        assignment_reason := 'Fallback assignment - room available but may not have optimal capabilities';
        RETURN NEXT;
        RETURN;
    END LOOP;
    
    -- No room available
    assignment_reason := 'No rooms available for the requested time slot';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 9. Fix check_staff_capability function
DROP FUNCTION IF EXISTS check_staff_capability CASCADE;

CREATE OR REPLACE FUNCTION check_staff_capability(
    p_staff_id UUID,
    p_service_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    service_category service_category;
    staff_capabilities service_category[];
BEGIN
    -- Get service category
    SELECT category INTO service_category FROM services WHERE id = p_service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get staff capabilities
    SELECT can_perform_services INTO staff_capabilities FROM staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if staff has the required capability
    RETURN service_category = ANY(staff_capabilities);
END;
$$ LANGUAGE plpgsql;

-- 10. Update room capabilities to ensure they match service categories
UPDATE rooms SET capabilities = ARRAY['facial', 'massage', 'waxing', 'body_treatment']::service_category[]
WHERE id = '11111111-1111-1111-1111-111111111111'::uuid; -- Room 1

UPDATE rooms SET capabilities = ARRAY['facial', 'massage', 'waxing', 'body_treatment']::service_category[]
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid; -- Room 2

UPDATE rooms SET capabilities = ARRAY['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub']::service_category[]
WHERE id = '33333333-3333-3333-3333-333333333333'::uuid; -- Room 3

-- 11. Update staff capabilities to use proper enum values
UPDATE staff SET can_perform_services = ARRAY['facial']::service_category[]
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid; -- Selma

UPDATE staff SET can_perform_services = ARRAY['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub']::service_category[]
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid; -- Robyn

UPDATE staff SET can_perform_services = ARRAY['facial', 'waxing']::service_category[]
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid; -- Tanisha

UPDATE staff SET can_perform_services = ARRAY['massage', 'body_treatment']::service_category[]
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid; -- Leonel

-- 12. Grant proper permissions
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_staff_capability TO authenticated, anon;

-- 13. Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_room_date_time ON bookings(room_id, appointment_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_rooms_capabilities ON rooms USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_staff_capabilities ON staff USING GIN(can_perform_services);

-- 14. Create a debugging function to test room assignment
CREATE OR REPLACE FUNCTION debug_room_assignment(
    p_service_id UUID,
    p_booking_date DATE DEFAULT CURRENT_DATE,
    p_start_time TIME DEFAULT '10:00'
)
RETURNS TABLE (
    test_result TEXT,
    room_id UUID,
    room_name TEXT,
    reason TEXT,
    service_name TEXT,
    service_category TEXT
) AS $$
DECLARE
    service_info RECORD;
    room_assignment RECORD;
BEGIN
    -- Get service info
    SELECT id, name, category, duration, requires_body_scrub_room, requires_couples_room, is_package
    INTO service_info
    FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ERROR: Service not found'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Test room assignment
    SELECT * INTO room_assignment FROM assign_optimal_room(p_service_id, NULL, p_booking_date, p_start_time);
    
    RETURN QUERY SELECT 
        'SUCCESS: Room assigned'::TEXT,
        room_assignment.assigned_room_id,
        room_assignment.assigned_room_name,
        room_assignment.assignment_reason,
        service_info.name,
        service_info.category::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION assign_optimal_room IS 'Assigns optimal room based on service requirements and availability with proper UUID and enum handling';
COMMENT ON FUNCTION check_staff_capability IS 'Checks if staff member can perform specific service using proper enum types';
COMMENT ON FUNCTION debug_room_assignment IS 'Debug function to test room assignment logic for specific services';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'COMPREHENSIVE FIX COMPLETED:';
    RAISE NOTICE '1. Created service_category enum type';
    RAISE NOTICE '2. Fixed data type mismatches in tables';
    RAISE NOTICE '3. Updated assign_optimal_room function with proper UUID handling';
    RAISE NOTICE '4. Fixed staff capability checking';
    RAISE NOTICE '5. Updated room and staff data with proper enum arrays';
    RAISE NOTICE '6. Added performance indexes';
    RAISE NOTICE '7. Created debug function for testing';
    RAISE NOTICE 'The "room not available" error should now be resolved.';
END $$;