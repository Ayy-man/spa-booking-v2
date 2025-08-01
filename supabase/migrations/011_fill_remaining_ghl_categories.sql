-- Migration: Fill remaining null GHL categories
-- This migration handles any services that didn't get categorized in the previous migration

-- First, let's see what services are still null
DO $$
DECLARE
    null_count integer;
    service_names text[];
BEGIN
    SELECT COUNT(*) INTO null_count FROM services WHERE ghl_category IS NULL;
    RAISE NOTICE 'Services with null ghl_category: %', null_count;
    
    IF null_count > 0 THEN
        SELECT array_agg(name) INTO service_names FROM services WHERE ghl_category IS NULL;
        RAISE NOTICE 'Null services: %', service_names;
    END IF;
END $$;

-- Update any remaining null values based on service names
-- This is a catch-all for any services that didn't match the previous patterns

-- FACE TREATMENTS (catch any facial services)
UPDATE services SET ghl_category = 'FACE TREATMENTS' 
WHERE ghl_category IS NULL 
AND (name ILIKE '%facial%' OR name ILIKE '%microderm%' OR name ILIKE '%vitamin%' OR name ILIKE '%acne%' OR name ILIKE '%kojic%');

-- BODY MASSAGES (catch any massage services)
UPDATE services SET ghl_category = 'BODY MASSAGES' 
WHERE ghl_category IS NULL 
AND (name ILIKE '%massage%' OR name ILIKE '%balinese%' OR name ILIKE '%deep tissue%' OR name ILIKE '%hot stone%' OR name ILIKE '%maternity%' OR name ILIKE '%stretching%');

-- BODY TREATMENTS & BOOSTERS (catch any body treatment services)
UPDATE services SET ghl_category = 'BODY TREATMENTS & BOOSTERS' 
WHERE ghl_category IS NULL 
AND (name ILIKE '%body%' OR name ILIKE '%scrub%' OR name ILIKE '%treatment%' OR name ILIKE '%moisturizing%' OR name ILIKE '%chemical%' OR name ILIKE '%underarm%' OR name ILIKE '%back%');

-- Waxing Services (catch any waxing services)
UPDATE services SET ghl_category = 'Waxing Services' 
WHERE ghl_category IS NULL 
AND (name ILIKE '%wax%' OR name ILIKE '%brazilian%' OR name ILIKE '%bikini%' OR name ILIKE '%eyebrow%' OR name ILIKE '%lip%' OR name ILIKE '%chin%' OR name ILIKE '%neck%' OR name ILIKE '%leg%' OR name ILIKE '%arm%' OR name ILIKE '%chest%' OR name ILIKE '%stomach%' OR name ILIKE '%shoulders%' OR name ILIKE '%feet%' OR name ILIKE '%vajacial%');

-- FACE & BODY PACKAGES (catch any package or VIP services)
UPDATE services SET ghl_category = 'FACE & BODY PACKAGES' 
WHERE ghl_category IS NULL 
AND (name ILIKE '%package%' OR name ILIKE '%vip%' OR name ILIKE '%+%' OR name ILIKE '%membership%');

-- Set a default for any remaining null values (shouldn't happen, but just in case)
UPDATE services SET ghl_category = 'FACE TREATMENTS' 
WHERE ghl_category IS NULL;

-- Verify all services now have ghl_category
DO $$
DECLARE
    final_null_count integer;
    total_services integer;
BEGIN
    SELECT COUNT(*) INTO final_null_count FROM services WHERE ghl_category IS NULL;
    SELECT COUNT(*) INTO total_services FROM services;
    
    RAISE NOTICE 'Final check - Services with null ghl_category: %', final_null_count;
    RAISE NOTICE 'Total services: %', total_services;
    
    IF final_null_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All services now have ghl_category values!';
    ELSE
        RAISE NOTICE 'WARNING: Still have % services with null ghl_category', final_null_count;
    END IF;
END $$;

-- Now we can safely set the column to NOT NULL
ALTER TABLE services ALTER COLUMN ghl_category SET NOT NULL;

-- Add the check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_ghl_category') THEN
        ALTER TABLE services ADD CONSTRAINT check_ghl_category 
        CHECK (ghl_category IN (
          'BODY MASSAGES',
          'BODY TREATMENTS & BOOSTERS', 
          'FACE TREATMENTS',
          'FACE & BODY PACKAGES',
          'Waxing Services'
        ));
        RAISE NOTICE 'Added ghl_category check constraint';
    ELSE
        RAISE NOTICE 'ghl_category check constraint already exists';
    END IF;
END $$; 