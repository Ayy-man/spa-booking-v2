-- =====================================================
-- COUPLES BOOKING MIGRATION - SIMPLE & SAFE VERSION
-- Just adds the essential columns and functions
-- =====================================================

-- Add missing columns to bookings table (safe adds)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_group_id UUID DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'single' 
    CHECK (booking_type IN ('single', 'couple', 'group'));

-- Create index for efficient group lookup
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(booking_group_id);

-- Update existing package services to mark as couples services
-- (is_couples_service column already exists)
UPDATE services 
SET is_couples_service = true 
WHERE requires_room_3 = true 
   OR name ILIKE '%package%'
   OR category = 'package';

-- Create the core couples booking function
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
    v_primary_service RECORD;
    v_secondary_service RECORD;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_end_time TIME;
    v_customer_id UUID;
    v_room_id integer;
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
    
    -- Simple room assignment: prefer Room 3, then Room 2 for couples
    SELECT id INTO v_room_id 
    FROM rooms 
    WHERE id IN (3, 2) AND is_active = true AND capacity >= 2
    AND NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = rooms.id
        AND appointment_date = p_booking_date 
        AND start_time <= p_start_time 
        AND end_time > p_start_time
        AND status NOT IN ('cancelled', 'completed')
    )
    ORDER BY id DESC -- Prefer Room 3 (id=3) over Room 2 (id=2)
    LIMIT 1;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::UUID, NULL::integer, 
            false, 'No couples rooms available (Rooms 2 and 3 are both booked)';
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
    
    -- Calculate end time (use the longer of the two services)
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
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id,
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
            v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id,
            p_booking_date, p_start_time, v_end_time, v_secondary_service.duration,
            v_secondary_service.price, v_secondary_service.price, v_booking_group_id, 'couple',
            COALESCE(p_special_requests, '') || ' (Person 2)', 'confirmed'
        ) RETURNING id INTO v_secondary_booking_id;
        
        -- Return success
        RETURN QUERY SELECT 
            v_booking_group_id, v_primary_booking_id, v_secondary_booking_id, 
            v_room_id, true, 
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking TO authenticated;
GRANT EXECUTE ON FUNCTION get_couples_booking_details TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_couples_booking TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN bookings.booking_group_id IS 'UUID linking related bookings (couples bookings share the same group_id)';
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: single, couple, or group';

-- Success message
SELECT 'Couples booking migration completed successfully!' as result;