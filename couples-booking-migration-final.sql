-- =====================================================
-- COUPLES BOOKING MIGRATION - FINAL VERSION
-- Uses correct enum values from your actual database
-- =====================================================

-- Add missing columns to bookings table (safe adds)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_group_id UUID DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'single' 
    CHECK (booking_type IN ('single', 'couple', 'group'));

-- Create index for efficient group lookup
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(booking_group_id);

-- Update existing services to mark couples services
-- (is_couples_service already exists in your schema)
UPDATE services 
SET is_couples_service = true 
WHERE requires_room_3 = true 
   OR name ILIKE '%couple%' 
   OR name ILIKE '%package%'
   OR category = 'package'
   OR id IN (
       'balinese_facial_package',
       'deep_tissue_3face', 
       'hot_stone_microderm'
   );

-- Add couples-specific services using correct enum values
INSERT INTO services (id, name, description, category, duration, price, is_couples_service, is_active)
VALUES 
    ('couples_relaxation_massage', 'Couples Relaxation Massage', 'Side-by-side relaxation massage for two', 'massage', 60, 160.00, true, true),
    ('couples_hot_stone_massage', 'Couples Hot Stone Massage', 'Side-by-side hot stone massage for two', 90, 200.00, 'massage', true, true),
    ('couples_facial_treatment', 'Couples Facial Treatment', 'Side-by-side facial treatments for two', 'facial', 60, 140.00, true, true),
    ('couples_spa_package', 'Couples Spa Package', 'Complete spa experience for two including massage and facial', 'package', 120, 300.00, true, true)
ON CONFLICT (id) DO UPDATE SET
    is_couples_service = true;

-- Fixed assign_optimal_room function using correct data types and logic
CREATE OR REPLACE FUNCTION assign_optimal_room(
    p_service_id text,
    p_preferred_staff_id text DEFAULT NULL,
    p_booking_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL
)
RETURNS TABLE (
    assigned_room_id integer,
    assigned_room_name text,
    assignment_reason text
) AS $$
DECLARE
    service_record RECORD;
    staff_default_room integer;
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
    
    -- Get staff default room if staff is specified and not 'any'
    IF p_preferred_staff_id IS NOT NULL AND p_preferred_staff_id != 'any' THEN
        SELECT default_room_id INTO staff_default_room FROM staff WHERE id = p_preferred_staff_id;
    END IF;
    
    -- Rule 1: Services that require Room 3 (body scrubs, etc.)
    IF service_record.requires_room_3 = true THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = 3 AND is_active = true 
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = 3
            AND appointment_date = p_booking_date 
            AND start_time <= p_start_time 
            AND end_time > p_start_time
            AND status NOT IN ('cancelled', 'completed')
        ))
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Service requires Room 3';
            RETURN NEXT;
            RETURN;
        ELSE
            assigned_room_id := NULL;
            assigned_room_name := NULL;
            assignment_reason := 'Room 3 not available (required for this service)';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 2: Couples services prefer Room 3, then Room 2 (never Room 1)
    IF service_record.is_couples_service = true THEN
        -- Try Room 3 first (best for couples - has equipment + capacity)
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = 3 AND is_active = true AND capacity >= 2
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = 3
            AND appointment_date = p_booking_date 
            AND start_time <= p_start_time 
            AND end_time > p_start_time
            AND status NOT IN ('cancelled', 'completed')
        ))
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Couples service assigned to preferred Room 3';
            RETURN NEXT;
            RETURN;
        END IF;
        
        -- Try Room 2 next (couples room)
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = 2 AND is_active = true AND capacity >= 2
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = 2
            AND appointment_date = p_booking_date 
            AND start_time <= p_start_time 
            AND end_time > p_start_time
            AND status NOT IN ('cancelled', 'completed')
        ))
        LIMIT 1;
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Couples service assigned to Room 2';
            RETURN NEXT;
            RETURN;
        ELSE
            assigned_room_id := NULL;
            assigned_room_name := NULL;
            assignment_reason := 'No couples rooms available (Rooms 2 and 3 are both booked)';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 3: Try staff's default room first for single services
    IF staff_default_room IS NOT NULL THEN
        SELECT id, name INTO assigned_room_id, assigned_room_name 
        FROM rooms 
        WHERE id = staff_default_room AND is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = staff_default_room
            AND appointment_date = p_booking_date 
            AND start_time <= p_start_time 
            AND end_time > p_start_time
            AND status NOT IN ('cancelled', 'completed')
        ));
        
        IF assigned_room_id IS NOT NULL THEN
            assignment_reason := 'Assigned to staff default room';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Rule 4: Find any available room (prefer smaller capacity for single services)
    FOR room_record IN 
        SELECT id, name FROM rooms 
        WHERE is_active = true
        AND (p_booking_date IS NULL OR p_start_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE room_id = rooms.id
            AND appointment_date = p_booking_date 
            AND start_time <= p_start_time 
            AND end_time > p_start_time
            AND status NOT IN ('cancelled', 'completed')
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

-- Create couples booking function using correct data types
CREATE OR REPLACE FUNCTION process_couples_booking(
    p_primary_service_id text,
    p_secondary_service_id text,
    p_primary_staff_id text,
    p_secondary_staff_id text,
    p_customer_name text,
    p_customer_email text,
    p_customer_phone text DEFAULT NULL,
    p_booking_date DATE,
    p_start_time TIME,
    p_special_requests text DEFAULT NULL
)
RETURNS TABLE (
    booking_group_id UUID,
    primary_booking_id UUID,
    secondary_booking_id UUID,
    room_id integer,
    success boolean,
    message text
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_assignment RECORD;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_end_time TIME;
    v_customer_id UUID;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    
    IF v_primary_service IS NULL OR v_secondary_service IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer, 
            false, 'One or both services not found';
        RETURN;
    END IF;
    
    -- Validate staff (cannot be the same, unless 'any')
    IF p_primary_staff_id = p_secondary_staff_id AND p_primary_staff_id != 'any' THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer, 
            false, 'Cannot assign the same staff member to both customers';
        RETURN;
    END IF;
    
    -- Get optimal room assignment (using primary service)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_assignment
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, p_start_time);
    
    IF v_room_assignment.assigned_room_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer, 
            false, COALESCE(v_room_assignment.assignment_reason, 'No suitable room available');
        RETURN;
    END IF;
    
    -- Validate room capacity for couples
    IF (SELECT capacity FROM rooms WHERE id = v_room_assignment.assigned_room_id) < 2 THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer, 
            false, 'Selected room cannot accommodate couples booking (capacity < 2)';
        RETURN;
    END IF;
    
    -- Create or get customer
    SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (first_name, last_name, email, phone)
        VALUES (
            split_part(p_customer_name, ' ', 1),
            COALESCE(NULLIF(split_part(p_customer_name, ' ', 2), ''), ''),
            p_customer_email,
            COALESCE(p_customer_phone, '')
        ) RETURNING id INTO v_customer_id;
    END IF;
    
    -- Calculate end time (use the longer of the two services for concurrent booking)
    v_end_time := p_start_time + INTERVAL '1 minute' * GREATEST(v_primary_service.duration, v_secondary_service.duration);
    
    -- Create both bookings atomically
    BEGIN
        -- Insert primary booking
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, 
            appointment_date, start_time, end_time, duration,
            total_price, final_price, booking_group_id, booking_type, 
            notes, status
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_assignment.assigned_room_id,
            p_booking_date, p_start_time, v_end_time, v_primary_service.duration,
            v_primary_service.price, v_primary_service.price, v_booking_group_id, 'couple',
            COALESCE(p_special_requests, '') || ' (Person 1)', 'confirmed'
        ) RETURNING id INTO v_primary_booking_id;
        
        -- Insert secondary booking
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id,
            appointment_date, start_time, end_time, duration,
            total_price, final_price, booking_group_id, booking_type,
            notes, status
        ) VALUES (
            v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_assignment.assigned_room_id,
            p_booking_date, p_start_time, v_end_time, v_secondary_service.duration,
            v_secondary_service.price, v_secondary_service.price, v_booking_group_id, 'couple',
            COALESCE(p_special_requests, '') || ' (Person 2)', 'confirmed'
        ) RETURNING id INTO v_secondary_booking_id;
        
        -- Return success
        RETURN QUERY SELECT 
            v_booking_group_id, v_primary_booking_id, v_secondary_booking_id, 
            v_room_assignment.assigned_room_id, true, 
            'Couples booking created successfully'::text;
            
    EXCEPTION WHEN OTHERS THEN
        -- Transaction will rollback automatically
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer,
            false, 'Failed to create bookings: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get couples booking details
CREATE OR REPLACE FUNCTION get_couples_booking_details(p_booking_group_id UUID)
RETURNS TABLE (
    booking_id UUID,
    customer_name text,
    customer_email text,
    staff_name text,
    service_name text,
    booking_date DATE,
    start_time TIME,
    end_time TIME,
    room_name text,
    total_price numeric,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        (c.first_name || ' ' || c.last_name) as customer_name,
        c.email as customer_email,
        s.name as staff_name,
        sv.name as service_name,
        b.appointment_date as booking_date,
        b.start_time,
        b.end_time,
        r.name as room_name,
        b.total_price,
        b.status::text
    FROM bookings b
    LEFT JOIN staff s ON s.id = b.staff_id
    LEFT JOIN services sv ON sv.id = b.service_id
    LEFT JOIN rooms r ON r.id = b.room_id
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.booking_group_id = p_booking_group_id
    ORDER BY b.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel couples bookings
CREATE OR REPLACE FUNCTION cancel_couples_booking(p_booking_group_id UUID)
RETURNS TABLE (
    cancelled_count integer,
    success boolean,
    message text
) AS $$
DECLARE
    v_cancelled_count integer;
BEGIN
    UPDATE bookings 
    SET status = 'cancelled', 
        updated_at = NOW(),
        cancelled_at = NOW()
    WHERE booking_group_id = p_booking_group_id 
      AND status NOT IN ('cancelled', 'completed');
    
    GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
    
    IF v_cancelled_count > 0 THEN
        RETURN QUERY SELECT v_cancelled_count, true, 'Couples booking cancelled successfully'::text;
    ELSE
        RETURN QUERY SELECT 0, false, 'No active bookings found for this group'::text;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_couples_booking_details TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_couples_booking TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN bookings.booking_group_id IS 'UUID linking related bookings (couples bookings share the same group_id)';
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: single, couple, or group';
COMMENT ON FUNCTION process_couples_booking IS 'Creates linked bookings for couples services with automatic room assignment';
COMMENT ON FUNCTION get_couples_booking_details IS 'Retrieves all bookings associated with a couples booking group';
COMMENT ON FUNCTION cancel_couples_booking IS 'Cancels all bookings in a couples group atomically';

-- Success message
SELECT 'Couples booking migration completed successfully! Using correct enum values.' as result;