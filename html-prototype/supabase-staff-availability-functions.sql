-- Optimized PostgreSQL functions for staff availability queries
-- Fixes enum array query issues and improves performance

-- Function to get available staff for a specific service category and day
CREATE OR REPLACE FUNCTION get_available_staff_for_service(
    service_category TEXT,
    day_of_week INTEGER
)
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    specialties TEXT,
    capabilities service_category[],
    work_days INTEGER[],
    default_room_id INTEGER,
    role staff_role,
    initials TEXT,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN,
    auth_user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.email,
        s.phone,
        s.specialties,
        s.capabilities,
        s.work_days,
        s.default_room_id,
        s.role,
        s.initials,
        s.hourly_rate,
        s.is_active,
        s.auth_user_id,
        s.created_at,
        s.updated_at
    FROM staff s
    WHERE s.is_active = true
    AND (
        -- Check if staff has the required capability
        service_category::service_category = ANY(s.capabilities)
        OR s.id = 'any' -- Special case for "any" staff member
    )
    AND (
        -- Check if staff works on the requested day
        day_of_week = ANY(s.work_days)
    )
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available staff with booking conflict checking
CREATE OR REPLACE FUNCTION get_available_staff_with_conflicts(
    service_category TEXT,
    day_of_week INTEGER,
    appointment_date DATE,
    start_time TIME,
    end_time TIME
)
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    specialties TEXT,
    capabilities service_category[],
    work_days INTEGER[],
    default_room_id INTEGER,
    role staff_role,
    initials TEXT,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN,
    auth_user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_conflicts BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.email,
        s.phone,
        s.specialties,
        s.capabilities,
        s.work_days,
        s.default_room_id,
        s.role,
        s.initials,
        s.hourly_rate,
        s.is_active,
        s.auth_user_id,
        s.created_at,
        s.updated_at,
        -- Check for booking conflicts
        EXISTS(
            SELECT 1 FROM bookings b
            WHERE b.staff_id = s.id
            AND b.appointment_date = appointment_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (
                (b.start_time < end_time AND b.end_time > start_time)
            )
        ) as has_conflicts
    FROM staff s
    WHERE s.is_active = true
    AND (
        -- Check if staff has the required capability
        service_category::service_category = ANY(s.capabilities)
        OR s.id = 'any' -- Special case for "any" staff member
    )
    AND (
        -- Check if staff works on the requested day
        day_of_week = ANY(s.work_days)
    )
    ORDER BY has_conflicts ASC, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a specific staff member can perform a service
CREATE OR REPLACE FUNCTION can_staff_perform_service(
    staff_id_param TEXT,
    service_category_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_capabilities service_category[];
BEGIN
    SELECT capabilities INTO staff_capabilities 
    FROM staff 
    WHERE id = staff_id_param AND is_active = true;
    
    IF staff_capabilities IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if staff can perform the service
    RETURN (
        service_category_param::service_category = ANY(staff_capabilities)
        OR staff_id_param = 'any'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get staff schedule conflicts for a given time period
CREATE OR REPLACE FUNCTION get_staff_schedule_conflicts(
    staff_id_param TEXT,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE(
    booking_id UUID,
    service_name TEXT,
    customer_name TEXT,
    start_time TIME,
    end_time TIME,
    status booking_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as booking_id,
        s.name as service_name,
        (c.first_name || ' ' || c.last_name) as customer_name,
        b.start_time,
        b.end_time,
        b.status
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN customers c ON b.customer_id = c.id
    WHERE b.staff_id = staff_id_param
    AND b.appointment_date = appointment_date
    AND b.status NOT IN ('cancelled', 'no_show')
    AND (exclude_booking_id IS NULL OR b.id != exclude_booking_id)
    AND (
        (b.start_time < end_time AND b.end_time > start_time)
    )
    ORDER BY b.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all service categories that a staff member can perform
CREATE OR REPLACE FUNCTION get_staff_service_categories(
    staff_id_param TEXT
)
RETURNS service_category[] AS $$
DECLARE
    staff_capabilities service_category[];
BEGIN
    SELECT capabilities INTO staff_capabilities 
    FROM staff 
    WHERE id = staff_id_param AND is_active = true;
    
    RETURN COALESCE(staff_capabilities, ARRAY[]::service_category[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize staff queries by pre-filtering active staff
CREATE OR REPLACE FUNCTION get_active_staff_by_categories(
    service_categories TEXT[]
)
RETURNS TABLE(
    id TEXT,
    name TEXT,
    capabilities service_category[],
    work_days INTEGER[],
    default_room_id INTEGER,
    initials TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.capabilities,
        s.work_days,
        s.default_room_id,
        s.initials
    FROM staff s
    WHERE s.is_active = true
    AND (
        -- Check if staff can perform any of the requested service categories
        s.capabilities && service_categories::service_category[]
        OR s.id = 'any'
    )
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_available_staff_for_service(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_with_conflicts(TEXT, INTEGER, DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION can_staff_perform_service(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_schedule_conflicts(TEXT, DATE, TIME, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_service_categories(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_staff_by_categories(TEXT[]) TO authenticated;

-- Grant execute permissions to anonymous users for public functions
GRANT EXECUTE ON FUNCTION get_available_staff_for_service(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION can_staff_perform_service(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_staff_service_categories(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_active_staff_by_categories(TEXT[]) TO anon;