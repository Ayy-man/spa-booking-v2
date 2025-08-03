-- =====================================================
-- MIGRATION: Add Couples Booking Support
-- =====================================================
-- This migration adds comprehensive support for couples bookings
-- including linked bookings, proper service identification, and
-- updated functions to handle couples scenarios
-- =====================================================

-- 1. Add is_couples_service flag to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_couples_service BOOLEAN DEFAULT FALSE;

-- 2. Add booking_group_id to link related bookings (couples, groups)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_group_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'single' 
  CHECK (booking_type IN ('single', 'couple', 'group'));

-- Create index for efficient group lookup
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(booking_group_id);

-- 3. Update existing services to mark couples services
UPDATE services 
SET is_couples_service = true 
WHERE requires_couples_room = true 
   OR name LIKE '%Couples%' 
   OR name LIKE '%Package%'
   OR is_package = true;

-- 4. Add explicit couples services if they don't exist
INSERT INTO services (name, description, duration, price, category, requires_couples_room, is_couples_service, is_active)
VALUES 
  ('Couples Relaxation Massage', 'Side-by-side relaxation massage for two', 60, 160.00, 'massage', true, true, true),
  ('Couples Hot Stone Massage', 'Side-by-side hot stone massage for two', 90, 200.00, 'massage', true, true, true),
  ('Couples Facial Treatment', 'Side-by-side facial treatments for two', 60, 140.00, 'facial', true, true, true),
  ('Couples Spa Package', 'Complete spa experience for two including massage and facial', 120, 300.00, 'package', true, true, true)
ON CONFLICT DO NOTHING;

-- 5. Create view for couples booking availability
CREATE OR REPLACE VIEW couples_booking_availability AS
SELECT 
  b1.booking_group_id,
  b1.booking_date,
  b1.start_time,
  b1.end_time,
  b1.room_id,
  r.name as room_name,
  r.capacity,
  COUNT(*) as bookings_in_group,
  ARRAY_AGG(DISTINCT b1.staff_id) as staff_ids,
  ARRAY_AGG(DISTINCT b1.customer_name) as customer_names
FROM bookings b1
JOIN rooms r ON r.id = b1.room_id
WHERE b1.booking_group_id IS NOT NULL
  AND b1.status != 'cancelled'
GROUP BY b1.booking_group_id, b1.booking_date, b1.start_time, 
         b1.end_time, b1.room_id, r.name, r.capacity;

-- 6. Update assign_optimal_room function to handle couples services properly
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
    
    -- Rule 2: Couples services require rooms with capacity >= 2
    IF service_record.requires_couples_room = true OR service_record.is_couples_service = true THEN
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
        
        -- No couples room available
        assignment_reason := 'No couples room available (requires capacity >= 2)';
        RETURN NEXT;
        RETURN;
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

-- 7. Create function to process couples bookings
CREATE OR REPLACE FUNCTION process_couples_booking(
    p_service_id UUID,
    p_customer1_name VARCHAR,
    p_customer1_email VARCHAR,
    p_customer1_phone VARCHAR,
    p_customer2_name VARCHAR,
    p_customer2_email VARCHAR,
    p_customer2_phone VARCHAR,
    p_booking_date DATE,
    p_start_time TIME,
    p_staff1_id UUID DEFAULT NULL,
    p_staff2_id UUID DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_group_id UUID,
    booking1_id UUID,
    booking2_id UUID,
    room_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id UUID;
    v_room_name VARCHAR;
    v_assignment_reason TEXT;
    v_booking1_id UUID;
    v_booking2_id UUID;
    v_service_record RECORD;
    v_end_time TIME;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get service details
    SELECT * INTO v_service_record FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Service not found';
        RETURN;
    END IF;
    
    -- Check if this is actually a couples service
    IF v_service_record.is_couples_service != true AND v_service_record.requires_couples_room != true THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Service is not configured for couples bookings';
        RETURN;
    END IF;
    
    -- Calculate end time
    v_end_time := p_start_time + INTERVAL '1 minute' * v_service_record.duration;
    
    -- Find optimal room for couples
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_id, v_room_name, v_assignment_reason
    FROM assign_optimal_room(p_service_id, p_staff1_id, p_booking_date, p_start_time);
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, COALESCE(v_assignment_reason, 'No suitable room available for couples booking');
        RETURN;
    END IF;
    
    -- Check room capacity
    IF (SELECT capacity FROM rooms WHERE id = v_room_id) < 2 THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Selected room does not have capacity for couples';
        RETURN;
    END IF;
    
    -- Validate staff availability if specified
    IF p_staff1_id IS NOT NULL AND p_staff2_id IS NOT NULL AND p_staff1_id = p_staff2_id THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 
            false, 'Cannot book the same staff member for both clients';
        RETURN;
    END IF;
    
    -- Begin transaction for atomic booking creation
    BEGIN
        -- Create first booking
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email,
            customer_phone, booking_date, start_time, end_time,
            booking_group_id, booking_type, special_requests, total_price
        ) VALUES (
            p_service_id, COALESCE(p_staff1_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Default to first staff if not specified
            v_room_id, p_customer1_name, p_customer1_email,
            p_customer1_phone, p_booking_date, p_start_time, v_end_time,
            v_booking_group_id, 'couple', p_special_requests, v_service_record.price / 2
        ) RETURNING id INTO v_booking1_id;
        
        -- Create second booking
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email,
            customer_phone, booking_date, start_time, end_time,
            booking_group_id, booking_type, special_requests, total_price
        ) VALUES (
            p_service_id, COALESCE(p_staff2_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), -- Default to second staff if not specified
            v_room_id, p_customer2_name, p_customer2_email,
            p_customer2_phone, p_booking_date, p_start_time, v_end_time,
            v_booking_group_id, 'couple', p_special_requests, v_service_record.price / 2
        ) RETURNING id INTO v_booking2_id;
        
        -- Success
        RETURN QUERY SELECT 
            v_booking_group_id, v_booking1_id, v_booking2_id, v_room_id,
            true, NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
            false, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- 8. Update process_booking to handle booking_type parameter
CREATE OR REPLACE FUNCTION process_booking(
    p_service_id UUID,
    p_staff_id UUID,
    p_room_id UUID,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_customer_phone VARCHAR,
    p_booking_date DATE,
    p_start_time TIME,
    p_special_requests TEXT DEFAULT NULL,
    p_booking_group_id UUID DEFAULT NULL,
    p_booking_type VARCHAR DEFAULT 'single'
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
    is_couples_service BOOLEAN;
BEGIN
    -- Get service details
    SELECT duration, price, is_couples_service, requires_couples_room 
    INTO service_duration, service_price, is_couples_service, is_couples_service
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
    
    -- For couples services, validate room capacity
    IF (is_couples_service = true OR p_booking_type = 'couple') THEN
        IF (SELECT capacity FROM rooms WHERE id = p_room_id) < 2 THEN
            booking_id := NULL;
            success := false;
            error_message := 'Room does not have capacity for couples service';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Insert booking
    BEGIN
        INSERT INTO bookings (
            service_id, staff_id, room_id, customer_name, customer_email, 
            customer_phone, booking_date, start_time, end_time, 
            special_requests, total_price, booking_group_id, booking_type
        ) VALUES (
            p_service_id, p_staff_id, p_room_id, p_customer_name, p_customer_email,
            p_customer_phone, p_booking_date, p_start_time, calculated_end_time,
            p_special_requests, service_price, p_booking_group_id, p_booking_type
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

-- 9. Create function to get couples booking details
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
    total_price DECIMAL(10,2)
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
        b.total_price
    FROM bookings b
    JOIN staff s ON s.id = b.staff_id
    JOIN services sv ON sv.id = b.service_id
    JOIN rooms r ON r.id = b.room_id
    WHERE b.booking_group_id = p_booking_group_id
    ORDER BY b.created_at;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to cancel couples bookings together
CREATE OR REPLACE FUNCTION cancel_couples_booking(p_booking_group_id UUID)
RETURNS TABLE (
    cancelled_count INTEGER,
    success BOOLEAN,
    error_message TEXT
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
        RETURN QUERY SELECT v_cancelled_count, true, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT 0, false, 'No active bookings found for this group';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION process_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_couples_booking_details TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_couples_booking TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN bookings.booking_group_id IS 'UUID linking related bookings (e.g., couples bookings share the same group_id)';
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: single, couple, or group';
COMMENT ON COLUMN services.is_couples_service IS 'Indicates if this service is designed for couples (requires 2 people)';
COMMENT ON FUNCTION process_couples_booking IS 'Creates linked bookings for couples services with automatic room assignment';
COMMENT ON FUNCTION get_couples_booking_details IS 'Retrieves all bookings associated with a couples booking group';
COMMENT ON FUNCTION cancel_couples_booking IS 'Cancels all bookings in a couples group atomically';