-- Add service-specific buffer times
-- Waxing services get 0 minutes buffer, all others get 10 minutes

-- Add buffer_time column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time INTEGER DEFAULT 10;

-- Update all services to have 10-minute buffer by default
UPDATE services SET buffer_time = 10 WHERE buffer_time IS NULL;

-- Set waxing services to have 0-minute buffer time
UPDATE services SET buffer_time = 0 WHERE 
  name ILIKE '%wax%' OR 
  name ILIKE '%eyebrow%' OR 
  name ILIKE '%lip%' OR 
  category = 'waxing';

-- Add comment to explain the buffer time logic
COMMENT ON COLUMN services.buffer_time IS 'Buffer time in minutes after service completion. Waxing services = 0, all others = 10';

-- Update any existing waxing-related services specifically
UPDATE services SET buffer_time = 0 WHERE id IN (
  SELECT id FROM services WHERE 
    name IN (
      'Eyebrow Waxing',
      'Lip Waxing', 
      'Chin Waxing',
      'Full Face Waxing',
      'Underarm Waxing',
      'Brazilian Waxing',
      'Bikini Line Waxing',
      'Full Leg Waxing',
      'Half Leg Waxing',
      'Arm Waxing'
    )
);