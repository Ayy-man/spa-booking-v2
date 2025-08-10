-- Apply both migrations to fix couples booking payment option issues
-- Run this in your Supabase SQL editor

-- Migration 032: Remove full_payment option from payment_option check constraint
-- Update any existing 'full_payment' records to 'deposit'
UPDATE public.bookings 
SET payment_option = 'deposit' 
WHERE payment_option = 'full_payment';

-- Drop the existing check constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_payment_option_check;

-- Add the new check constraint without 'full_payment'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_payment_option_check 
CHECK (payment_option = ANY (ARRAY['deposit'::text, 'pay_on_location'::text]));

-- Update the default value to ensure it's valid
ALTER TABLE public.bookings 
ALTER COLUMN payment_option SET DEFAULT 'deposit'::text;

-- Migration 033: Fix couples booking function to include payment_option field
DROP FUNCTION IF EXISTS process_couples_booking_v3 CASCADE;

CREATE OR REPLACE FUNCTION process_couples_booking_v3(
    p_booking_date DATE,
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_primary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_service_id TEXT,
    p_secondary_staff_id TEXT,
    p_start_time TIME,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL,
    p_payment_option TEXT DEFAULT 'deposit'  -- Add payment option parameter
)
RETURNS TABLE (
    booking_id UUID,
    room_id INTEGER,
    booking_group_id UUID,
    success BOOLEAN,
    error_message TEXT,
    staff_id TEXT,
    service_duration INTEGER
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
    v_primary_end_time TIME;
    v_secondary_end_time TIME;
    v_max_duration INTEGER;
    v_customer_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_any_staff_id TEXT := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_primary_resolved_staff_id TEXT;
    v_secondary_resolved_staff_id TEXT;
    v_valid_payment_option TEXT;
BEGIN
    -- Validate payment option
    IF p_payment_option NOT IN ('deposit', 'pay_on_location') THEN
        v_valid_payment_option := 'deposit';  -- Default to deposit if invalid option provided
    ELSE
        v_valid_payment_option := p_payment_option;
    END IF;

    -- Generate group ID for linking the bookings
    v_booking_group_id := uuid_generate_v4();
    
    -- Validate that "any" staff has been resolved to actual staff
    IF p_primary_staff_id = 'any' OR p_primary_staff_id = v_any_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary staff must be resolved to actual staff member before booking'::TEXT, 
            p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    IF p_secondary_staff_id = 'any' OR p_secondary_staff_id = v_any_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary staff must be resolved to actual staff member before booking'::TEXT, 
            p_secondary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Validate different staff members for couples booking
    IF p_primary_staff_id = p_secondary_staff_id THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Cannot book the same staff member for both people in couples booking'::TEXT, 
            p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Get primary service details
    SELECT * INTO v_primary_service FROM services WHERE id = p_primary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary service not found'::TEXT, p_primary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Get secondary service details
    SELECT * INTO v_secondary_service FROM services WHERE id = p_secondary_service_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary service not found'::TEXT, p_secondary_staff_id, 0;
        RETURN;
    END IF;
    
    -- Calculate individual end times based on each service's duration
    v_primary_end_time := p_start_time + INTERVAL '1 minute' * v_primary_service.duration;
    v_secondary_end_time := p_start_time + INTERVAL '1 minute' * v_secondary_service.duration;
    
    -- Get max duration for room booking (room needs to be available for the longest service)
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    
    -- Find optimal couples room (prefer room 3, then room 2) with proper table qualification
    SELECT r.id, r.name INTO v_room_id, v_room_name 
    FROM rooms r
    WHERE r.is_active = true 
        AND r.capacity >= 2 
        AND r.id IN (3, 2)  -- Preferred couples rooms
        AND NOT EXISTS (
            -- Check room availability for the max duration window
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id 
                AND b.appointment_date = p_booking_date 
                AND b.status != 'cancelled'
                AND (
                    -- Check for overlap including 15-minute buffer
                    (b.start_time - INTERVAL '15 minutes' < p_start_time + INTERVAL '1 minute' * v_max_duration + INTERVAL '15 minutes')
                    AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
                )
        )
    ORDER BY CASE r.id WHEN 3 THEN 1 WHEN 2 THEN 2 ELSE 3 END -- Prefer room 3 first, then room 2
    LIMIT 1;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'No couples rooms (Room 2 or Room 3) available at this time. Please select a different time slot.'::TEXT, 
            NULL::TEXT, 0;
        RETURN;
    END IF;
    
    -- Validate staff availability for their specific service durations with proper table qualification
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_primary_staff_id 
            AND b.appointment_date = p_booking_date 
            AND b.status != 'cancelled'
            AND (
                (b.start_time - INTERVAL '15 minutes' < v_primary_end_time + INTERVAL '15 minutes')
                AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Primary staff member is already booked for this time slot (including 15-minute buffer between appointments)'::TEXT, 
            p_primary_staff_id, v_primary_service.duration;
        RETURN;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_secondary_staff_id 
            AND b.appointment_date = p_booking_date 
            AND b.status != 'cancelled'
            AND (
                (b.start_time - INTERVAL '15 minutes' < v_secondary_end_time + INTERVAL '15 minutes')
                AND (b.end_time + INTERVAL '15 minutes' > p_start_time - INTERVAL '15 minutes')
            )
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Secondary staff member is already booked for this time slot (including 15-minute buffer between appointments)'::TEXT, 
            p_secondary_staff_id, v_secondary_service.duration;
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
        ELSE
            -- Update existing customer's phone if provided and different
            IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
                UPDATE customers 
                SET phone = p_customer_phone, 
                    first_name = COALESCE(NULLIF(v_first_name, ''), first_name),
                    last_name = COALESCE(NULLIF(v_last_name, ''), last_name)
                WHERE id = v_customer_id;
            END IF;
        END IF;
        
        -- Create first booking (primary service) with individual duration and end time
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
            duration, total_price, discount, final_price, status, payment_status,
            booking_group_id, booking_type, notes, payment_option
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id, 
            p_booking_date, p_start_time, v_primary_end_time,
            v_primary_service.duration, v_primary_service.price, 0, v_primary_service.price,
            'pending', 'pending', v_booking_group_id, 'couple', p_special_requests, v_valid_payment_option
        ) RETURNING id INTO v_booking1_id;
        
        -- Create second booking (secondary service) with individual duration and end time
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
            duration, total_price, discount, final_price, status, payment_status,
            booking_group_id, booking_type, notes, payment_option
        ) VALUES (
            v_customer_id, p_secondary_service_id, p_secondary_staff_id, v_room_id, 
            p_booking_date, p_start_time, v_secondary_end_time,
            v_secondary_service.duration, v_secondary_service.price, 0, v_secondary_service.price,
            'pending', 'pending', v_booking_group_id, 'couple', p_special_requests, v_valid_payment_option
        ) RETURNING id INTO v_booking2_id;
        
        -- Return success with both booking IDs and their individual details
        RETURN QUERY SELECT v_booking1_id, v_room_id, v_booking_group_id, true, 
            'Primary booking created successfully'::TEXT, p_primary_staff_id, v_primary_service.duration;
        RETURN QUERY SELECT v_booking2_id, v_room_id, v_booking_group_id, true, 
            'Secondary booking created successfully'::TEXT, p_secondary_staff_id, v_secondary_service.duration;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Failed to create bookings: ' || SQLERRM, NULL::TEXT, 0;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_couples_booking_v3 TO authenticated, anon;

COMMENT ON FUNCTION process_couples_booking_v3 IS 'Creates couples bookings with individual duration calculations, staff resolution validation, preferred room assignment, and proper payment_option field support (deposit or pay_on_location only).';