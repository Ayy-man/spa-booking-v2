-- ============================================================================
-- SIMPLE Migration: Remove misleading is_couples_service field
-- ============================================================================
-- This field suggests some services are "couples only" when ALL services
-- can be booked as single OR couples. Booking type is customer's choice.

-- STEP 1: Create backup of current data
CREATE TABLE IF NOT EXISTS _migration_backup_services_is_couples AS
SELECT 
    id, 
    name, 
    is_couples_service, 
    category,
    ghl_category,
    created_at,
    updated_at
FROM services;

-- STEP 2: Show what services are currently marked as couples-only
SELECT 
    'BEFORE MIGRATION - Services marked as couples-only:' as info;

SELECT 
    name,
    category,
    is_couples_service
FROM services
WHERE is_couples_service = true
  AND is_active = true
ORDER BY name;

-- STEP 3: Remove the misleading column
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- STEP 4: Add documentation
COMMENT ON TABLE services IS 'All services support both single and couples bookings. The booking type is determined by customer choice (booking_type field in bookings table), not by the service itself.';

-- STEP 5: Verify the removal worked
SELECT 
    'AFTER MIGRATION - Column removed successfully' as status,
    COUNT(*) as total_active_services,
    'All services now support both single AND couples bookings' as result
FROM services
WHERE is_active = true;

-- STEP 6: Show which services were affected
SELECT 
    'Services that were incorrectly limited to couples:' as summary;

SELECT 
    name,
    category,
    'Was marked as couples-only' as previous_status,
    'Now allows both single and couples' as new_status
FROM _migration_backup_services_is_couples
WHERE is_couples_service = true
ORDER BY name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The backup table _migration_backup_services_is_couples is preserved
-- You can drop it later: DROP TABLE _migration_backup_services_is_couples;
-- 
-- ROLLBACK (if needed):
-- ALTER TABLE services ADD COLUMN is_couples_service boolean DEFAULT false;
-- UPDATE services s 
-- SET is_couples_service = b.is_couples_service 
-- FROM _migration_backup_services_is_couples b 
-- WHERE s.id = b.id;
-- ============================================================================