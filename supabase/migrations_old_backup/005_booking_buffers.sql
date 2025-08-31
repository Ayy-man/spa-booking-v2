-- ============================================
-- BOOKING BUFFERS SYSTEM - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Final buffer implementation using separate buffer appointments
-- Created: 2025-01-31
-- Consolidates: Buffer system, buffer validation, and buffer management

-- ============================================
-- SECTION 1: BUFFER SERVICE SETUP
-- ============================================

-- Create a special service for buffer/prep time
-- This service is not visible to customers but used internally for buffer appointments
INSERT INTO services (
    id,
    name,
    category,
    price,
    duration,
    description,
    is_active,
    ghl_category,
    created_at,
    updated_at
) VALUES (
    'buffer_time',
    'Buffer Time',
    'treatments',
    0, -- No charge
    15, -- 15 minutes
    'Preparation and cleanup time between appointments',
    false, -- Not visible to customers
    'INTERNAL',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    duration = EXCLUDED.duration,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================
-- SECTION 2: BUFFER APPOINTMENT FUNCTIONS
-- ============================================

-- Function to automatically create buffer appointments after main bookings
CREATE OR REPLACE FUNCTION create_buffer_appointment()
RETURNS TRIGGER AS $$
DECLARE
    buffer_service_id TEXT := 'buffer_time';
    buffer_end_time TIME;
    booking_type_value TEXT;
BEGIN
    -- Check if booking_type column exists and get its value
    BEGIN
        booking_type_value := NEW.booking_type;
    EXCEPTION
        WHEN undefined_column THEN
            booking_type_value := 'single'; -- Default if column doesn't exist
    END;
    
    -- Only create buffers for regular bookings, not for buffers themselves or cancelled bookings
    IF booking_type_value = 'buffer' OR NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Calculate buffer end time (15 minutes after main appointment)
    buffer_end_time := (NEW.end_time::time + INTERVAL '15 minutes')::time;
    
    -- Don't create buffer if it would exceed business hours
    IF buffer_end_time > '20:00:00'::time THEN
        RETURN NEW;
    END IF;

    -- Create the buffer appointment
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
        final_price,
        status,
        payment_status,
        booking_type,
        notes,
        created_at,
        updated_at
    ) VALUES (
        NEW.customer_id,
        buffer_service_id,
        NEW.staff_id,
        NEW.room_id,
        NEW.appointment_date,
        NEW.end_time,
        buffer_end_time,
        15, -- 15 minutes
        0, -- Free
        0, -- Free
        'confirmed', -- Auto-confirmed
        'paid', -- No payment needed
        'buffer', -- Mark as buffer type
        'Auto-generated buffer time for appointment ' || NEW.id,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create buffer appointments
DROP TRIGGER IF EXISTS auto_create_buffer_trigger ON bookings;
CREATE TRIGGER auto_create_buffer_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_buffer_appointment();

-- ============================================
-- SECTION 3: BUFFER MANAGEMENT FUNCTIONS
-- ============================================

-- Function to manually create buffer appointments
CREATE OR REPLACE FUNCTION create_manual_buffer(
    p_staff_id TEXT,
    p_room_id INTEGER,
    p_appointment_date DATE,
    p_start_time TIME,
    p_duration INTEGER DEFAULT 15,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    buffer_id UUID,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buffer_id UUID;
    v_end_time TIME;
    v_buffer_service_id TEXT := 'buffer_time';
    v_customer_id UUID;
BEGIN
    -- Calculate end time
    v_end_time := p_start_time + (p_duration * INTERVAL '1 minute');
    
    -- Validate business hours
    IF p_start_time < '09:00:00'::TIME OR v_end_time > '20:00:00'::TIME THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Buffer time must be within business hours (9 AM - 8 PM)';
        RETURN;
    END IF;
    
    -- Check for conflicts
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
        AND room_id = p_room_id
        AND appointment_date = p_appointment_date
        AND status != 'cancelled'
        AND start_time < v_end_time
        AND end_time > p_start_time
    ) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Time slot conflicts with existing booking';
        RETURN;
    END IF;
    
    -- Get a system customer (create if doesn't exist)
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = 'system@spa.internal'
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name,
            last_name,
            email,
            marketing_consent,
            is_active
        ) VALUES (
            'System',
            'Buffer',
            'system@spa.internal',
            false,
            true
        ) RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create the manual buffer appointment
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
        final_price,
        status,
        payment_status,
        booking_type,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_customer_id,
        v_buffer_service_id,
        p_staff_id,
        p_room_id,
        p_appointment_date,
        p_start_time,
        v_end_time,
        p_duration,
        0,
        0,
        'confirmed',
        'paid',
        'buffer',
        COALESCE(p_reason, 'Manually created buffer time'),
        NOW(),
        NOW()
    ) RETURNING id INTO v_buffer_id;
    
    RETURN QUERY SELECT 
        v_buffer_id,
        TRUE,
        'Buffer appointment created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'Error creating buffer: ' || SQLERRM;
END;
$$;

-- Function to remove buffer appointments (when main appointment is cancelled)
CREATE OR REPLACE FUNCTION cleanup_buffer_appointments()
RETURNS TRIGGER AS $$
BEGIN
    -- When a booking is cancelled, remove its associated buffer appointments
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE bookings 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE booking_type = 'buffer'
        AND staff_id = OLD.staff_id
        AND room_id = OLD.room_id
        AND appointment_date = OLD.appointment_date
        AND start_time = OLD.end_time
        AND status != 'cancelled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for buffer cleanup on cancellation
DROP TRIGGER IF EXISTS cleanup_buffer_trigger ON bookings;
CREATE TRIGGER cleanup_buffer_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_buffer_appointments();

-- ============================================
-- SECTION 4: BUFFER VALIDATION FUNCTIONS
-- ============================================

-- Function to check for buffer conflicts during booking
CREATE OR REPLACE FUNCTION check_buffer_availability(
    p_staff_id TEXT,
    p_room_id INTEGER,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    conflict_type TEXT,
    conflict_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_buffer_start TIME := p_end_time; -- Buffer starts when appointment ends
    v_buffer_end TIME := p_end_time + INTERVAL '15 minutes'; -- 15-minute buffer
    v_conflicts JSONB := '[]'::JSONB;
    v_is_available BOOLEAN := TRUE;
BEGIN
    -- Don't check buffers that would extend beyond business hours
    IF v_buffer_end > '20:00:00'::TIME THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Check for appointments that would conflict with our buffer time
    FOR conflict_details IN
        SELECT jsonb_build_object(
            'booking_id', b.id,
            'start_time', b.start_time,
            'end_time', b.end_time,
            'service_name', s.name,
            'booking_type', b.booking_type
        )
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.staff_id = p_staff_id
        AND b.room_id = p_room_id
        AND b.appointment_date = p_appointment_date
        AND b.status != 'cancelled'
        AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
        AND b.start_time < v_buffer_end
        AND b.end_time > v_buffer_start
    LOOP
        v_conflicts := v_conflicts || conflict_details;
        v_is_available := FALSE;
    END LOOP;
    
    -- Also check the main appointment time for conflicts
    FOR conflict_details IN
        SELECT jsonb_build_object(
            'booking_id', b.id,
            'start_time', b.start_time,
            'end_time', b.end_time,
            'service_name', s.name,
            'booking_type', b.booking_type
        )
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.staff_id = p_staff_id
        AND b.room_id = p_room_id
        AND b.appointment_date = p_appointment_date
        AND b.status != 'cancelled'
        AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
        AND b.start_time < p_end_time
        AND b.end_time > p_start_time
    LOOP
        v_conflicts := v_conflicts || conflict_details;
        v_is_available := FALSE;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_is_available,
        CASE WHEN v_is_available THEN NULL ELSE 'buffer_conflict' END,
        CASE WHEN v_is_available THEN NULL ELSE v_conflicts END;
END;
$$;

-- Function to get buffer schedule for a staff member
CREATE OR REPLACE FUNCTION get_staff_buffer_schedule(
    p_staff_id TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    appointment_date DATE,
    main_bookings JSONB,
    buffer_bookings JSONB,
    total_appointments INTEGER,
    total_buffer_time INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_date DATE := p_start_date;
BEGIN
    WHILE v_current_date <= p_end_date LOOP
        RETURN QUERY
        SELECT 
            v_current_date,
            COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', b.id,
                        'start_time', b.start_time,
                        'end_time', b.end_time,
                        'service_name', s.name,
                        'customer_name', get_customer_full_name(c.first_name, c.last_name)
                    )
                ) FROM bookings b
                JOIN services s ON b.service_id = s.id
                JOIN customers c ON b.customer_id = c.id
                WHERE b.staff_id = p_staff_id
                AND b.appointment_date = v_current_date
                AND b.booking_type != 'buffer'
                AND b.status != 'cancelled'
                ORDER BY b.start_time),
                '[]'::jsonb
            ) as main_bookings,
            COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', b.id,
                        'start_time', b.start_time,
                        'end_time', b.end_time,
                        'reason', b.notes
                    )
                ) FROM bookings b
                WHERE b.staff_id = p_staff_id
                AND b.appointment_date = v_current_date
                AND b.booking_type = 'buffer'
                AND b.status != 'cancelled'
                ORDER BY b.start_time),
                '[]'::jsonb
            ) as buffer_bookings,
            COALESCE(
                (SELECT COUNT(*)::INTEGER FROM bookings b
                WHERE b.staff_id = p_staff_id
                AND b.appointment_date = v_current_date
                AND b.booking_type != 'buffer'
                AND b.status != 'cancelled'),
                0
            ) as total_appointments,
            COALESCE(
                (SELECT SUM(b.duration)::INTEGER FROM bookings b
                WHERE b.staff_id = p_staff_id
                AND b.appointment_date = v_current_date
                AND b.booking_type = 'buffer'
                AND b.status != 'cancelled'),
                0
            ) as total_buffer_time;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END;
$$;

-- ============================================
-- SECTION 5: BUFFER REPORTING FUNCTIONS
-- ============================================

-- Function to get buffer utilization statistics
CREATE OR REPLACE FUNCTION get_buffer_statistics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_appointments INTEGER,
    appointments_with_buffers INTEGER,
    total_buffer_time INTEGER,
    average_buffer_per_appointment NUMERIC,
    buffer_utilization_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH appointment_stats AS (
        SELECT 
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM bookings bb
                WHERE bb.booking_type = 'buffer'
                AND bb.staff_id = b.staff_id
                AND bb.room_id = b.room_id
                AND bb.appointment_date = b.appointment_date
                AND bb.start_time = b.end_time
                AND bb.status != 'cancelled'
            )) as appointments_with_buffers
        FROM bookings b
        WHERE b.appointment_date BETWEEN p_start_date AND p_end_date
        AND b.booking_type != 'buffer'
        AND b.status != 'cancelled'
    ),
    buffer_stats AS (
        SELECT 
            COALESCE(SUM(b.duration), 0) as total_buffer_time
        FROM bookings b
        WHERE b.appointment_date BETWEEN p_start_date AND p_end_date
        AND b.booking_type = 'buffer'
        AND b.status != 'cancelled'
    )
    SELECT 
        a.total_appointments::INTEGER,
        a.appointments_with_buffers::INTEGER,
        b.total_buffer_time::INTEGER,
        CASE 
            WHEN a.total_appointments > 0 
            THEN ROUND(b.total_buffer_time::NUMERIC / a.total_appointments, 2)
            ELSE 0
        END as average_buffer_per_appointment,
        CASE 
            WHEN a.total_appointments > 0 
            THEN ROUND((a.appointments_with_buffers::NUMERIC / a.total_appointments) * 100, 2)
            ELSE 0
        END as buffer_utilization_rate
    FROM appointment_stats a
    CROSS JOIN buffer_stats b;
END;
$$;

-- ============================================
-- SECTION 6: PERMISSIONS AND GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_manual_buffer TO authenticated;
GRANT EXECUTE ON FUNCTION check_buffer_availability TO authenticated;
GRANT EXECUTE ON FUNCTION check_buffer_availability TO anon;
GRANT EXECUTE ON FUNCTION get_staff_buffer_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_buffer_schedule TO anon;
GRANT EXECUTE ON FUNCTION get_buffer_statistics TO authenticated;

-- ============================================
-- SECTION 7: INDEXES FOR BUFFER QUERIES
-- ============================================

-- Indexes for efficient buffer queries
CREATE INDEX IF NOT EXISTS idx_bookings_buffer_lookup 
ON bookings(staff_id, room_id, appointment_date, start_time, end_time) 
WHERE booking_type = 'buffer' AND status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_buffer_type_date 
ON bookings(booking_type, appointment_date, status) 
WHERE booking_type = 'buffer';

CREATE INDEX IF NOT EXISTS idx_bookings_main_with_time 
ON bookings(staff_id, appointment_date, end_time) 
WHERE booking_type != 'buffer' AND status != 'cancelled';

-- ============================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON TABLE bookings IS 
'Bookings table with automatic buffer appointment generation. Buffer appointments are separate bookings with booking_type="buffer"';

COMMENT ON FUNCTION create_buffer_appointment IS
'Trigger function that automatically creates 15-minute buffer appointments after each main booking';

COMMENT ON FUNCTION create_manual_buffer IS
'Creates manual buffer appointments for maintenance, cleaning, or other non-service activities';

COMMENT ON FUNCTION cleanup_buffer_appointments IS
'Trigger function that cancels associated buffer appointments when main appointments are cancelled';

COMMENT ON FUNCTION check_buffer_availability IS
'Checks if a time slot is available considering both main appointments and required buffer time';

COMMENT ON FUNCTION get_staff_buffer_schedule IS
'Returns detailed schedule for a staff member including both main and buffer appointments';

COMMENT ON FUNCTION get_buffer_statistics IS
'Provides statistics on buffer utilization for reporting and optimization';

-- Final verification message
DO $$
DECLARE
  buffer_service_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM services WHERE id = 'buffer_time'
  ) INTO buffer_service_exists;
  
  RAISE NOTICE 'Buffer System Migration Complete - Buffer Service Created: %', buffer_service_exists;
END $$;