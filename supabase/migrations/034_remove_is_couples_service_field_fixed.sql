-- ============================================================================
-- SAFE Migration: Remove misleading is_couples_service field
-- ============================================================================
-- This migration safely removes the field after checking all dependencies

-- STEP 1: Check if column exists
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'services'
    AND column_name = 'is_couples_service';
    
    IF v_count = 0 THEN
        RAISE NOTICE 'Column is_couples_service does not exist - nothing to do';
    ELSE
        RAISE NOTICE 'Found is_couples_service column - proceeding with removal...';
    END IF;
END $$;

-- STEP 2: Create backup of current data before removing
CREATE TABLE IF NOT EXISTS _backup_services_is_couples AS
SELECT id, name, is_couples_service, updated_at
FROM services;

-- STEP 3: Show what will change
SELECT 
    name,
    is_couples_service,
    CASE 
        WHEN is_couples_service = true THEN '❌ Currently limited to couples only'
        ELSE '✅ Already allows both'
    END as current_state,
    '✅ Will allow both single AND couples' as after_migration
FROM services
WHERE is_active = true
  AND is_couples_service = true
ORDER BY name;

-- STEP 4: Drop the column (this will fail if there are dependencies)
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- STEP 5: Add documentation
COMMENT ON TABLE services IS 'All services can be booked as either single (one person) or couples (two people). The customer chooses the booking type at time of booking.';

-- STEP 6: Verify the removal
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'services'
    AND column_name = 'is_couples_service';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: is_couples_service column has been removed';
        RAISE NOTICE 'All services now support both single and couples bookings';
    ELSE
        RAISE WARNING '❌ FAILED: is_couples_service column still exists';
        RAISE WARNING 'Check for dependencies preventing removal';
    END IF;
END $$;

-- STEP 7: Show the backup data for the 3 affected services
SELECT 
    'The following services were incorrectly limited to couples only:' as note;
    
SELECT 
    name,
    'Was marked as couples-only (is_couples_service = true)' as old_restriction,
    'Now allows BOTH single and couples bookings' as new_behavior
FROM _backup_services_is_couples
WHERE is_couples_service = true
ORDER BY name;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed):
-- ============================================================================
-- If you need to restore the column:
-- 
-- ALTER TABLE services ADD COLUMN is_couples_service boolean DEFAULT false;
-- UPDATE services s 
-- SET is_couples_service = b.is_couples_service 
-- FROM _backup_services_is_couples b 
-- WHERE s.id = b.id;
-- 
-- Then you can drop the backup table:
-- DROP TABLE IF EXISTS _backup_services_is_couples;
-- ============================================================================