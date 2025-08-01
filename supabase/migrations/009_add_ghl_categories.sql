-- Migration: Add GHL Categories to Services
-- This migration adds a ghl_category field to map services to GHL upsell sequences

-- Add GHL category column to services table
ALTER TABLE services ADD COLUMN ghl_category VARCHAR(100);

-- Update existing services with GHL categories
-- FACE TREATMENTS
UPDATE services SET ghl_category = 'FACE TREATMENTS' 
WHERE category = 'facial' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY MASSAGES
UPDATE services SET ghl_category = 'BODY MASSAGES' 
WHERE category = 'massage' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- BODY TREATMENTS & BOOSTERS
UPDATE services SET ghl_category = 'BODY TREATMENTS & BOOSTERS' 
WHERE category IN ('body_treatment', 'body_scrub') 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- Waxing Services
UPDATE services SET ghl_category = 'Waxing Services' 
WHERE category = 'waxing' 
AND name NOT LIKE '%package%' 
AND name NOT LIKE '%+%';

-- FACE & BODY PACKAGES
UPDATE services SET ghl_category = 'FACE & BODY PACKAGES' 
WHERE category IN ('package', 'membership') 
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