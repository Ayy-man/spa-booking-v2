-- Migration: Fix GHL Categories with proper enum handling
-- This migration properly handles the service_category enum type

-- First, let's see what we're working with
DO $$
DECLARE
    enum_values text[];
    service_count integer;
BEGIN
    -- Get the enum values for service_category
    SELECT array_agg(enumlabel) INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'service_category';
    
    -- Log the enum values for debugging
    RAISE NOTICE 'Available enum values: %', enum_values;
    
    -- Check if ghl_category column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'ghl_category') THEN
        RAISE NOTICE 'ghl_category column already exists';
    ELSE
        -- Add GHL category column to services table
        ALTER TABLE services ADD COLUMN ghl_category VARCHAR(100);
        RAISE NOTICE 'Added ghl_category column';
    END IF;
    
    -- Count services
    SELECT COUNT(*) INTO service_count FROM services;
    RAISE NOTICE 'Total services: %', service_count;
END $$;

-- Update existing services with GHL categories using proper enum casting
-- FACE TREATMENTS
UPDATE services SET ghl_category = 'FACE TREATMENTS' 
WHERE category::text = 'facial' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY MASSAGES
UPDATE services SET ghl_category = 'BODY MASSAGES' 
WHERE category::text = 'massage' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY TREATMENTS & BOOSTERS
UPDATE services SET ghl_category = 'BODY TREATMENTS & BOOSTERS' 
WHERE category::text IN ('body_treatment', 'body_scrub') 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- Waxing Services
UPDATE services SET ghl_category = 'Waxing Services' 
WHERE category::text = 'waxing' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- FACE & BODY PACKAGES
UPDATE services SET ghl_category = 'FACE & BODY PACKAGES' 
WHERE category::text IN ('package', 'membership') 
OR name LIKE '%package%' 
OR name LIKE '%+%' 
OR name LIKE '%VIP%';

-- Create index for performance (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_services_ghl_category') THEN
        CREATE INDEX idx_services_ghl_category ON services(ghl_category);
        RAISE NOTICE 'Created ghl_category index';
    ELSE
        RAISE NOTICE 'ghl_category index already exists';
    END IF;
END $$;

-- Add constraint to ensure ghl_category is not null (if not already set)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'ghl_category' AND is_nullable = 'YES') THEN
        ALTER TABLE services ALTER COLUMN ghl_category SET NOT NULL;
        RAISE NOTICE 'Set ghl_category to NOT NULL';
    ELSE
        RAISE NOTICE 'ghl_category already NOT NULL';
    END IF;
END $$;

-- Add check constraint to ensure valid GHL categories (if not already exists)
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