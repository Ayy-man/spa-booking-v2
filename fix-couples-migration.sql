-- =====================================================
-- FIXED COUPLES BOOKING MIGRATION
-- This fixes the column reference issue and ensures compatibility
-- =====================================================

-- First, let's check what columns actually exist and add missing ones
DO $$ 
BEGIN
    -- Add is_couples_service column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'is_couples_service'
    ) THEN
        ALTER TABLE services ADD COLUMN is_couples_service BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add booking_group_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'booking_group_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN booking_group_id UUID DEFAULT NULL;
    END IF;
    
    -- Add booking_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'booking_type'
    ) THEN
        ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(20) DEFAULT 'single' 
            CHECK (booking_type IN ('single', 'couple', 'group'));
    END IF;
END $$;

-- Create index for efficient group lookup (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(booking_group_id);

-- Update services to mark couples services (using correct column names)
UPDATE services 
SET is_couples_service = true 
WHERE requires_couples_room = true 
   OR requires_body_scrub_room = true
   OR name ILIKE '%couple%' 
   OR name ILIKE '%package%'
   OR is_package = true;

-- Add explicit couples services (with conflict handling)
INSERT INTO services (name, description, duration, price, category, requires_couples_room, is_couples_service, is_active)
VALUES 
    ('Couples Relaxation Massage', 'Side-by-side relaxation massage for two', 60, 160.00, 'massage', true, true, true),
    ('Couples Hot Stone Massage', 'Side-by-side hot stone massage for two', 90, 200.00, 'massage', true, true, true),
    ('Couples Facial Treatment', 'Side-by-side facial treatments for two', 60, 140.00, 'facial', true, true, true),
    ('Couples Spa Package', 'Complete spa experience for two including massage and facial', 120, 300.00, 'package', true, true, true)
ON CONFLICT (name) DO UPDATE SET
    is_couples_service = true,
    requires_couples_room = true;

-- Fixed assign_optimal_room function that uses correct column names
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
    
    IF NOT FOUND THEN
        assigned_room_id := NULL;
        assigned_room_name := NULL;
        assignment_reason := 'Service not found';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Get staff default room if staff is specified
    IF p_preferred_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO staff_default_room FROM staff WHERE id = p_preferred_staff_id;
    END IF;
    
    -- Rule 1: Body scrub services MUST use Room 3 (requires_body_scrub_room = true)
    IF service_record.requires_body_scrub_room = true THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE has_body_scrub_equipment = true AND is_active = true 
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Body scrub service requires specialized equipment';
            RETURN NEXT;
            RETURN;
        ELSE
            assigned_room_id := NULL;
            assigned_room_name := NULL;
            assignment_reason := 'No body scrub room available';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 2: Couples services require rooms with capacity >= 2
    IF service_record.requires_couples_room = true OR service_record.is_couples_service = true THEN
        -- Try Room 3 first (highest capacity, has equipment)
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE capacity >= 2 AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status IN ('confirmed', 'in_progress')
        ))
        ORDER BY capacity DESC, has_body_scrub_equipment DESC
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Couples service assigned to available couples room';
            RETURN NEXT;
            RETURN;
        ELSE
            assigned_room_id := NULL;
            assigned_room_name := NULL;
            assignment_reason := 'No couples room available (requires capacity >= 2)';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 3: Try staff's default room first for non-couples services
    IF staff_default_room IS NOT NULL THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = staff_default_room AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status IN ('confirmed', 'in_progress')
        ));
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Assigned to staff default room';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 4: Find any available room (prefer smaller rooms for single services)
    FOR room_record IN 
        SELECT id, name FROM rooms 
        WHERE is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id 
            AND booking_date = p_booking_date 
            AND start_time = p_start_time 
            AND status IN ('confirmed', 'in_progress')
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
    assigned_room_id := NULL;
    assigned_room_name := NULL;
    assignment_reason := 'No rooms available for this time slot';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create the main couples booking function
CREATE OR REPLACE FUNCTION process_couples_booking(
    p_primary_service_id UUID,
    p_secondary_service_id UUID,
    p_primary_staff_id UUID,
    p_secondary_staff_id UUID,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_booking_date DATE,
    p_start_time TIME,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_group_id UUID,
    primary_booking_id UUID,
    secondary_booking_id UUID,
    room_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_assignment RECORD;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_end_time TIME;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'One or both services not found';
        RETURN;
    END IF;
    
    -- Validate staff availability (cannot be the same staff for both)
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Cannot assign the same staff member to both customers';
        RETURN;
    END IF;
    
    -- Get optimal room assignment (using primary service for room selection)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_assignment
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, p_start_time);
    
    IF v_room_assignment.assigned_room_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, COALESCE(v_room_assignment.assignment_reason, 'No suitable room available');
        RETURN;
    END IF;
    
    -- Validate room capacity for couples
    IF (SELECT capacity FROM rooms WHERE id = v_room_assignment.assigned_room_id) < 2 THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Selected room cannot accommodate couples booking';
        RETURN;
    END IF;
    
    -- Calculate end time (use the longer of the two services)
    v_end_time := p_start_time + INTERVAL '1 minute' * GREATEST(v_primary_service.duration, v_secondary_service.duration);
    
    -- Create both bookings atomically
    BEGIN
        -- Insert primary booking
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email, customer_phone,
            booking_date, start_time, end_time, booking_group_id, booking_type, 
            special_requests, total_price, status
        ) VALUES (
            p_primary_service_id, p_primary_staff_id, v_room_assignment.assigned_room_id,
            p_customer_name || ' (Person 1)', p_customer_email, p_customer_phone,
            p_booking_date, p_start_time, v_end_time, v_booking_group_id, 'couple',
            p_special_requests, v_primary_service.price, 'confirmed'
        ) RETURNING id INTO v_primary_booking_id;
        
        -- Insert secondary booking
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email, customer_phone,
            booking_date, start_time, end_time, booking_group_id, booking_type,
            special_requests, total_price, status
        ) VALUES (
            p_secondary_service_id, p_secondary_staff_id, v_room_assignment.assigned_room_id,
            p_customer_name || ' (Person 2)', p_customer_email, p_customer_phone,
            p_booking_date, p_start_time, v_end_time, v_booking_group_id, 'couple',
            p_special_requests, v_secondary_service.price, 'confirmed'
        ) RETURNING id INTO v_secondary_booking_id;
        
        -- Return success
        RETURN QUERY SELECT 
            v_booking_group_id, v_primary_booking_id, v_secondary_booking_id, 
            v_room_assignment.assigned_room_id, true, 
            'Couples booking created successfully'::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        -- Transaction will rollback automatically
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
            false, 'Failed to create bookings: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get couples booking details
CREATE OR REPLACE FUNCTION get_couples_booking_details(p_booking_group_id UUID)
RETURNS TABLE (
    booking_id UUID,
    customer_name VARCHAR,
    customer_email VARCHAR,
    staff_name VARCHAR,
    service_name VARCHAR,
    booking_date DATE,
    start_time TIME,
    end_time TIME,
    room_name VARCHAR,
    total_price DECIMAL(10,2),
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.customer_name,
        b.customer_email,
        s.name as staff_name,
        sv.name as service_name,
        b.booking_date,
        b.start_time,
        b.end_time,
        r.name as room_name,
        b.total_price,
        b.status
    FROM bookings b
    LEFT JOIN staff s ON s.id = b.staff_id
    LEFT JOIN services sv ON sv.id = b.service_id
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE b.booking_group_id = p_booking_group_id
    ORDER BY b.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel couples bookings
CREATE OR REPLACE FUNCTION cancel_couples_booking(p_booking_group_id UUID)
RETURNS TABLE (
    cancelled_count INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_cancelled_count INTEGER;
BEGIN
    UPDATE bookings 
    SET status = 'cancelled', 
        updated_at = NOW()
    WHERE booking_group_id = p_booking_group_id 
      AND status != 'cancelled';
    
    GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
    
    IF v_cancelled_count > 0 THEN
        RETURN QUERY SELECT v_cancelled_count, true, 'Couples booking cancelled successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT 0, false, 'No active bookings found for this group'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the process_booking function to handle couples bookings
CREATE OR REPLACE FUNCTION process_booking(
    p_service_id UUID,
    p_staff_id UUID,
    p_room_id UUID,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_booking_date DATE,
    p_start_time TIME,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL,
    p_booking_group_id UUID DEFAULT NULL,
    p_booking_type VARCHAR DEFAULT 'single'
)
RETURNS TABLE (
    booking_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    service_duration INTEGER;
    calculated_end_time TIME;
    service_price DECIMAL(10,2);
    new_booking_id UUID;
    service_record RECORD;
BEGIN
    -- Get service details
    SELECT * INTO service_record FROM services WHERE id = p_service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Service not found or inactive'::TEXT;
        RETURN;
    END IF;
    
    service_duration := service_record.duration;
    service_price := service_record.price;
    
    -- Calculate end time
    calculated_end_time := p_start_time + INTERVAL '1 minute' * service_duration;
    
    -- For couples services, validate room capacity
    IF (service_record.is_couples_service = true OR service_record.requires_couples_room = true OR p_booking_type = 'couple') THEN
        IF (SELECT capacity FROM rooms WHERE id = p_room_id) < 2 THEN
            RETURN QUERY SELECT NULL::UUID, false, 'Room does not have capacity for couples service'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Insert booking
    BEGIN
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email, 
            customer_phone, booking_date, start_time, end_time, 
            special_requests, total_price, booking_group_id, booking_type, status
        ) VALUES (
            p_service_id, p_staff_id, p_room_id, p_customer_name, p_customer_email,
            p_customer_phone, p_booking_date, p_start_time, calculated_end_time,
            p_special_requests, service_price, p_booking_group_id, p_booking_type, 'confirmed'
        ) RETURNING id INTO new_booking_id;
        
        RETURN QUERY SELECT new_booking_id, true, 'Booking created successfully'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Failed to create booking: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_couples_booking_details TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION process_booking TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN bookings.booking_group_id IS 'UUID linking related bookings (couples bookings share the same group_id)';
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: single, couple, or group';
COMMENT ON COLUMN services.is_couples_service IS 'Indicates if this service is designed for couples';
COMMENT ON FUNCTION process_couples_booking IS 'Creates linked bookings for couples services with automatic room assignment';
COMMENT ON FUNCTION get_couples_booking_details IS 'Retrieves all bookings associated with a couples booking group';
COMMENT ON FUNCTION cancel_couples_booking IS 'Cancels all bookings in a couples group atomically';

-- Success message
SELECT 'Couples booking migration completed successfully!' as result;