-- Migration: Fix Remaining Staff Work Schedule Alignment
-- This migration ensures Tanisha and Leonel work schedules are explicitly set in database

-- Update Tanisha Harris: Explicitly set work schedule (off Tue/Thu)
UPDATE staff SET 
  work_days = ARRAY[0,1,3,5,6],  -- Sun, Mon, Wed, Fri, Sat (off Tue/Thu)
  service_exclusions = ARRAY['radio_frequency', 'nano_microneedling', 'derma_roller']
WHERE name = 'Tanisha Harris';

-- Update Leonel Sidon: Explicitly set work schedule (Sunday only)
UPDATE staff SET 
  work_days = ARRAY[0],  -- Sunday only
  service_exclusions = ARRAY[]::TEXT[]  -- No exclusions for Leonel
WHERE name = 'Leonel Sidon';

-- Verify all staff work schedules are properly set
-- This comment documents the expected final state:
-- Robyn Camacho: work_days = [0,3,4,5,6] (Sun, Wed, Thu, Fri, Sat - off Mon/Tue)
-- Selma Villaver: work_days = [0,1,2,3,4,5,6] (All 7 days)
-- Tanisha Harris: work_days = [0,1,3,5,6] (Sun, Mon, Wed, Fri, Sat - off Tue/Thu)
-- Leonel Sidon: work_days = [0] (Sunday only)