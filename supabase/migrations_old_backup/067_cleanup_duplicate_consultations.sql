-- Clean up duplicate consultation services
-- This migration removes duplicate consultation services and ensures only one proper version exists

-- Step 1: First, let's see what consultation services currently exist
-- (This will be logged but won't affect the migration)
DO $$
DECLARE
    consultation_record RECORD;
BEGIN
    RAISE NOTICE 'Current consultation services before cleanup:';
    FOR consultation_record IN 
        SELECT id, name, category, price, duration, is_consultation
        FROM services 
        WHERE LOWER(name) LIKE '%consultation%'
        ORDER BY name, created_at
    LOOP
        RAISE NOTICE 'ID: %, Name: %, Category: %, Price: %, Duration: %, IsConsultation: %', 
            consultation_record.id, consultation_record.name, consultation_record.category, 
            consultation_record.price, consultation_record.duration, consultation_record.is_consultation;
    END LOOP;
END $$;

-- Step 2: Update any existing bookings that reference consultation services
-- to use the standardized 'facial_consultation' ID (we'll create this service next)
UPDATE bookings 
SET service_id = 'facial_consultation'
WHERE service_id IN (
    SELECT id FROM services 
    WHERE LOWER(name) LIKE '%consultation%'
    AND id NOT IN ('facial_consultation', 'consultation_treatment_tbd')
);

-- Step 3: Now delete duplicate consultation services (keeping only our standard ones)
DELETE FROM services 
WHERE LOWER(name) LIKE '%consultation%'
AND id NOT IN ('facial_consultation', 'consultation_treatment_tbd');

-- Step 4: Delete the standard ones if they exist (to recreate them fresh)
DELETE FROM services 
WHERE id IN ('facial_consultation', 'consultation_treatment_tbd');

-- Step 5: Insert the correct Facial Consultation service
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
    service_capabilities,
    created_at,
    updated_at
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
    ARRAY['facials']::text[],
    NOW(),
    NOW()
);

-- Step 6: Insert the Consultation & Treatment service (TBD pricing)
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
    service_capabilities,
    created_at,
    updated_at
) VALUES (
    'consultation_treatment_tbd',
    'Consultation & Treatment (For Men & Women)',
    'Professional consultation followed by customized treatment based on your needs. Price determined based on selected treatment.',
    'facials',
    90,
    0.00, -- TBD pricing
    'FACE TREATMENTS',
    true,
    true, -- This service requires on-site pricing
    false,
    true,
    ARRAY['facials']::text[],
    NOW(),
    NOW()
);

-- Step 7: Verify the cleanup worked
DO $$
DECLARE
    consultation_count INTEGER;
    consultation_record RECORD;
BEGIN
    SELECT COUNT(*) INTO consultation_count
    FROM services 
    WHERE LOWER(name) LIKE '%consultation%';
    
    RAISE NOTICE 'Cleanup complete. Total consultation services after cleanup: %', consultation_count;
    
    RAISE NOTICE 'Final consultation services:';
    FOR consultation_record IN 
        SELECT id, name, category, price, duration, is_consultation, requires_on_site_pricing
        FROM services 
        WHERE LOWER(name) LIKE '%consultation%'
        ORDER BY name
    LOOP
        RAISE NOTICE 'ID: %, Name: %, Category: %, Price: %, Duration: %, IsConsultation: %, TBD: %', 
            consultation_record.id, consultation_record.name, consultation_record.category, 
            consultation_record.price, consultation_record.duration, consultation_record.is_consultation,
            consultation_record.requires_on_site_pricing;
    END LOOP;
    
    -- Ensure we have exactly 2 consultation services
    IF consultation_count != 2 THEN
        RAISE EXCEPTION 'Expected exactly 2 consultation services, but found %', consultation_count;
    END IF;
END $$;

-- Step 8: Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_services_consultation ON services(is_consultation) WHERE is_consultation = true;
CREATE INDEX IF NOT EXISTS idx_services_on_site_pricing ON services(requires_on_site_pricing) WHERE requires_on_site_pricing = true;

-- Step 9: Add documentation comments
COMMENT ON COLUMN services.is_consultation IS 'Flag to identify consultation services that require special handling';
COMMENT ON COLUMN services.requires_on_site_pricing IS 'Flag for services with TBD pricing that require on-site pricing determination';