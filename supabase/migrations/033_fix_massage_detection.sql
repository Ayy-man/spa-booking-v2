-- Fix massage service detection to match frontend logic
-- This ensures all massage services are properly detected for same-staff booking allowance

-- Drop and recreate function with improved massage detection
DROP FUNCTION IF EXISTS process_couples_booking_v2 CASCADE;

CREATE OR REPLACE FUNCTION process_couples_booking_v2(
    p_primary_service_id TEXT,
    p_secondary_service_id TEXT,
    p_primary_staff_id TEXT,
    p_secondary_staff_id TEXT,
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_booking_date DATE,
    p_start_time TEXT,
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
    v_validated_start_time TIME;
    v_is_massage_booking BOOLEAN := false;
    v_primary_is_massage BOOLEAN := false;
    v_secondary_is_massage BOOLEAN := false;
BEGIN
    -- Validate time input first
    BEGIN
        v_validated_start_time := validate_time_input(p_start_time);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            'Invalid start time format: ' || p_start_time || '. ' || SQLERRM;
        RETURN;
    END;
    
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
    
    -- Enhanced massage detection logic to match frontend
    -- Check primary service
    IF v_primary_service.category = 'massage' OR 
       v_primary_service.ghl_category = 'BODY MASSAGES' OR
       LOWER(v_primary_service.name) LIKE '%massage%' OR
       LOWER(v_primary_service.name) LIKE '%balinese%' OR
       LOWER(v_primary_service.name) LIKE '%deep tissue%' OR
       LOWER(v_primary_service.name) LIKE '%hot stone%' OR
       LOWER(v_primary_service.name) LIKE '%maternity%' OR
       LOWER(v_primary_service.name) LIKE '%stretching%' THEN
        v_primary_is_massage := true;
    END IF;
    
    -- Check secondary service
    IF v_secondary_service.category = 'massage' OR 
       v_secondary_service.ghl_category = 'BODY MASSAGES' OR
       LOWER(v_secondary_service.name) LIKE '%massage%' OR
       LOWER(v_secondary_service.name) LIKE '%balinese%' OR
       LOWER(v_secondary_service.name) LIKE '%deep tissue%' OR
       LOWER(v_secondary_service.name) LIKE '%hot stone%' OR
       LOWER(v_secondary_service.name) LIKE '%maternity%' OR
       LOWER(v_secondary_service.name) LIKE '%stretching%' THEN
        v_secondary_is_massage := true;
    END IF;
    
    -- Both must be massages to allow same staff
    v_is_massage_booking := v_primary_is_massage AND v_secondary_is_massage;
    
    -- Calculate end time based on the longer service
    -- For massages with same staff, they can be done simultaneously in a couples room
    v_max_duration := GREATEST(v_primary_service.duration, v_secondary_service.duration);
    v_end_time := v_validated_start_time + INTERVAL '1 minute' * v_max_duration;
    
    -- Find optimal room for couples (prioritize rooms that can handle both services)
    SELECT assigned_room_id, assigned_room_name, assignment_reason 
    INTO v_room_id, v_room_name, v_assignment_reason
    FROM assign_optimal_room(p_primary_service_id, p_primary_staff_id, p_booking_date, v_validated_start_time);
    
    -- If primary service room doesn't work, try secondary service room
    IF v_room_id IS NULL THEN
        SELECT assigned_room_id, assigned_room_name, assignment_reason 
        INTO v_room_id, v_room_name, v_assignment_reason
        FROM assign_optimal_room(p_secondary_service_id, p_secondary_staff_id, p_booking_date, v_validated_start_time);
    END IF;
    
    IF v_room_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
            COALESCE(v_assignment_reason, 'No suitable room available for couples booking');
        RETURN;
    END IF;
    
    -- Validate staff availability - ALLOW same staff for massage services
    IF p_primary_staff_id = p_secondary_staff_id AND NOT v_is_massage_booking THEN
        -- Provide helpful message about why same staff isn't allowed
        IF v_primary_is_massage AND NOT v_secondary_is_massage THEN
            RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
                'Cannot book same staff when mixing massage and non-massage services';
        ELSIF NOT v_primary_is_massage AND v_secondary_is_massage THEN
            RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
                'Cannot book same staff when mixing non-massage and massage services';
        ELSE
            RETURN QUERY SELECT NULL::UUID, NULL::INTEGER, NULL::UUID, false, 
                'Same staff member cannot perform non-massage services for both guests simultaneously';
        END IF;
        RETURN;
    END IF;
    
    -- Log for debugging (can be removed in production)
    RAISE NOTICE 'Massage booking detection: Primary=%, Secondary=%, IsMassageBooking=%', 
                 v_primary_is_massage, v_secondary_is_massage, v_is_massage_booking;
    
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
        
        -- Create first booking (primary service)
        INSERT INTO bookings (
            customer_id, service_id, staff_id, room_id, appointment_date, start_time, end_time,
            duration, total_price, discount, final_price, status, payment_status,
            booking_group_id, booking_type, notes
        ) VALUES (
            v_customer_id, p_primary_service_id, p_primary_staff_id, v_room_id, 
            p_booking_date, v_validated_start_time, v_end_time,
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
                p_booking_date, v_validated_start_time, v_end_time,
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

GRANT EXECUTE ON FUNCTION process_couples_booking_v2 TO authenticated, anon;

COMMENT ON FUNCTION process_couples_booking_v2 IS 
'Creates couples bookings with comprehensive massage detection and time validation. 
Allows same staff member for massage services as they can handle both clients simultaneously in a couples room.
Uses enhanced detection logic to properly identify all massage service types.
Other services still require different staff members for personalized attention.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ MASSAGE DETECTION FIX APPLIED!';
    RAISE NOTICE '   ';
    RAISE NOTICE '🔍 Enhanced Detection Now Includes:';
    RAISE NOTICE '   - Services with "massage" in the name';
    RAISE NOTICE '   - Services with "balinese", "deep tissue", "hot stone"';
    RAISE NOTICE '   - Services with "maternity" or "stretching"';
    RAISE NOTICE '   - Services with category = "massage"';
    RAISE NOTICE '   - Services with ghl_category = "BODY MASSAGES"';
    RAISE NOTICE '   ';
    RAISE NOTICE '✅ Same staff booking allowed for:';
    RAISE NOTICE '   - Couples where BOTH services are massages';
    RAISE NOTICE '   - Robyn can handle both clients simultaneously';
    RAISE NOTICE '   ';
    RAISE NOTICE '❌ Same staff booking NOT allowed for:';
    RAISE NOTICE '   - Mixed service types (e.g., massage + facial)';
    RAISE NOTICE '   - Non-massage services (facials, waxing, treatments)';
    RAISE NOTICE '   ';
    RAISE NOTICE '🎯 The booking system now correctly handles all massage types!';
END $$;