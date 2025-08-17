-- Create the process_couples_booking_v2 function (Version 2 - Fixed for enum types)
-- This version handles the service_category enum properly

-- First, let's see what enum values we have
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'service_category';

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

-- Create the function
CREATE OR REPLACE FUNCTION process_couples_booking_v2(
    p_primary_service_id TEXT,
    p_secondary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_staff_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_booking_date DATE DEFAULT CURRENT_DATE,
    p_start_time TIME DEFAULT '09:00'::TIME,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    room_id INTEGER,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_group_id UUID;
    v_room_id INTEGER;
    v_customer_id UUID;
    v_primary_duration INTEGER;
    v_secondary_duration INTEGER;
    v_max_duration INTEGER;
    v_end_time TIME;
    v_primary_booking_id UUID;
    v_secondary_booking_id UUID;
    v_primary_service_category TEXT;
    v_secondary_service_category TEXT;
    v_primary_service_name TEXT;
    v_secondary_service_name TEXT;
    v_requires_special_equipment BOOLEAN := FALSE;
    v_error_message TEXT;
    v_primary_price NUMERIC;
    v_secondary_price NUMERIC;
BEGIN
    -- Generate a booking group ID for linking the two bookings
    v_booking_group_id := gen_random_uuid();
    
    -- Get primary service details (converting category to text to avoid enum issues)
    SELECT s.category::text, s.duration, s.name, s.price,
           (s.category::text = 'body_treatment' OR s.requires_room_3 = true OR 
            s.name ILIKE '%scrub%' OR s.name ILIKE '%brazilian%' OR s.name ILIKE '%vajacial%')
    INTO v_primary_service_category, v_primary_duration, v_primary_service_name, v_primary_price, v_requires_special_equipment
    FROM services s
    WHERE s.id = p_primary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::INTEGER,
            v_booking_group_id,
            FALSE,
            'Primary service not found: ' || p_primary_service_id;
        RETURN;
    END IF;
    
    -- Get secondary service details (converting category to text)
    SELECT s.category::text, s.duration, s.name, s.price
    INTO v_secondary_service_category, v_secondary_duration, v_secondary_service_name, v_secondary_price
    FROM services s
    WHERE s.id = p_secondary_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::INTEGER,
            v_booking_group_id,
            FALSE,
            'Secondary service not found: ' || p_secondary_service_id;
        RETURN;
    END IF;
    
    -- Check if secondary service also requires special equipment
    IF v_secondary_service_category = 'body_treatment' 
       OR EXISTS (SELECT 1 FROM services WHERE id = p_secondary_service_id AND requires_room_3 = true)
       OR v_secondary_service_name ILIKE '%scrub%' 
       OR v_secondary_service_name ILIKE '%brazilian%' 
       OR v_secondary_service_name ILIKE '%vajacial%' THEN
        v_requires_special_equipment := TRUE;
    END IF;
    
    -- Calculate the maximum duration for room booking
    v_max_duration := GREATEST(COALESCE(v_primary_duration, 60), COALESCE(v_secondary_duration, 60));
    v_end_time := p_start_time + (v_max_duration || ' minutes')::INTERVAL;
    
    -- Find or create customer
    SELECT c.id INTO v_customer_id
    FROM customers c
    WHERE c.email = p_customer_email
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name, 
            last_name, 
            email, 
            phone,
            marketing_consent,
            is_active
        ) VALUES (
            COALESCE(SPLIT_PART(p_customer_name, ' ', 1), p_customer_name),
            COALESCE(NULLIF(SPLIT_PART(p_customer_name, ' ', 2), ''), ''),
            p_customer_email,
            p_customer_phone,
            false,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Room assignment logic for couples
    -- For couples bookings, both people share the same room
    BEGIN
        -- First priority: Room 3 if special equipment is needed or mixed service types
        IF v_requires_special_equipment OR v_primary_service_category != v_secondary_service_category THEN
            -- Try Room 3 first (has all equipment and capacity 2)
            IF NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 3
                AND b.appointment_date = p_booking_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 3;
            END IF;
            
            -- If Room 3 is not available, try Room 2
            IF v_room_id IS NULL AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 2
                AND b.appointment_date = p_booking_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 2;
            END IF;
        ELSE
            -- For same service types without special equipment, try Room 2 first, then Room 3
            IF NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 2
                AND b.appointment_date = p_booking_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 2;
            END IF;
            
            -- If Room 2 is not available, try Room 3
            IF v_room_id IS NULL AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = 3
                AND b.appointment_date = p_booking_date
                AND b.status != 'cancelled'
                AND (
                    (b.start_time < v_end_time AND b.end_time > p_start_time)
                )
            ) THEN
                v_room_id := 3;
            END IF;
        END IF;
        
        -- If no room is available, return error
        IF v_room_id IS NULL THEN
            v_error_message := 'No couples room available at ' || p_start_time::TEXT || ' on ' || p_booking_date::TEXT;
            v_error_message := v_error_message || '. Rooms 2 and 3 are both occupied during this time.';
            
            RETURN QUERY
            SELECT 
                NULL::UUID,
                NULL::INTEGER,
                v_booking_group_id,
                FALSE,
                v_error_message;
            RETURN;
        END IF;
    END;
    
    -- Check staff availability for both staff members (skip if 'any' is selected)
    IF p_primary_staff_id != 'any' AND p_secondary_staff_id != 'any' AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id IN (p_primary_staff_id, p_secondary_staff_id)
        AND b.appointment_date = p_booking_date
        AND b.status != 'cancelled'
        AND (
            (b.start_time < v_end_time AND b.end_time > p_start_time)
        )
    ) THEN
        v_error_message := 'One or more staff members are not available at this time';
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::INTEGER,
            v_booking_group_id,
            FALSE,
            v_error_message;
        RETURN;
    END IF;
    
    -- Create the primary booking
    BEGIN
        INSERT INTO bookings (
            customer_id,
            service_id,
            staff_id,
            room_id,
            appointment_date,
            start_time,
            end_time,
            duration,
            total_price,
            discount,
            final_price,
            status,
            payment_status,
            payment_option,
            notes,
            booking_type,
            booking_group_id
        ) VALUES (
            v_customer_id,
            p_primary_service_id,
            p_primary_staff_id,
            v_room_id,
            p_booking_date,
            p_start_time,
            p_start_time + (v_primary_duration || ' minutes')::INTERVAL,
            v_primary_duration,
            v_primary_price,
            0,
            v_primary_price,
            'confirmed',
            'pending',
            'deposit',
            p_special_requests,
            'couple',
            v_booking_group_id
        )
        RETURNING id INTO v_primary_booking_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := 'Failed to create primary booking: ' || SQLERRM;
            RETURN QUERY
            SELECT 
                NULL::UUID,
                v_room_id,
                v_booking_group_id,
                FALSE,
                v_error_message;
            RETURN;
    END;
    
    -- Create the secondary booking (same room, potentially different staff)
    BEGIN
        INSERT INTO bookings (
            customer_id,
            service_id,
            staff_id,
            room_id,
            appointment_date,
            start_time,
            end_time,
            duration,
            total_price,
            discount,
            final_price,
            status,
            payment_status,
            payment_option,
            notes,
            booking_type,
            booking_group_id
        ) VALUES (
            v_customer_id,
            p_secondary_service_id,
            p_secondary_staff_id,
            v_room_id,  -- Same room as primary booking
            p_booking_date,
            p_start_time,
            p_start_time + (v_secondary_duration || ' minutes')::INTERVAL,
            v_secondary_duration,
            v_secondary_price,
            0,
            v_secondary_price,
            'confirmed',
            'pending',
            'deposit',
            p_special_requests,
            'couple',
            v_booking_group_id
        )
        RETURNING id INTO v_secondary_booking_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback the primary booking if secondary fails
            DELETE FROM bookings WHERE id = v_primary_booking_id;
            v_error_message := 'Failed to create secondary booking: ' || SQLERRM;
            RETURN QUERY
            SELECT 
                NULL::UUID,
                v_room_id,
                v_booking_group_id,
                FALSE,
                v_error_message;
            RETURN;
    END;
    
    -- Return success for both bookings
    RETURN QUERY
    SELECT 
        v_primary_booking_id,
        v_room_id,
        v_booking_group_id,
        TRUE,
        NULL::TEXT
    UNION ALL
    SELECT 
        v_secondary_booking_id,
        v_room_id,
        v_booking_group_id,
        TRUE,
        NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up any partial bookings (with proper table alias to avoid ambiguity)
        DELETE FROM bookings b WHERE b.booking_group_id = v_booking_group_id;
        v_error_message := 'Unexpected error in couples booking: ' || SQLERRM;
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::INTEGER,
            v_booking_group_id,
            FALSE,
            v_error_message;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO anon;

-- Add helpful comment
COMMENT ON FUNCTION process_couples_booking_v2 IS 'Creates coupled bookings for two services with the same customer, ensuring they share the same room. Prioritizes Room 3 for mixed service types or services requiring special equipment. Fixed for enum type handling.';

-- Verify the function was created
SELECT 
    'Function created successfully!' as status,
    proname as function_name,
    pronargs as num_arguments
FROM pg_proc 
WHERE proname = 'process_couples_booking_v2';