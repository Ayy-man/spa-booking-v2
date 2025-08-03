-- Database Functions for Booking Logic and Room Assignment
-- These functions implement the complex business rules for the spa booking system

-- Function to get available time slots for a specific date
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_date DATE,
    p_service_id UUID DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
    available_time TIME,
    available_staff_id UUID,
    available_staff_name VARCHAR,
    available_room_id UUID,
    available_room_name VARCHAR
) AS $$
DECLARE
    service_duration INTEGER;
    business_start TIME := '09:00';
    business_end TIME := '19:00';
    slot_interval INTEGER := 15; -- 15-minute intervals
    current_slot TIME;
BEGIN
    -- Get service duration if service_id is provided
    IF p_service_id IS NOT NULL THEN
        SELECT duration INTO service_duration FROM services WHERE id = p_service_id;
    ELSE
        service_duration := 60; -- Default 1 hour if no service specified
    END IF;
    
    -- Generate time slots from business start to end
    current_slot := business_start;
    
    WHILE current_slot + INTERVAL '1 minute' * service_duration <= business_end LOOP
        -- Check availability for this time slot
        FOR available_staff_id, available_staff_name, available_room_id, available_room_name IN
            SELECT DISTINCT 
                s.id,
                s.name,
                r.id,
                r.name
            FROM staff s
            JOIN rooms r ON (s.default_room_id = r.id OR s.default_room_id IS NULL)
            WHERE s.is_active = true
            AND r.is_active = true
            AND (p_staff_id IS NULL OR s.id = p_staff_id)
            -- Check staff is not already booked
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.staff_id = s.id
                AND b.booking_date = p_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < current_slot + INTERVAL '1 minute' * service_duration AND b.end_time > current_slot)
                )
            )
            -- Check room is not already booked
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = r.id
                AND b.booking_date = p_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < current_slot + INTERVAL '1 minute' * service_duration AND b.end_time > current_slot)
                )
            )
            -- Check staff availability (if they have blocked time)
            AND NOT EXISTS (
                SELECT 1 FROM staff_availability sa
                WHERE sa.staff_id = s.id
                AND sa.date = p_date
                AND (
                    (sa.start_time < current_slot + INTERVAL '1 minute' * service_duration AND sa.end_time > current_slot)
                )
            )
        LOOP
            available_time := current_slot;
            RETURN NEXT;
        END LOOP;
        
        current_slot := current_slot + INTERVAL '1 minute' * slot_interval;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to assign optimal room based on service requirements
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
BEGIN
    -- Get service details
    SELECT * INTO service_record FROM services WHERE id = p_service_id;
    
    -- Get staff default room if staff is specified
    IF p_preferred_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO staff_default_room FROM staff WHERE id = p_preferred_staff_id;
    END IF;
    
    -- Rule 1: Body scrub services MUST use Room 3
    IF service_record.requires_body_scrub_room = true THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE has_body_scrub_equipment = true AND is_active = true 
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Body scrub service requires Room 3';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 2: Couples services prefer Room 3, then Room 2
    IF service_record.requires_couples_room = true THEN
        -- Try Room 3 first (capacity 2, body scrub equipment)
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE capacity >= 2 AND has_body_scrub_equipment = true AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status != 'cancelled'
        ))
        ORDER BY capacity DESC
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Couples service assigned to preferred Room 3';
            RETURN NEXT;
            RETURN;
        END IF;
        
        -- Try Room 2 (capacity 2, couples room)
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE capacity >= 2 AND is_couples_room = true AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status != 'cancelled'
        ))
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Couples service assigned to Room 2';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 3: Try staff's default room first
    IF staff_default_room IS NOT NULL THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = staff_default_room AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status != 'cancelled'
        ));
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Assigned to staff default room';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 4: Find any available room
    FOR room_record IN 
        SELECT id, name FROM rooms 
        WHERE is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status != 'cancelled'
        ))
        ORDER BY capacity ASC -- Prefer smaller rooms for single services
    LOOP
        assigned_room_id := room_record.id;
        assigned_room_name := room_record.name;
        assignment_reason := 'Assigned to available room';
        RETURN NEXT;
        RETURN;
    END LOOP;
    
    -- No room available
    assignment_reason := 'No rooms available for this time slot';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to check staff capabilities for a service
CREATE OR REPLACE FUNCTION check_staff_capability(
    p_staff_id UUID,
    p_service_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    service_category VARCHAR;
    staff_capabilities TEXT[];
BEGIN
    -- Get service category
    SELECT category INTO service_category FROM services WHERE id = p_service_id;
    
    -- Get staff capabilities
    SELECT can_perform_services INTO staff_capabilities FROM staff WHERE id = p_staff_id;
    
    -- Check if staff can perform this service category
    RETURN service_category = ANY(staff_capabilities);
END;
$$ LANGUAGE plpgsql;

-- Function to get staff availability for a specific day
CREATE OR REPLACE FUNCTION get_staff_schedule(
    p_staff_id UUID,
    p_date DATE
)
RETURNS TABLE (
    is_available BOOLEAN,
    work_start TIME,
    work_end TIME,
    break_times JSONB
) AS $$
DECLARE
    staff_schedule JSONB;
    day_name TEXT;
    day_schedule JSONB;
BEGIN
    -- Get day of week
    day_name := LOWER(to_char(p_date, 'day'));
    day_name := TRIM(day_name);
    
    -- Map day names
    CASE day_name
        WHEN 'monday' THEN day_name := 'mon';
        WHEN 'tuesday' THEN day_name := 'tue';
        WHEN 'wednesday' THEN day_name := 'wed';
        WHEN 'thursday' THEN day_name := 'thu';
        WHEN 'friday' THEN day_name := 'fri';
        WHEN 'saturday' THEN day_name := 'sat';
        WHEN 'sunday' THEN day_name := 'sun';
    END CASE;
    
    -- Get staff schedule
    SELECT schedule INTO staff_schedule FROM staff WHERE id = p_staff_id;
    
    -- Get day-specific schedule
    day_schedule := staff_schedule->day_name;
    
    IF day_schedule IS NULL THEN
        is_available := false;
        RETURN NEXT;
        RETURN;
    END IF;
    
    is_available := COALESCE((day_schedule->>'available')::boolean, false);
    work_start := COALESCE((day_schedule->>'start_time')::time, '09:00'::time);
    work_end := COALESCE((day_schedule->>'end_time')::time, '19:00'::time);
    break_times := day_schedule->'breaks';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and process a booking
CREATE OR REPLACE FUNCTION process_booking(
    p_service_id UUID,
    p_staff_id UUID,
    p_room_id UUID,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_customer_phone VARCHAR,
    p_booking_date DATE,
    p_start_time TIME,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    service_duration INTEGER;
    calculated_end_time TIME;
    service_price DECIMAL(10,2);
    new_booking_id UUID;
BEGIN
    -- Get service details
    SELECT duration, price INTO service_duration, service_price 
    FROM services 
    WHERE id = p_service_id AND is_active = true;
    
    IF service_duration IS NULL THEN
        booking_id := NULL;
        success := false;
        error_message := 'Service not found or inactive';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Calculate end time
    calculated_end_time := p_start_time + INTERVAL '1 minute' * service_duration;
    
    -- Check staff capability
    IF NOT check_staff_capability(p_staff_id, p_service_id) THEN
        booking_id := NULL;
        success := false;
        error_message := 'Staff member cannot perform this service';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Insert booking (triggers will validate conflicts and business rules)
    BEGIN
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email, 
            customer_phone, booking_date, start_time, end_time, 
            special_requests, total_price
        ) VALUES (
            p_service_id, p_staff_id, p_room_id, p_customer_name, p_customer_email,
            p_customer_phone, p_booking_date, p_start_time, calculated_end_time,
            p_special_requests, service_price
        ) RETURNING id INTO new_booking_id;
        
        booking_id := new_booking_id;
        success := true;
        error_message := NULL;
        
    EXCEPTION WHEN OTHERS THEN
        booking_id := NULL;
        success := false;
        error_message := SQLERRM;
    END;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;