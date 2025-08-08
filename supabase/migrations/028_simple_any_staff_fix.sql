-- Simple fix for "Any Staff" booking issue
-- Create a placeholder UUID for "any" staff selections that gets processed differently

-- Insert a special "Any Available Staff" record in the staff table
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    initials,
    capabilities, 
    is_active,
    created_at,
    updated_at
) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Any Available Staff',
    'admin@spa.com',
    '',
    'AA',
    ARRAY['facials', 'massages', 'treatments', 'waxing']::varchar[],
    true,
    NOW(),
    NOW()
) 
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    capabilities = EXCLUDED.capabilities,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Update the conflict checking function to handle the special "any" staff UUID
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    buffer_time INTERVAL := INTERVAL '15 minutes';
    conflict_count INTEGER;
    any_staff_uuid UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
BEGIN
    -- Always check for room conflicts
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
    
    -- Only check for staff conflicts if staff_id is NOT the special "any" staff UUID
    IF NEW.staff_id != any_staff_uuid THEN
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

-- Update the availability checking function to handle the special "any" staff UUID
CREATE OR REPLACE FUNCTION is_time_slot_available(
    p_room_id INTEGER,
    p_staff_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    buffer_time INTERVAL := INTERVAL '15 minutes';
    conflict_exists BOOLEAN;
    any_staff_uuid UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
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
    
    -- For specific staff requests (not "any"), also check staff availability
    IF p_staff_id != any_staff_uuid THEN
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
    
    -- For "any" staff: as long as room is free, we consider it available
    -- (specific staff will be assigned manually later)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view to easily identify bookings that need staff assignment
CREATE OR REPLACE VIEW unassigned_bookings AS
SELECT 
    b.*,
    s.name as service_name,
    r.name as room_name,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN staff st ON b.staff_id = st.id
WHERE b.staff_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
AND b.status != 'cancelled'
ORDER BY b.appointment_date ASC, b.start_time ASC;

-- Update comments
COMMENT ON FUNCTION check_booking_conflicts() IS 'Prevents double-booking of rooms and staff with 15-minute buffer. Skips staff conflicts when staff_id is the special "any" UUID for manual assignment.';
COMMENT ON FUNCTION is_time_slot_available IS 'Checks if a time slot is available considering 15-minute buffer. For "any" staff (special UUID), only checks room availability.';
COMMENT ON VIEW unassigned_bookings IS 'Shows all bookings that need manual staff assignment (using special "any" staff UUID)';