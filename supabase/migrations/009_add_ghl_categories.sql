-- Migration: Add GHL Categories to Services
-- This migration adds a ghl_category field to map services to GHL upsell sequences

-- First, let's check what the actual enum values are
DO $$
DECLARE
    enum_values text[];
BEGIN
    -- Get the enum values for service_category
    SELECT array_agg(enumlabel) INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'service_category';
    
    -- Log the enum values for debugging
    RAISE NOTICE 'Available enum values: %', enum_values;
END $$;

-- Add GHL category column to services table
ALTER TABLE services ADD COLUMN ghl_category VARCHAR(100);

-- Update existing services with GHL categories based on actual enum values
-- We'll use a more flexible approach that doesn't assume specific enum values

-- FACE TREATMENTS (services with 'facial' in name or category)
UPDATE services SET ghl_category = 'FACE TREATMENTS' 
WHERE (category LIKE '%facial%' OR name LIKE '%facial%')
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY MASSAGES (services with 'massage' in name or category)
UPDATE services SET ghl_category = 'BODY MASSAGES' 
WHERE (category LIKE '%massage%' OR name LIKE '%massage%')
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY TREATMENTS & BOOSTERS (services with 'body' or 'treatment' or 'scrub' in name or category)
UPDATE services SET ghl_category = 'BODY TREATMENTS & BOOSTERS' 
WHERE (category LIKE '%body%' OR category LIKE '%treatment%' OR category LIKE '%scrub%' 
       OR name LIKE '%body%' OR name LIKE '%treatment%' OR name LIKE '%scrub%')
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- Waxing Services (services with 'wax' in name or category)
UPDATE services SET ghl_category = 'Waxing Services' 
WHERE (category LIKE '%wax%' OR name LIKE '%wax%')
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- FACE & BODY PACKAGES (services with 'package' or 'VIP' or '+' in name)
UPDATE services SET ghl_category = 'FACE & BODY PACKAGES' 
WHERE category LIKE '%package%' 
OR category LIKE '%membership%'
OR name LIKE '%package%' 
OR name LIKE '%+%' 
OR name LIKE '%VIP%';

-- Create index for performance
CREATE INDEX idx_services_ghl_category ON services(ghl_category);

-- Add constraint to ensure ghl_category is not null
ALTER TABLE services ALTER COLUMN ghl_category SET NOT NULL;

-- Add check constraint to ensure valid GHL categories
ALTER TABLE services ADD CONSTRAINT check_ghl_category 
CHECK (ghl_category IN (
  'BODY MASSAGES',
  'BODY TREATMENTS & BOOSTERS', 
  'FACE TREATMENTS',
  'FACE & BODY PACKAGES',
  'Waxing Services'
)); 