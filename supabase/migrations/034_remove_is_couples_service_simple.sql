-- ============================================================================
-- Simple Migration: Remove misleading is_couples_service field
-- ============================================================================

-- Create backup of current data
CREATE TABLE IF NOT EXISTS _backup_services_is_couples AS
SELECT id, name, is_couples_service, updated_at
FROM services;

-- Show what services were marked as couples-only
SELECT 
    'BEFORE MIGRATION - These services were incorrectly limited to couples only:' as info,
    name,
    is_couples_service
FROM services
WHERE is_couples_service = true
ORDER BY name;

-- Remove the confusing column
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- Add documentation
COMMENT ON TABLE services IS 'All services can be booked as either single (one person) or couples (two people). The customer chooses the booking type at booking time.';

-- Show confirmation
SELECT 
    'AFTER MIGRATION - All services now allow both single AND couples bookings' as result,
    COUNT(*) as total_services
FROM services
WHERE is_active = true;