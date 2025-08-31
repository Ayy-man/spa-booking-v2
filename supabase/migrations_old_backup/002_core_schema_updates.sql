-- ============================================
-- CORE SCHEMA UPDATES - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Core schema improvements and enhancements
-- Created: 2025-01-31
-- Consolidates: Core booking improvements, status tracking, and utilities

-- ============================================
-- SECTION 1: BOOKING STATUS ENHANCEMENTS
-- ============================================

-- Add booking status trigger for automatic status updates
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- If payment status changes to 'paid', automatically confirm booking
    IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'paid' AND NEW.status = 'pending' THEN
        NEW.status = 'confirmed';
    END IF;
    
    -- If booking is cancelled, set payment_status to 'refunded' if it was 'paid'
    IF OLD.status != NEW.status AND NEW.status = 'cancelled' AND NEW.payment_status = 'paid' THEN
        NEW.payment_status = 'refunded';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
DROP TRIGGER IF EXISTS booking_status_trigger ON bookings;
CREATE TRIGGER booking_status_trigger
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_booking_status_change();

-- ============================================
-- SECTION 2: CANCEL BOOKING FUNCTION
-- ============================================

-- Function to safely cancel bookings with proper cleanup
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cancelled_bookings INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_record bookings%ROWTYPE;
    v_group_bookings_count INTEGER := 0;
    v_cancelled_count INTEGER := 0;
BEGIN
    -- Get the booking details
    SELECT * INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Booking not found', 0;
        RETURN;
    END IF;
    
    -- Check if booking is already cancelled
    IF v_booking_record.status = 'cancelled' THEN
        RETURN QUERY SELECT FALSE, 'Booking is already cancelled', 0;
        RETURN;
    END IF;
    
    -- If this is part of a couples/group booking, cancel all related bookings
    IF v_booking_record.booking_group_id IS NOT NULL THEN
        -- Count related bookings
        SELECT COUNT(*) INTO v_group_bookings_count
        FROM bookings 
        WHERE booking_group_id = v_booking_record.booking_group_id 
        AND status != 'cancelled';
        
        -- Cancel all related bookings
        UPDATE bookings 
        SET 
            status = 'cancelled',
            payment_status = CASE 
                WHEN payment_status = 'paid' THEN 'refunded'
                ELSE payment_status
            END,
            notes = COALESCE(notes || ' | ', '') || 'Cancelled as part of group booking. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
            updated_at = NOW()
        WHERE booking_group_id = v_booking_record.booking_group_id 
        AND status != 'cancelled';
        
        GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
        
        -- Also cancel any related buffer bookings
        UPDATE bookings 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE booking_type = 'buffer'
        AND staff_id = v_booking_record.staff_id
        AND room_id = v_booking_record.room_id
        AND appointment_date = v_booking_record.appointment_date
        AND start_time >= v_booking_record.end_time
        AND start_time < v_booking_record.end_time + INTERVAL '30 minutes'
        AND status != 'cancelled';
        
    ELSE
        -- Cancel single booking
        UPDATE bookings 
        SET 
            status = 'cancelled',
            payment_status = CASE 
                WHEN payment_status = 'paid' THEN 'refunded'
                ELSE payment_status
            END,
            notes = COALESCE(notes || ' | ', '') || 'Cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        v_cancelled_count := 1;
        
        -- Cancel any related buffer bookings
        UPDATE bookings 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE booking_type = 'buffer'
        AND staff_id = v_booking_record.staff_id
        AND room_id = v_booking_record.room_id
        AND appointment_date = v_booking_record.appointment_date
        AND start_time >= v_booking_record.end_time
        AND start_time < v_booking_record.end_time + INTERVAL '30 minutes'
        AND status != 'cancelled';
    END IF;
    
    RETURN QUERY SELECT 
        TRUE, 
        'Successfully cancelled ' || v_cancelled_count || ' booking(s)',
        v_cancelled_count;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Error cancelling booking: ' || SQLERRM,
            0;
END;
$$;

-- ============================================
-- SECTION 3: PHONE NUMBER FORMATTING
-- ============================================

-- Add formatted phone column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS phone_formatted TEXT;

-- Function to format phone numbers
CREATE OR REPLACE FUNCTION format_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters
    phone_input := regexp_replace(phone_input, '[^0-9]', '', 'g');
    
    -- Handle null or empty input
    IF phone_input IS NULL OR length(phone_input) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Format based on length
    CASE length(phone_input)
        WHEN 10 THEN
            -- US phone number: (123) 456-7890
            RETURN '(' || substr(phone_input, 1, 3) || ') ' || 
                   substr(phone_input, 4, 3) || '-' || 
                   substr(phone_input, 7, 4);
        WHEN 11 THEN
            -- US phone number with country code: +1 (123) 456-7890
            IF substr(phone_input, 1, 1) = '1' THEN
                RETURN '+1 (' || substr(phone_input, 2, 3) || ') ' || 
                       substr(phone_input, 5, 3) || '-' || 
                       substr(phone_input, 8, 4);
            ELSE
                -- International format
                RETURN '+' || substr(phone_input, 1, length(phone_input) - 10) || ' ' ||
                       '(' || substr(phone_input, -10, 3) || ') ' ||
                       substr(phone_input, -7, 3) || '-' ||
                       substr(phone_input, -4, 4);
            END IF;
        ELSE
            -- Return original for other lengths (international numbers)
            RETURN '+' || phone_input;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically format phone numbers
CREATE OR REPLACE FUNCTION auto_format_phone()
RETURNS TRIGGER AS $$
BEGIN
    -- Format phone number if it exists and changed
    IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR NEW.phone != OLD.phone) THEN
        NEW.phone_formatted = format_phone_number(NEW.phone);
    ELSIF NEW.phone IS NULL THEN
        NEW.phone_formatted = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phone formatting
DROP TRIGGER IF EXISTS auto_format_phone_trigger ON customers;
CREATE TRIGGER auto_format_phone_trigger
    BEFORE INSERT OR UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION auto_format_phone();

-- Update existing phone numbers
UPDATE customers 
SET phone_formatted = format_phone_number(phone)
WHERE phone IS NOT NULL AND phone_formatted IS NULL;

-- ============================================
-- SECTION 4: LAST NAME OPTIONAL SUPPORT
-- ============================================

-- Make last_name optional in customers table
ALTER TABLE customers 
ALTER COLUMN last_name DROP NOT NULL;

-- Update existing empty last names to NULL
UPDATE customers 
SET last_name = NULL 
WHERE last_name = '' OR last_name = ' ';

-- Create function to get full name with optional last name
CREATE OR REPLACE FUNCTION get_customer_full_name(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF last_name IS NULL OR length(trim(last_name)) = 0 THEN
        RETURN trim(first_name);
    ELSE
        RETURN trim(first_name) || ' ' || trim(last_name);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 5: WALK-IN BOOKING SUPPORT
-- ============================================

-- Add walk_in flag to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE;

-- Create index for walk-in bookings
CREATE INDEX IF NOT EXISTS idx_bookings_walk_in ON bookings(is_walk_in, appointment_date) WHERE is_walk_in = TRUE;

-- Function to create walk-in bookings (including couples)
CREATE OR REPLACE FUNCTION create_walk_in_booking(
    p_service_id TEXT,
    p_staff_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_room_id INTEGER DEFAULT NULL,
    p_start_time TIME DEFAULT NULL,
    p_is_couple BOOLEAN DEFAULT FALSE,
    p_secondary_service_id TEXT DEFAULT NULL,
    p_secondary_staff_id TEXT DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_booking_id UUID;
    v_service_duration INTEGER;
    v_service_price NUMERIC;
    v_end_time TIME;
    v_current_time TIME := NOW()::TIME;
    v_booking_group_id UUID;
BEGIN
    -- If no start time provided, use current time rounded to next 15-minute interval
    IF p_start_time IS NULL THEN
        p_start_time := (date_trunc('hour', NOW()) + 
                        (EXTRACT(MINUTE FROM NOW())::integer / 15 + 1) * INTERVAL '15 min')::TIME;
    END IF;
    
    -- For couples booking, use the couples booking function
    IF p_is_couple AND p_secondary_service_id IS NOT NULL AND p_secondary_staff_id IS NOT NULL THEN
        -- Call couples booking function and mark as walk-in afterward
        SELECT booking_id, success, error_message
        INTO v_booking_id, success, message
        FROM process_couples_booking(
            p_service_id,
            p_secondary_service_id,
            p_staff_id,
            p_secondary_staff_id,
            p_customer_name,
            COALESCE(p_customer_email, 'walkin@' || extract(epoch from now()) || '.spa'),
            p_customer_phone,
            CURRENT_DATE,
            p_start_time,
            p_special_requests
        ) LIMIT 1;
        
        IF success THEN
            -- Mark the group bookings as walk-in
            UPDATE bookings 
            SET is_walk_in = TRUE
            WHERE booking_group_id IN (
                SELECT booking_group_id FROM bookings WHERE id = v_booking_id
            );
            
            message := 'Walk-in couples booking created successfully';
        END IF;
        
        RETURN QUERY SELECT v_booking_id, success, message;
        RETURN;
    END IF;
    
    -- Single walk-in booking
    -- Get service details
    SELECT duration, price INTO v_service_duration, v_service_price
    FROM services
    WHERE id = p_service_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Service not found';
        RETURN;
    END IF;
    
    v_end_time := p_start_time + (v_service_duration * INTERVAL '1 minute');
    
    -- Find or create customer
    IF p_customer_email IS NOT NULL THEN
        SELECT id INTO v_customer_id
        FROM customers
        WHERE email = p_customer_email
        LIMIT 1;
    END IF;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            first_name,
            last_name,
            email,
            phone,
            marketing_consent,
            is_active
        ) VALUES (
            split_part(p_customer_name, ' ', 1),
            CASE 
                WHEN array_length(string_to_array(p_customer_name, ' '), 1) > 1 
                THEN substring(p_customer_name from position(' ' in p_customer_name) + 1)
                ELSE NULL
            END,
            COALESCE(p_customer_email, 'walkin@' || extract(epoch from now()) || '.spa'),
            p_customer_phone,
            false,
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Create the booking
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
        payment_option,
        booking_type,
        is_walk_in,
        notes
    ) VALUES (
        v_customer_id,
        p_service_id,
        p_staff_id,
        p_room_id,
        CURRENT_DATE,
        p_start_time,
        v_end_time,
        v_service_duration,
        v_service_price,
        v_service_price,
        'confirmed',
        'pending',
        'cash',
        'single',
        TRUE,
        COALESCE(p_special_requests, 'Walk-in booking')
    )
    RETURNING id INTO v_booking_id;
    
    RETURN QUERY SELECT v_booking_id, TRUE, 'Walk-in booking created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Error creating walk-in booking: ' || SQLERRM;
END;
$$;

-- ============================================
-- SECTION 6: TIMEZONE SUPPORT
-- ============================================

-- Function to validate booking times considering timezone
CREATE OR REPLACE FUNCTION validate_booking_time(
    p_appointment_date DATE,
    p_start_time TIME,
    p_duration INTEGER,
    p_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_appointment_datetime TIMESTAMP WITH TIME ZONE;
    v_end_time TIME;
    v_now TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate end time
    v_end_time := p_start_time + (p_duration * INTERVAL '1 minute');
    
    -- Create timestamp with timezone
    v_appointment_datetime := (p_appointment_date + p_start_time) AT TIME ZONE p_timezone;
    v_now := NOW() AT TIME ZONE p_timezone;
    
    -- Check if appointment is in the past
    IF v_appointment_datetime < v_now THEN
        RETURN QUERY SELECT FALSE, 'Cannot book appointments in the past';
        RETURN;
    END IF;
    
    -- Check business hours (9 AM to 8 PM)
    IF p_start_time < '09:00:00'::TIME OR p_start_time > '20:00:00'::TIME THEN
        RETURN QUERY SELECT FALSE, 'Appointments must be between 9:00 AM and 8:00 PM';
        RETURN;
    END IF;
    
    -- Check if appointment would end after business hours
    IF v_end_time > '20:00:00'::TIME THEN
        RETURN QUERY SELECT FALSE, 'Appointment would end after business hours (8:00 PM)';
        RETURN;
    END IF;
    
    -- Check if appointment is too far in the future (6 months)
    IF v_appointment_datetime > (v_now + INTERVAL '6 months') THEN
        RETURN QUERY SELECT FALSE, 'Cannot book appointments more than 6 months in advance';
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, 'Booking time is valid';
END;
$$;

-- ============================================
-- SECTION 7: PERMISSIONS AND GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cancel_booking TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking TO anon;
GRANT EXECUTE ON FUNCTION format_phone_number TO authenticated;
GRANT EXECUTE ON FUNCTION format_phone_number TO anon;
GRANT EXECUTE ON FUNCTION get_customer_full_name TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_full_name TO anon;
GRANT EXECUTE ON FUNCTION create_walk_in_booking TO authenticated;
GRANT EXECUTE ON FUNCTION create_walk_in_booking TO anon;
GRANT EXECUTE ON FUNCTION validate_booking_time TO authenticated;
GRANT EXECUTE ON FUNCTION validate_booking_time TO anon;

-- ============================================
-- SECTION 8: INDEXES FOR PERFORMANCE
-- ============================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings(updated_at);

-- ============================================
-- SECTION 9: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON FUNCTION cancel_booking IS
'Safely cancels bookings with proper cleanup. Handles group bookings and buffer appointments automatically.';

COMMENT ON FUNCTION format_phone_number IS
'Formats phone numbers into standardized format. Handles US and international numbers.';

COMMENT ON FUNCTION get_customer_full_name IS
'Returns formatted full name, handling cases where last name is optional or missing.';

COMMENT ON FUNCTION create_walk_in_booking IS
'Creates walk-in bookings with current time defaults. Supports both single and couples bookings.';

COMMENT ON FUNCTION validate_booking_time IS
'Validates booking times considering timezone, business hours, and booking policies.';

COMMENT ON COLUMN customers.phone_formatted IS
'Automatically formatted version of phone number for consistent display.';

COMMENT ON COLUMN bookings.is_walk_in IS
'Flag to identify walk-in bookings for reporting and special handling.';