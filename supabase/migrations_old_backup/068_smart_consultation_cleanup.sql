-- Smart cleanup of duplicate consultation services without breaking existing bookings
-- This migration consolidates duplicates without deleting services that have bookings

-- Step 1: First, let's see what consultation services currently exist
DO $$
DECLARE
    consultation_record RECORD;
    booking_count INTEGER;
BEGIN
    RAISE NOTICE '=== Current consultation services ===';
    FOR consultation_record IN 
        SELECT s.id, s.name, s.category, s.price, s.duration, s.is_consultation,
               COUNT(b.id) as booking_count
        FROM services s
        LEFT JOIN bookings b ON b.service_id = s.id
        WHERE LOWER(s.name) LIKE '%consultation%'
        GROUP BY s.id, s.name, s.category, s.price, s.duration, s.is_consultation
        ORDER BY s.name, s.created_at
    LOOP
        RAISE NOTICE 'ID: %, Name: %, Bookings: %', 
            consultation_record.id, consultation_record.name, consultation_record.booking_count;
    END LOOP;
END $$;

-- Step 2: Ensure our target consultation services exist with correct settings
-- Use INSERT ... ON CONFLICT to update if they exist, insert if they don't

-- Facial Consultation (standard)
INSERT INTO services (
    id,
    name,
    description,
    category,
    duration,
    price,
    ghl_category,
    is_consultation,
    requires_on_site_pricing,
    allows_addons,
    is_active,
    service_capabilities
) VALUES (
    'facial_consultation',
    'Facial Consultation',
    'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.',
    'facials',
    30,
    25.00,
    'FACE TREATMENTS',
    true,
    false,
    false,
    true,
    ARRAY['facials']::text[]
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    duration = EXCLUDED.duration,
    price = EXCLUDED.price,
    is_consultation = true,
    requires_on_site_pricing = false,
    is_active = true;

-- Consultation & Treatment (TBD pricing)
INSERT INTO services (
    id,
    name,
    description,
    category,
    duration,
    price,
    ghl_category,
    is_consultation,
    requires_on_site_pricing,
    allows_addons,
    is_active,
    service_capabilities
) VALUES (
    'consultation_treatment_tbd',
    'Consultation & Treatment (For Men & Women)',
    'Professional consultation followed by customized treatment based on your needs. Price determined based on selected treatment.',
    'facials',
    90,
    0.00,
    'FACE TREATMENTS',
    true,
    true,
    false,
    true,
    ARRAY['facials']::text[]
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    duration = EXCLUDED.duration,
    price = EXCLUDED.price,
    is_consultation = true,
    requires_on_site_pricing = true,
    is_active = true;

-- Step 3: Find and deactivate duplicate consultation services (don't delete them if they have bookings)
-- First, mark all consultation services as inactive except our two standard ones
UPDATE services 
SET is_active = false
WHERE LOWER(name) LIKE '%consultation%'
  AND id NOT IN ('facial_consultation', 'consultation_treatment_tbd');

-- Step 4: For duplicates without bookings, we can safely delete them
DELETE FROM services 
WHERE LOWER(name) LIKE '%consultation%'
  AND id NOT IN ('facial_consultation', 'consultation_treatment_tbd')
  AND id NOT IN (
    SELECT DISTINCT service_id 
    FROM bookings 
    WHERE service_id IS NOT NULL
  );

-- Step 5: Ensure our standard consultation services are properly flagged
UPDATE services 
SET is_consultation = true
WHERE id IN ('facial_consultation', 'consultation_treatment_tbd');

-- Step 6: Verify the cleanup worked
DO $$
DECLARE
    active_count INTEGER;
    total_count INTEGER;
    consultation_record RECORD;
BEGIN
    -- Count active consultation services
    SELECT COUNT(*) INTO active_count
    FROM services 
    WHERE LOWER(name) LIKE '%consultation%'
      AND is_active = true;
    
    -- Count total consultation services (including inactive)
    SELECT COUNT(*) INTO total_count
    FROM services 
    WHERE LOWER(name) LIKE '%consultation%';
    
    RAISE NOTICE '=== Cleanup complete ===';
    RAISE NOTICE 'Active consultation services: %', active_count;
    RAISE NOTICE 'Total consultation services (including inactive): %', total_count;
    
    RAISE NOTICE '=== Active consultation services ===';
    FOR consultation_record IN 
        SELECT id, name, price, is_active, is_consultation, requires_on_site_pricing
        FROM services 
        WHERE LOWER(name) LIKE '%consultation%'
          AND is_active = true
        ORDER BY name
    LOOP
        RAISE NOTICE 'ID: %, Name: %, Price: %, TBD: %', 
            consultation_record.id, consultation_record.name, 
            consultation_record.price, consultation_record.requires_on_site_pricing;
    END LOOP;
    
    -- Ensure we have exactly 2 active consultation services
    IF active_count != 2 THEN
        RAISE WARNING 'Expected exactly 2 active consultation services, but found %', active_count;
    END IF;
END $$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_consultation ON services(is_consultation) WHERE is_consultation = true;
CREATE INDEX IF NOT EXISTS idx_services_on_site_pricing ON services(requires_on_site_pricing) WHERE requires_on_site_pricing = true;

-- Step 8: Add documentation
COMMENT ON COLUMN services.is_consultation IS 'Flag to identify consultation services that require special handling';
COMMENT ON COLUMN services.requires_on_site_pricing IS 'Flag for services with TBD pricing that require on-site pricing determination';