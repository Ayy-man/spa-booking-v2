-- ============================================
-- CONSULTATION SERVICES - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Complete consultation system with proper categorization and TBD pricing
-- Created: 2025-01-31
-- Consolidates: Consultation services, TBD pricing, and consultation management

-- ============================================
-- SECTION 1: CONSULTATION SUPPORT COLUMNS
-- ============================================

-- Add is_consultation column to services table if it doesn't exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_consultation BOOLEAN DEFAULT FALSE;

-- Add TBD pricing support for consultations
ALTER TABLE services
ADD COLUMN IF NOT EXISTS price_tbd BOOLEAN DEFAULT FALSE;

-- Create index for consultation lookups
CREATE INDEX IF NOT EXISTS idx_services_consultation ON services(is_consultation) WHERE is_consultation = TRUE;
CREATE INDEX IF NOT EXISTS idx_services_price_tbd ON services(price_tbd) WHERE price_tbd = TRUE;

-- ============================================
-- SECTION 2: CONSULTATION SERVICE CATEGORIES
-- ============================================

-- Ensure we have proper categories for consultation services
-- Add consultation-specific categories if they don't exist in the enum

-- Check and add consultation categories to service_category enum if needed
DO $$
BEGIN
    -- Add consultation category if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'consultation' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
    ) THEN
        ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'consultation';
    END IF;
    
    -- Add tbd_pricing category if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'tbd_pricing' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
    ) THEN
        ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'tbd_pricing';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If enum doesn't exist or other issues, continue without error
        NULL;
END $$;

-- ============================================
-- SECTION 3: CONSULTATION SERVICES
-- ============================================

-- Clean up any existing consultation services with duplicate names
DELETE FROM services 
WHERE name ILIKE '%consultation%' 
AND id != 'consultation'
AND created_at < NOW() - INTERVAL '1 hour'; -- Only clean recent duplicates

-- Insert comprehensive consultation services
INSERT INTO services (
  id,
  name,
  description,
  category,
  duration,
  price,
  price_tbd,
  ghl_category,
  is_consultation,
  allows_addons,
  is_active
) VALUES 
-- Main Facial Consultation
('facial_consultation', 'Facial Consultation', 
 'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.', 
 'facials', 30, 25.00, FALSE, 'FACE TREATMENTS', TRUE, FALSE, TRUE),

-- TBD Pricing Services (for custom treatments)
('custom_facial_tbd', 'Custom Facial Treatment (TBD)', 
 'Customized facial treatment with pricing determined after consultation', 
 'facials', 60, 0, TRUE, 'FACE TREATMENTS', FALSE, TRUE, TRUE),

('custom_massage_tbd', 'Custom Massage Treatment (TBD)', 
 'Customized massage treatment with pricing determined after consultation', 
 'massages', 60, 0, TRUE, 'BODY TREATMENTS & BOOSTERS', FALSE, TRUE, TRUE),

('custom_package_tbd', 'Custom Treatment Package (TBD)', 
 'Personalized treatment package with pricing determined after consultation', 
 'packages', 90, 0, TRUE, 'FACE & BODY PACKAGES', FALSE, TRUE, TRUE),

-- Consultation for different service types
('massage_consultation', 'Massage Consultation', 
 'Consultation to determine the best massage approach for your needs', 
 'massages', 20, 20.00, FALSE, 'BODY TREATMENTS & BOOSTERS', TRUE, FALSE, TRUE),

('package_consultation', 'Treatment Package Consultation', 
 'Comprehensive consultation to design a personalized treatment package', 
 'packages', 45, 35.00, FALSE, 'FACE & BODY PACKAGES', TRUE, FALSE, TRUE),

('skincare_analysis', 'Professional Skin Analysis', 
 'Detailed skin analysis and treatment recommendation session', 
 'facials', 30, 30.00, FALSE, 'FACE TREATMENTS', TRUE, FALSE, TRUE)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price,
  price_tbd = EXCLUDED.price_tbd,
  is_consultation = EXCLUDED.is_consultation,
  allows_addons = EXCLUDED.allows_addons,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Update existing consultation service if it exists
UPDATE services 
SET 
  is_consultation = TRUE,
  allows_addons = FALSE,
  description = 'Professional skin consultation and treatment planning - our most popular starting point for new clients',
  updated_at = NOW()
WHERE id = 'consultation';

-- ============================================
-- SECTION 4: CONSULTATION BOOKING FUNCTIONS
-- ============================================

-- Function to create consultation bookings with special handling
CREATE OR REPLACE FUNCTION create_consultation_booking(
    p_service_id TEXT,
    p_staff_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_appointment_date DATE DEFAULT CURRENT_DATE + 1,
    p_start_time TIME DEFAULT '10:00'::TIME,
    p_special_requests TEXT DEFAULT NULL,
    p_consultation_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    success BOOLEAN,
    message TEXT,
    follow_up_needed BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_service_record services%ROWTYPE;
    v_end_time TIME;
BEGIN
    -- Get service details
    SELECT * INTO v_service_record
    FROM services
    WHERE id = p_service_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Service not found or inactive', FALSE;
        RETURN;
    END IF;
    
    -- Validate this is a consultation service
    IF NOT v_service_record.is_consultation THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'This service is not a consultation service', FALSE;
        RETURN;
    END IF;
    
    v_end_time := p_start_time + (v_service_record.duration * INTERVAL '1 minute');
    
    -- Find or create customer
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = p_customer_email
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
            split_part(p_customer_name, ' ', 1),
            CASE 
                WHEN array_length(string_to_array(p_customer_name, ' '), 1) > 1 
                THEN substring(p_customer_name from position(' ' in p_customer_name) + 1)
                ELSE NULL
            END,
            p_customer_email,
            p_customer_phone,
            true, -- Default to marketing consent for consultations
            true
        )
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Check availability
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
        AND appointment_date = p_appointment_date
        AND status != 'cancelled'
        AND start_time < v_end_time
        AND end_time > p_start_time
    ) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Staff member is not available at this time', FALSE;
        RETURN;
    END IF;
    
    -- Create the consultation booking
    INSERT INTO bookings (
        customer_id,
        service_id,
        staff_id,
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
        notes
    ) VALUES (
        v_customer_id,
        p_service_id,
        p_staff_id,
        p_appointment_date,
        p_start_time,
        v_end_time,
        v_service_record.duration,
        v_service_record.price,
        v_service_record.price,
        'confirmed',
        'pending',
        'deposit', -- Consultations typically require deposit
        'single',
        COALESCE(p_special_requests, '') || 
        CASE WHEN p_consultation_notes IS NOT NULL 
             THEN ' | Consultation Notes: ' || p_consultation_notes 
             ELSE '' END
    )
    RETURNING id INTO v_booking_id;
    
    RETURN QUERY SELECT 
        v_booking_id,
        TRUE,
        'Consultation booking created successfully',
        TRUE; -- Always needs follow-up for treatment planning
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'Error creating consultation booking: ' || SQLERRM,
            FALSE;
END;
$$;

-- Function to convert consultation to treatment booking
CREATE OR REPLACE FUNCTION convert_consultation_to_treatment(
    p_consultation_booking_id UUID,
    p_treatment_service_id TEXT,
    p_treatment_date DATE,
    p_treatment_time TIME,
    p_special_price NUMERIC DEFAULT NULL,
    p_conversion_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    treatment_booking_id UUID,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_consultation_record bookings%ROWTYPE;
    v_treatment_service services%ROWTYPE;
    v_treatment_booking_id UUID;
    v_treatment_end_time TIME;
    v_final_price NUMERIC;
BEGIN
    -- Get consultation booking details
    SELECT * INTO v_consultation_record
    FROM bookings
    WHERE id = p_consultation_booking_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Consultation booking not found';
        RETURN;
    END IF;
    
    -- Verify it's a consultation
    IF NOT EXISTS (
        SELECT 1 FROM services 
        WHERE id = v_consultation_record.service_id 
        AND is_consultation = TRUE
    ) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Original booking is not a consultation';
        RETURN;
    END IF;
    
    -- Get treatment service details
    SELECT * INTO v_treatment_service
    FROM services
    WHERE id = p_treatment_service_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Treatment service not found or inactive';
        RETURN;
    END IF;
    
    v_treatment_end_time := p_treatment_time + (v_treatment_service.duration * INTERVAL '1 minute');
    
    -- Determine final price (use special price if provided, otherwise service price)
    v_final_price := COALESCE(p_special_price, v_treatment_service.price);
    
    -- Check staff availability for treatment
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = v_consultation_record.staff_id
        AND appointment_date = p_treatment_date
        AND status != 'cancelled'
        AND start_time < v_treatment_end_time
        AND end_time > p_treatment_time
        AND id != p_consultation_booking_id -- Allow same booking to be updated
    ) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Staff is not available for treatment at requested time';
        RETURN;
    END IF;
    
    -- Create the treatment booking
    INSERT INTO bookings (
        customer_id,
        service_id,
        staff_id,
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
        notes
    ) VALUES (
        v_consultation_record.customer_id,
        p_treatment_service_id,
        v_consultation_record.staff_id,
        p_treatment_date,
        p_treatment_time,
        v_treatment_end_time,
        v_treatment_service.duration,
        v_treatment_service.price,
        v_final_price,
        'confirmed',
        'pending',
        'deposit',
        'single',
        'Converted from consultation booking ' || p_consultation_booking_id::text || 
        CASE WHEN p_conversion_notes IS NOT NULL 
             THEN ' | ' || p_conversion_notes 
             ELSE '' END
    )
    RETURNING id INTO v_treatment_booking_id;
    
    -- Mark consultation as completed
    UPDATE bookings 
    SET 
        status = 'completed',
        notes = COALESCE(notes, '') || ' | Converted to treatment booking ' || v_treatment_booking_id::text,
        updated_at = NOW()
    WHERE id = p_consultation_booking_id;
    
    RETURN QUERY SELECT 
        v_treatment_booking_id,
        TRUE,
        'Successfully converted consultation to treatment booking';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'Error converting consultation: ' || SQLERRM;
END;
$$;

-- ============================================
-- SECTION 5: TBD PRICING FUNCTIONS
-- ============================================

-- Function to update TBD pricing after consultation
CREATE OR REPLACE FUNCTION set_tbd_pricing(
    p_booking_id UUID,
    p_final_price NUMERIC,
    p_pricing_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    old_price NUMERIC,
    new_price NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_record bookings%ROWTYPE;
    v_service_record services%ROWTYPE;
    v_old_price NUMERIC;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Booking not found', NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;
    
    -- Get service details
    SELECT * INTO v_service_record
    FROM services
    WHERE id = v_booking_record.service_id;
    
    -- Verify service has TBD pricing
    IF NOT v_service_record.price_tbd THEN
        RETURN QUERY SELECT 
            FALSE, 
            'This service does not have TBD pricing', 
            v_booking_record.final_price,
            p_final_price;
        RETURN;
    END IF;
    
    v_old_price := v_booking_record.final_price;
    
    -- Update booking with final price
    UPDATE bookings 
    SET 
        final_price = p_final_price,
        total_price = p_final_price, -- Also update total price
        notes = COALESCE(notes, '') || 
                ' | Price set after consultation: $' || p_final_price::text ||
                CASE WHEN p_pricing_notes IS NOT NULL 
                     THEN ' (' || p_pricing_notes || ')' 
                     ELSE '' END,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN QUERY SELECT 
        TRUE,
        'Pricing updated successfully',
        v_old_price,
        p_final_price;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE,
            'Error updating pricing: ' || SQLERRM,
            v_old_price,
            p_final_price;
END;
$$;

-- ============================================
-- SECTION 6: CONSULTATION REPORTING
-- ============================================

-- Function to get consultation conversion statistics
CREATE OR REPLACE FUNCTION get_consultation_statistics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_consultations INTEGER,
    completed_consultations INTEGER,
    conversion_bookings INTEGER,
    conversion_rate NUMERIC,
    average_consultation_price NUMERIC,
    total_consultation_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH consultation_stats AS (
        SELECT 
            COUNT(*) as total_consultations,
            COUNT(*) FILTER (WHERE b.status = 'completed') as completed_consultations,
            SUM(b.final_price) as total_consultation_revenue,
            AVG(b.final_price) as average_consultation_price
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE s.is_consultation = TRUE
        AND b.appointment_date BETWEEN p_start_date AND p_end_date
    ),
    conversion_stats AS (
        SELECT 
            COUNT(*) as conversion_bookings
        FROM bookings b
        WHERE b.appointment_date BETWEEN p_start_date AND p_end_date
        AND b.notes ILIKE '%converted from consultation%'
    )
    SELECT 
        cs.total_consultations::INTEGER,
        cs.completed_consultations::INTEGER,
        cvs.conversion_bookings::INTEGER,
        CASE 
            WHEN cs.completed_consultations > 0 
            THEN ROUND((cvs.conversion_bookings::NUMERIC / cs.completed_consultations) * 100, 2)
            ELSE 0
        END as conversion_rate,
        ROUND(cs.average_consultation_price, 2) as average_consultation_price,
        cs.total_consultation_revenue as total_consultation_revenue
    FROM consultation_stats cs
    CROSS JOIN conversion_stats cvs;
END;
$$;

-- ============================================
-- SECTION 7: PERMISSIONS AND GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_consultation_booking TO authenticated;
GRANT EXECUTE ON FUNCTION create_consultation_booking TO anon;
GRANT EXECUTE ON FUNCTION convert_consultation_to_treatment TO authenticated;
GRANT EXECUTE ON FUNCTION set_tbd_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_consultation_statistics TO authenticated;

-- ============================================
-- SECTION 8: VIEWS FOR CONSULTATION MANAGEMENT
-- ============================================

-- View for consultation bookings with customer details
CREATE OR REPLACE VIEW consultation_bookings AS
SELECT 
    b.id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.status,
    b.payment_status,
    s.name as service_name,
    s.price as service_base_price,
    b.final_price,
    get_customer_full_name(c.first_name, c.last_name) as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    st.name as staff_name,
    b.notes,
    b.created_at,
    b.updated_at,
    -- Check if conversion booking exists
    EXISTS (
        SELECT 1 FROM bookings cb 
        WHERE cb.notes ILIKE '%converted from consultation booking ' || b.id || '%'
    ) as has_conversion_booking
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN customers c ON b.customer_id = c.id
JOIN staff st ON b.staff_id = st.id
WHERE s.is_consultation = TRUE
ORDER BY b.appointment_date DESC, b.start_time DESC;

-- View for TBD pricing services
CREATE OR REPLACE VIEW tbd_pricing_services AS
SELECT 
    s.id,
    s.name,
    s.description,
    s.category,
    s.duration,
    s.price as base_price,
    s.ghl_category,
    s.is_active,
    COUNT(b.id) as total_bookings,
    AVG(b.final_price) as average_final_price,
    MIN(b.final_price) as min_final_price,
    MAX(b.final_price) as max_final_price
FROM services s
LEFT JOIN bookings b ON s.id = b.service_id AND b.status != 'cancelled'
WHERE s.price_tbd = TRUE
GROUP BY s.id, s.name, s.description, s.category, s.duration, s.price, s.ghl_category, s.is_active
ORDER BY s.name;

-- Grant access to views
GRANT SELECT ON consultation_bookings TO authenticated;
GRANT SELECT ON consultation_bookings TO anon;
GRANT SELECT ON tbd_pricing_services TO authenticated;
GRANT SELECT ON tbd_pricing_services TO anon;

-- ============================================
-- SECTION 9: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON COLUMN services.is_consultation IS 
'Flag to identify consultation services that require special handling and follow-up';

COMMENT ON COLUMN services.price_tbd IS 
'Flag for services with "To Be Determined" pricing that gets set after consultation';

COMMENT ON FUNCTION create_consultation_booking IS
'Creates consultation bookings with special handling for follow-up treatment planning';

COMMENT ON FUNCTION convert_consultation_to_treatment IS
'Converts a completed consultation booking into a treatment booking with optional custom pricing';

COMMENT ON FUNCTION set_tbd_pricing IS
'Updates final pricing for services marked as TBD after consultation or assessment';

COMMENT ON FUNCTION get_consultation_statistics IS
'Provides consultation conversion statistics for business analysis';

COMMENT ON VIEW consultation_bookings IS
'Comprehensive view of all consultation bookings with customer and conversion tracking';

COMMENT ON VIEW tbd_pricing_services IS
'View of services with TBD pricing including pricing statistics and booking counts';

-- Final verification message
DO $$
DECLARE
  consultation_services_count INTEGER;
  tbd_services_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consultation_services_count 
  FROM services WHERE is_consultation = TRUE;
  
  SELECT COUNT(*) INTO tbd_services_count 
  FROM services WHERE price_tbd = TRUE;
  
  RAISE NOTICE 'Consultation Services Migration Complete - Consultation Services: %, TBD Pricing Services: %', 
               consultation_services_count, tbd_services_count;
END $$;