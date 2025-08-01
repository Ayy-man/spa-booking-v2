-- URGENT FIX: Run this SQL directly in the Supabase dashboard
-- This fixes all database function data type mismatches for couples booking

-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS process_couples_booking CASCADE;
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;
DROP FUNCTION IF EXISTS assign_optimal_room CASCADE;
DROP FUNCTION IF EXISTS check_staff_capability CASCADE;
DROP FUNCTION IF EXISTS get_staff_schedule CASCADE;

-- 1. Fix process_couples_booking_v2 function with correct parameter types
CREATE OR REPLACE FUNCTION process_couples_booking_v2(
    p_booking_date DATE,
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_primary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_service_id TEXT,
    p_secondary_staff_id TEXT,
    p_start_time TIME,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    room_id INTEGER,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_room_name VARCHAR;
    v_assignment_reason TEXT;
    v_booking1_id UUID;
    v_booking2_id UUID;
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_end_time TIME;
    v_max_duration INTEGER;
    v_customer_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Get primary service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 'Primary service not found';
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 'Secondary service not found';
        RETURN;
    END IF;
    
    -- Calculate end time based on the longer service
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    v_end_time := p_start_time + INTERVAL '1 minute' * v_max_duration;
    
    -- Find optimal room for couples (prioritize rooms that can handle both services)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_id, v_room_name, v_assignment_reason
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, p_start_time);
    
    -- If primary service room doesn't work, try secondary service room
    IF v_room_id IS NULL THEN
        SELECT assigned_room_id, assigned_room_name, assignment_reason 
        INTO v_room_id, v_room_name, v_assignment_reason
        FROM assign_optimal_room(p_secondary_service_id, p_secondary_staff_id, p_booking_date, p_start_time);
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            COALESCE(v_assignment_reason, 'No suitable room available for couples booking');
        RETURN;
    END IF;
    
    -- Check room capacity
    IF (SELECT capacity FROM rooms WHERE id = v_room_id) < 2 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Selected room does not have capacity for couples';
        RETURN;
    END IF;
    
    -- Validate staff availability
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Cannot book the same staff member for both services';
        RETURN;
    END IF;
    
    -- Create or find customer record
    BEGIN
        -- Split customer name into first and last name
        v_first_name := SPLIT_PART(p_customer_name, ' ', 1);
        v_last_name := SUBSTRING(p_customer_name FROM LENGTH(v_first_name) + 2);
        IF v_last_name IS NULL OR v_last_name = '' THEN
            v_last_name := '';
        END IF;
        
        -- Try to find existing customer by email
        SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email;
        
        IF NOT FOUND THEN
            -- Create new customer
            INSERT INTO customers (
                first_name, last_name, email, phone, marketing_consent, is_active
            ) VALUES (
                v_first_name, v_last_name, p_customer_email, p_customer_phone, false, true
            ) RETURNING id INTO v_customer_id;
        END IF;
        
        -- Create first booking (primary service)
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
            duration, total_price, discount, final_price, status, payment_status,
            booking_group_id, booking_type, notes
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id, 
            p_booking_date, p_start_time, v_end_time,
            v_primary_service.duration, v_primary_service.price, 0, v_primary_service.price,
            'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
        ) RETURNING id INTO v_booking1_id;
        
        -- Create second booking (secondary service) - only if different from primary
        IF p_primary_service_id != p_secondary_service_id THEN
            INSERT INTO bookings (
                customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
                duration, total_price, discount, final_price, status, payment_status,
                booking_group_id, booking_type, notes
            ) VALUES (
                v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id, 
                p_booking_date, p_start_time, v_end_time,
                v_secondary_service.duration, v_secondary_service.price, 0, v_secondary_service.price,
                'pending', 'pending', v_booking_group_id, 'couple', p_special_requests
            ) RETURNING id INTO v_booking2_id;
        END IF;
        
        -- Return success with both booking IDs
        RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        IF v_booking2_id IS NOT NULL THEN
            RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 'Success'::TEXT;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Failed to create bookings: ' || SQLERRM;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix assign_optimal_room function
CREATE OR REPLACE FUNCTION assign_optimal_room(
    p_service_id TEXT,
    p_preferred_staff_id TEXT DEFAULT NULL,
    p_booking_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL
)
RETURNS TABLE (
    assigned_room_id INTEGER,
    assigned_room_name VARCHAR,
    assignment_reason TEXT
) AS $$
DECLARE
    service_record RECORD;
    room_record RECORD;
    selected_room_id INTEGER;
    assignment_reason TEXT;
BEGIN
    -- Get service details
    SELECT * INTO service_record FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'Service not found'::TEXT;
        RETURN;
    END IF;
    
    -- Special handling for body scrub services (must use Room 3)
    IF service_record.requires_room_3 = true THEN
        RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Required for body scrub services'::TEXT;
        RETURN;
    END IF;
    
    -- For couples services, prefer Room 3 or Room 2
    IF service_record.is_couples_service = true THEN
        RETURN QUERY SELECT 3::INTEGER, 'Room 3'::VARCHAR, 'Preferred for couples services'::TEXT;
        RETURN;
    END IF;
    
    -- For regular services, use staff's preferred room or first available
    IF p_preferred_staff_id IS NOT NULL THEN
        SELECT default_room_id INTO selected_room_id 
        FROM staff 
        WHERE id = p_preferred_staff_id AND is_active = true;
        
        IF selected_room_id IS NOT NULL THEN
            SELECT name INTO assignment_reason FROM rooms WHERE id = selected_room_id;
            RETURN QUERY SELECT selected_room_id, assignment_reason::VARCHAR, 'Staff preferred room'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Find any available room based on service category
    FOR room_record IN 
        SELECT r.* FROM rooms r 
        WHERE r.is_active = true 
        AND service_record.category = ANY(r.capabilities)
        ORDER BY r.id
        LIMIT 1
    LOOP
        RETURN QUERY SELECT room_record.id, room_record.name::VARCHAR, 'Available room with required capabilities'::TEXT;
        RETURN;
    END LOOP;
    
    -- No suitable room found
    RETURN QUERY SELECT NULL::INTEGER, NULL::VARCHAR, 'No suitable room available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix check_staff_capability function
CREATE OR REPLACE FUNCTION check_staff_capability(
    p_staff_id TEXT,
    p_service_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    service_category service_category;
    staff_capabilities service_category[];
BEGIN
    -- Get service category
    SELECT category INTO service_category FROM services WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get staff capabilities
    SELECT capabilities INTO staff_capabilities FROM staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if staff has the required capability
    RETURN service_category = ANY(staff_capabilities);
END;
$$ LANGUAGE plpgsql;

-- 4. Fix get_staff_schedule function
CREATE OR REPLACE FUNCTION get_staff_schedule(
    p_staff_id TEXT,
    p_date DATE
)
RETURNS TABLE (
    is_working BOOLEAN,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    notes TEXT
) AS $$
DECLARE
    schedule_record RECORD;
    day_of_week INTEGER;
    staff_work_days INTEGER[];
BEGIN
    -- Get the day of week (0 = Sunday, 1 = Monday, etc.)
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- First check if there's a specific schedule for this date
    SELECT * INTO schedule_record 
    FROM staff_schedules 
    WHERE staff_id = p_staff_id AND date = p_date;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            schedule_record.is_available,
            schedule_record.start_time,
            schedule_record.end_time,
            schedule_record.break_start,
            schedule_record.break_end,
            schedule_record.notes;
        RETURN;
    END IF;
    
    -- Fall back to staff's regular work days
    SELECT work_days INTO staff_work_days FROM staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, NULL::TIME, NULL::TIME, 'Staff not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if staff works on this day of week
    IF day_of_week = ANY(staff_work_days) THEN
        RETURN QUERY SELECT true, '09:00'::TIME, '18:00'::TIME, '12:00'::TIME, '13:00'::TIME, 'Regular schedule'::TEXT;
    ELSE
        RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, NULL::TIME, NULL::TIME, 'Not scheduled to work'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_optimal_room TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_staff_capability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_staff_schedule TO authenticated, anon;