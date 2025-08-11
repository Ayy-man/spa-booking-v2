-- ============================================================================
-- Migration 036: Remove misleading is_couples_service field - FINAL VERSION
-- ============================================================================
-- ALL services can be booked as single OR couples - customer's choice!

-- Create backup
CREATE TABLE IF NOT EXISTS _backup_services_is_couples AS
SELECT id, name, is_couples_service, category
FROM services;

-- Show what's being changed
SELECT 
    name as "Service Name",
    is_couples_service as "Currently Couples Only?",
    'Will allow both single AND couples' as "After Migration"
FROM services
WHERE is_couples_service = true
ORDER BY name;

-- Remove the confusing column
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- Add documentation
COMMENT ON TABLE services IS 'All services support both single and couples bookings. Customer chooses booking type.';

-- Verify success
SELECT 
    COUNT(*) as "Total Services",
    'All services now support both single AND couples bookings' as "Result"
FROM services
WHERE is_active = true;

-- Show what was affected
SELECT 
    name as "Services That Were Couples-Only",
    'Now allows both booking types' as "Status"
FROM _backup_services_is_couples
WHERE is_couples_service = true;

-- ============================================================================
-- Backup preserved in: _backup_services_is_couples
-- To rollback: See migration 034 files (don't actually rollback though!)
-- ============================================================================