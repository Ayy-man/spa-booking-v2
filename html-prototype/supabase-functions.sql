-- Additional Database Functions for Dermal Skin Clinic Booking System
-- These functions provide advanced booking logic and business operations

-- ========================================
-- AVAILABILITY AND SCHEDULING FUNCTIONS
-- ========================================

-- Function to get detailed availability for a specific date and service
CREATE OR REPLACE FUNCTION get_service_availability(
    p_service_id TEXT,
    p_date DATE,
    p_preferred_staff_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    staff_id TEXT,
    staff_name TEXT,
    staff_initials TEXT,
    room_id INTEGER,
    room_name TEXT,
    available_slots JSONB
) AS $$
DECLARE
    service_duration INTEGER;
    service_requires_room_3 BOOLEAN;
    service_category service_category;
    business_start TIME := '09:00';
    business_end TIME := '18:00';
    slot_interval INTEGER := 15; -- 15 minute intervals
    current_slot TIME;
    end_slot TIME;
    slot_available BOOLEAN;
    slots_array JSONB := '[]'::JSONB;
BEGIN
    -- Get service details
    SELECT duration, requires_room_3, category 
    INTO service_duration, service_requires_room_3, service_category
    FROM services 
    WHERE id = p_service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found or inactive';
    END IF;
    
    RETURN QUERY
    WITH eligible_staff AS (
        SELECT s.id, s.name, s.initials, s.default_room_id, s.work_days
        FROM staff s
        WHERE s.is_active = true
        AND (p_preferred_staff_id IS NULL OR s.id = p_preferred_staff_id)
        AND (service_category = ANY(s.capabilities) OR s.id = 'any')
        AND EXTRACT(DOW FROM p_date) = ANY(s.work_days)
    ),
    eligible_rooms AS (
        SELECT r.id, r.name
        FROM rooms r
        WHERE r.is_active = true
        AND (NOT service_requires_room_3 OR r.id = 3)
        AND service_category = ANY(r.capabilities)
    ),
    staff_room_combinations AS (
        SELECT 
            es.id as staff_id,
            es.name as staff_name,
            es.initials as staff_initials,
            COALESCE(es.default_room_id, er.id) as room_id,
            er.name as room_name
        FROM eligible_staff es
        CROSS JOIN eligible_rooms er
        WHERE (es.default_room_id IS NULL OR es.default_room_id = er.id)
    )
    SELECT 
        src.staff_id,
        src.staff_name,
        src.staff_initials,
        src.room_id,
        src.room_name,
        get_available_time_slots(src.staff_id, src.room_id, p_date, service_duration) as available_slots
    FROM staff_room_combinations src;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get available time slots for staff/room combination
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_staff_id TEXT,
    p_room_id INTEGER,
    p_date DATE,
    p_duration INTEGER
)
RETURNS JSONB AS $$
DECLARE
    business_start TIME := '09:00';
    business_end TIME := '18:00';
    slot_interval INTEGER := 15;
    current_slot TIME;
    end_slot TIME;
    slots_array JSONB := '[]'::JSONB;
    slot_available BOOLEAN;
BEGIN
    current_slot := business_start;
    
    WHILE current_slot + (p_duration || ' minutes')::INTERVAL <= business_end LOOP
        end_slot := current_slot + (p_duration || ' minutes')::INTERVAL;
        
        -- Check if this slot is available for both staff and room
        SELECT 
            check_staff_availability(p_staff_id, p_date, current_slot, end_slot) AND
            check_room_availability(p_room_id, p_date, current_slot, end_slot)
        INTO slot_available;
        
        IF slot_available THEN
            slots_array := slots_array || jsonb_build_object(
                'start_time', current_slot::TEXT,
                'end_time', end_slot::TEXT
            );
        END IF;
        
        current_slot := current_slot + (slot_interval || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN slots_array;
END;
$$ LANGUAGE plpgsql;

-- Function to create a booking with full validation
CREATE OR REPLACE FUNCTION create_booking(
    p_customer_id UUID,
    p_service_id TEXT,
    p_staff_id TEXT,
    p_room_id INTEGER,
    p_appointment_date DATE,
    p_start_time TIME,
    p_notes TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_booking_id UUID;
    service_duration INTEGER;
    service_price DECIMAL(10,2);
    end_time TIME;
BEGIN
    -- Get service details
    SELECT duration, price INTO service_duration, service_price
    FROM services 
    WHERE id = p_service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found or inactive';
    END IF;
    
    -- Calculate end time
    end_time := p_start_time + (service_duration || ' minutes')::INTERVAL;
    
    -- Insert the booking (triggers will handle validation)
    INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id,
        appointment_date, start_time, end_time, duration,
        total_price, final_price, notes, created_by
    ) VALUES (
        p_customer_id, p_service_id, p_staff_id, p_room_id,
        p_appointment_date, p_start_time, end_time, service_duration,
        service_price, service_price, p_notes, p_created_by
    ) RETURNING id INTO new_booking_id;
    
    RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reschedule a booking
CREATE OR REPLACE FUNCTION reschedule_booking(
    p_booking_id UUID,
    p_new_date DATE,
    p_new_start_time TIME,
    p_new_staff_id TEXT DEFAULT NULL,
    p_new_room_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_booking RECORD;
    new_end_time TIME;
BEGIN
    -- Get current booking details
    SELECT * INTO current_booking
    FROM bookings 
    WHERE id = p_booking_id AND status NOT IN ('completed', 'cancelled');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or cannot be rescheduled';
    END IF;
    
    -- Calculate new end time
    new_end_time := p_new_start_time + (current_booking.duration || ' minutes')::INTERVAL;
    
    -- Update the booking (triggers will validate)
    UPDATE bookings 
    SET 
        appointment_date = p_new_date,
        start_time = p_new_start_time,
        end_time = new_end_time,
        staff_id = COALESCE(p_new_staff_id, staff_id),
        room_id = COALESCE(p_new_room_id, room_id),
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE bookings 
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = p_cancellation_reason,
        updated_at = NOW()
    WHERE id = p_booking_id 
    AND status NOT IN ('completed', 'cancelled');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or cannot be cancelled';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CUSTOMER MANAGEMENT FUNCTIONS
-- ========================================

-- Function to create or update customer
CREATE OR REPLACE FUNCTION upsert_customer(
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_medical_conditions TEXT DEFAULT NULL,
    p_allergies TEXT DEFAULT NULL,
    p_marketing_consent BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    customer_id UUID;
BEGIN
    -- Try to find existing customer by phone or email
    SELECT id INTO customer_id
    FROM customers 
    WHERE phone = p_phone OR (p_email IS NOT NULL AND email = p_email)
    LIMIT 1;
    
    IF customer_id IS NOT NULL THEN
        -- Update existing customer
        UPDATE customers 
        SET 
            first_name = p_first_name,
            last_name = p_last_name,
            phone = p_phone,
            email = COALESCE(p_email, email),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            address = COALESCE(p_address, address),
            medical_conditions = COALESCE(p_medical_conditions, medical_conditions),
            allergies = COALESCE(p_allergies, allergies),
            marketing_consent = p_marketing_consent,
            updated_at = NOW()
        WHERE id = customer_id;
    ELSE
        -- Create new customer
        INSERT INTO customers (
            first_name, last_name, phone, email, date_of_birth,
            address, medical_conditions, allergies, marketing_consent
        ) VALUES (
            p_first_name, p_last_name, p_phone, p_email, p_date_of_birth,
            p_address, p_medical_conditions, p_allergies, p_marketing_consent
        ) RETURNING id INTO customer_id;
    END IF;
    
    RETURN customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer booking history
CREATE OR REPLACE FUNCTION get_customer_history(
    p_customer_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    booking_id UUID,
    service_name TEXT,
    staff_name TEXT,
    appointment_date DATE,
    start_time TIME,
    duration INTEGER,
    price DECIMAL(10,2),
    status booking_status,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        s.name,
        st.name,
        b.appointment_date,
        b.start_time,
        b.duration,
        b.final_price,
        b.status,
        b.notes
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN staff st ON b.staff_id = st.id
    WHERE b.customer_id = p_customer_id
    ORDER BY b.appointment_date DESC, b.start_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- REPORTING AND ANALYTICS FUNCTIONS
-- ========================================

-- Function to get daily revenue report
CREATE OR REPLACE FUNCTION get_daily_revenue(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_bookings INTEGER,
    completed_bookings INTEGER,
    cancelled_bookings INTEGER,
    total_revenue DECIMAL(10,2),
    completed_revenue DECIMAL(10,2),
    average_service_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as cancelled_bookings,
        COALESCE(SUM(final_price), 0) as total_revenue,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0) as completed_revenue,
        COALESCE(AVG(final_price) FILTER (WHERE status = 'completed'), 0) as average_service_price
    FROM bookings
    WHERE appointment_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff performance report
CREATE OR REPLACE FUNCTION get_staff_performance(
    p_start_date DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    staff_id TEXT,
    staff_name TEXT,
    total_bookings INTEGER,
    completed_bookings INTEGER,
    total_revenue DECIMAL(10,2),
    average_rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        COUNT(b.id)::INTEGER as total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'completed')::INTEGER as completed_bookings,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as total_revenue,
        0.00::DECIMAL(3,2) as average_rating -- Placeholder for future rating system
    FROM staff s
    LEFT JOIN bookings b ON s.id = b.staff_id 
        AND b.appointment_date BETWEEN p_start_date AND p_end_date
    WHERE s.is_active = true AND s.id != 'any'
    GROUP BY s.id, s.name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular services report
CREATE OR REPLACE FUNCTION get_popular_services(
    p_start_date DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    service_id TEXT,
    service_name TEXT,
    category service_category,
    booking_count INTEGER,
    total_revenue DECIMAL(10,2),
    average_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.category,
        COUNT(b.id)::INTEGER as booking_count,
        COALESCE(SUM(b.final_price), 0) as total_revenue,
        COALESCE(AVG(b.final_price), 0) as average_price
    FROM services s
    LEFT JOIN bookings b ON s.id = b.service_id 
        AND b.appointment_date BETWEEN p_start_date AND p_end_date
        AND b.status = 'completed'
    WHERE s.is_active = true
    GROUP BY s.id, s.name, s.category
    HAVING COUNT(b.id) > 0
    ORDER BY booking_count DESC, total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get business metrics dashboard
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    today_stats RECORD;
    week_stats RECORD;
    month_stats RECORD;
BEGIN
    -- Today's stats
    SELECT * INTO today_stats FROM get_daily_revenue(p_date);
    
    -- This week's stats
    SELECT 
        COUNT(*)::INTEGER as total_bookings,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0) as revenue
    INTO week_stats
    FROM bookings
    WHERE appointment_date >= p_date - INTERVAL '7 days'
    AND appointment_date <= p_date;
    
    -- This month's stats
    SELECT 
        COUNT(*)::INTEGER as total_bookings,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0) as revenue
    INTO month_stats
    FROM bookings
    WHERE appointment_date >= DATE_TRUNC('month', p_date)
    AND appointment_date <= p_date;
    
    result := jsonb_build_object(
        'today', jsonb_build_object(
            'bookings', today_stats.total_bookings,
            'completed', today_stats.completed_bookings,
            'cancelled', today_stats.cancelled_bookings,
            'revenue', today_stats.completed_revenue
        ),
        'week', jsonb_build_object(
            'bookings', week_stats.total_bookings,
            'revenue', week_stats.revenue
        ),
        'month', jsonb_build_object(
            'bookings', month_stats.total_bookings,
            'revenue', month_stats.revenue
        ),
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 365
)
RETURNS TEXT AS $$
DECLARE
    cutoff_date DATE;
    deleted_count INTEGER;
BEGIN
    cutoff_date := CURRENT_DATE - p_days_to_keep;
    
    -- Delete old completed bookings (keep cancelled for analysis)
    DELETE FROM bookings 
    WHERE appointment_date < cutoff_date 
    AND status = 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN 'Cleaned up ' || deleted_count || ' old booking records before ' || cutoff_date;
END;
$$ LANGUAGE plpgsql;

-- Function to validate business rules
CREATE OR REPLACE FUNCTION validate_business_hours(
    p_date DATE,
    p_start_time TIME,
    p_duration INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    business_start TIME := '09:00';
    business_end TIME := '18:00';
    end_time TIME;
    day_of_week INTEGER;
BEGIN
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check if it's a business day (assuming Mon-Sun, adjust as needed)
    IF day_of_week NOT IN (0,1,2,3,4,5,6) THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate end time
    end_time := p_start_time + (p_duration || ' minutes')::INTERVAL;
    
    -- Check if appointment fits within business hours
    IF p_start_time < business_start OR end_time > business_end THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- NOTIFICATION AND REMINDER FUNCTIONS
-- ========================================

-- Function to get upcoming appointments for reminders
CREATE OR REPLACE FUNCTION get_reminder_appointments(
    p_days_ahead INTEGER DEFAULT 1
)
RETURNS TABLE(
    booking_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    service_name TEXT,
    staff_name TEXT,
    appointment_date DATE,
    start_time TIME,
    room_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        c.first_name || ' ' || c.last_name,
        c.phone,
        c.email,
        s.name,
        st.name,
        b.appointment_date,
        b.start_time,
        r.name
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    JOIN services s ON b.service_id = s.id
    JOIN staff st ON b.staff_id = st.id
    JOIN rooms r ON b.room_id = r.id
    WHERE b.appointment_date = CURRENT_DATE + p_days_ahead
    AND b.status = 'confirmed'
    ORDER BY b.start_time;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for the new functions
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date_status ON bookings(staff_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;