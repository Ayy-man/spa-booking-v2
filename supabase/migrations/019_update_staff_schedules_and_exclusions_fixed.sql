-- Migration: Update Staff Schedules and Add Service Exclusions (FIXED)
-- This migration corrects staff work schedules and adds service exclusion tracking

-- Add service exclusions column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS service_exclusions TEXT[] DEFAULT '{}';

-- Update Robyn Camacho: Off Monday & Tuesday, add exclusions
UPDATE staff SET 
  work_days = ARRAY[0,3,4,5,6],  -- Sun, Wed, Thu, Fri, Sat (off Mon/Tue)
  service_exclusions = ARRAY['radio_frequency', 'nano_microneedling', 'derma_roller', 'derma_planing']
WHERE name = 'Robyn Camacho';

-- Update Selma Villaver: Available all 7 days, keep dermaplaning exclusion
UPDATE staff SET 
  work_days = ARRAY[0,1,2,3,4,5,6],  -- All days
  service_exclusions = ARRAY['derma_planing']
WHERE name = 'Selma Villaver';

-- Update Tanisha Harris: Keep existing schedule (off Tue/Thu), add exclusions
UPDATE staff SET 
  service_exclusions = ARRAY['radio_frequency', 'nano_microneedling', 'derma_roller']
WHERE name = 'Tanisha Harris';

-- Update Leonel Sidon: Add facial capability (using valid enum value) and set exclusions
UPDATE staff SET 
  capabilities = CASE 
    WHEN 'facial' = ANY(capabilities) THEN capabilities
    ELSE array_append(capabilities, 'facial')
  END,
  service_exclusions = ARRAY[]::TEXT[]  -- No exclusions for Leonel
WHERE name = 'Leonel Sidon';

-- Create index on service_exclusions for performance
CREATE INDEX IF NOT EXISTS idx_staff_service_exclusions ON staff USING GIN(service_exclusions);

-- Add comment to document the exclusions
COMMENT ON COLUMN staff.service_exclusions IS 'Array of service IDs or categories that this staff member cannot perform';