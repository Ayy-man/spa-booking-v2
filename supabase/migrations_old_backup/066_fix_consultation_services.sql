-- Fix and properly set up consultation services
-- This migration ensures consultation services are properly configured

-- Step 1: Ensure columns exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS requires_on_site_pricing BOOLEAN DEFAULT false;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_consultation BOOLEAN DEFAULT false;

-- Step 2: Mark existing consultation services
UPDATE services 
SET is_consultation = true
WHERE LOWER(name) LIKE '%consultation%';

-- Step 3: Update existing Consultation service to Facial Consultation (if it exists)
UPDATE services 
SET name = 'Facial Consultation',
    description = 'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.',
    is_consultation = true,
    price = 25.00,
    duration = 30
WHERE name = 'Consultation' 
  AND category = 'facials';

-- Step 4: Insert Facial Consultation if it doesn't exist
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
  is_consultation = true,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration;

-- Step 5: Insert Consultation & Treatment (TBD pricing) service
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
  0,
  'FACE TREATMENTS',
  true,
  true,
  false,
  true,
  ARRAY['facials']::text[]
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price,
  is_consultation = true,
  requires_on_site_pricing = true,
  allows_addons = false;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_consultation ON services(is_consultation) WHERE is_consultation = true;
CREATE INDEX IF NOT EXISTS idx_services_on_site_pricing ON services(requires_on_site_pricing) WHERE requires_on_site_pricing = true;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN services.requires_on_site_pricing IS 'Flag for services with TBD pricing that require on-site pricing determination';
COMMENT ON COLUMN services.is_consultation IS 'Flag to identify consultation services that require special handling';