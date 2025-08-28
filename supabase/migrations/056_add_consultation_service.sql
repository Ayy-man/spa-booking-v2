-- Add consultation service support
-- This migration adds a consultation flag to services and creates the facial consultation service

-- Add is_consultation column to services table if it doesn't exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_consultation BOOLEAN DEFAULT false;

-- Add index for consultation lookups
CREATE INDEX IF NOT EXISTS idx_services_consultation ON services(is_consultation);

-- Insert Facial Consultation service
INSERT INTO services (
  id,
  name,
  description,
  category,
  duration,
  price,
  ghl_category,
  is_consultation,
  allows_addons,
  is_active,
  service_capabilities
) VALUES (
  gen_random_uuid(),
  'Facial Consultation',
  'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.',
  'facial',
  30,
  25.00,
  'FACE TREATMENTS',
  true,
  false, -- No add-ons for consultations
  true,
  ARRAY['facial']::service_capability[]
) ON CONFLICT (name) DO UPDATE SET
  is_consultation = true,
  allows_addons = false,
  description = EXCLUDED.description;

-- Add comment for documentation
COMMENT ON COLUMN services.is_consultation IS 'Flag to identify consultation services that require special handling';