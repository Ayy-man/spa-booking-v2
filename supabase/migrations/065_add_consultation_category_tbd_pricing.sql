-- Add consultation category and TBD pricing support
-- This migration:
-- 1. Renames existing "Consultation" to "Facial Consultation"
-- 2. Adds requires_on_site_pricing column for TBD pricing
-- 3. Creates new "Consultation & Treatment" service with TBD pricing

-- Step 1: Add requires_on_site_pricing column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS requires_on_site_pricing BOOLEAN DEFAULT false;

-- Add is_consultation column if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_consultation BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN services.requires_on_site_pricing IS 'Flag for services with TBD pricing that require on-site pricing determination';
COMMENT ON COLUMN services.is_consultation IS 'Flag to identify consultation services';

-- Step 2: Update existing Consultation service to Facial Consultation
UPDATE services 
SET name = 'Facial Consultation',
    description = 'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.'
WHERE name = 'Consultation' 
  AND category = 'facials';

-- Step 3: Insert new Consultation & Treatment service with TBD pricing
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
  'facials', -- Using facials category for now, as consultation category doesn't exist in enum
  90,
  0, -- TBD pricing
  'FACE TREATMENTS',
  true,
  true, -- This is the TBD pricing flag
  false, -- No add-ons for TBD services
  true,
  ARRAY['facials']::text[]
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price,
  is_consultation = EXCLUDED.is_consultation,
  requires_on_site_pricing = EXCLUDED.requires_on_site_pricing,
  allows_addons = EXCLUDED.allows_addons;

-- Step 4: Create index for TBD pricing lookups
CREATE INDEX IF NOT EXISTS idx_services_on_site_pricing ON services(requires_on_site_pricing) WHERE requires_on_site_pricing = true;

-- Note: Adding 'consultation' as a new category would require updating the service_category enum
-- Since this is a database enum type, it requires careful migration. For now, we're using
-- the 'facial' category with the is_consultation flag to identify consultation services.
-- A future migration can add the consultation category to the enum if needed.