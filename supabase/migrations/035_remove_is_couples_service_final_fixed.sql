-- ============================================================================
-- FINAL Migration: Remove misleading is_couples_service field
-- ============================================================================
-- This field suggests some services are "couples only" when ALL services
-- can be booked as single OR couples. Booking type is customer's choice.

-- STEP 1: Create comprehensive backup
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

-- STEP 2: Document what will change
DO $$
BEGIN
    RAISE NOTICE '=== SERVICES CURRENTLY MARKED AS COUPLES-ONLY ===';
END $$;

SELECT 
    name,
    category,
    ghl_category,
    is_couples_service,
    CASE 
        WHEN is_couples_service = true THEN '❌ Currently restricted to couples only'
        ELSE '✅ Already allows both single and couples'
    END as current_restriction
FROM services
WHERE is_active = true
  AND is_couples_service = true
ORDER BY category, name;

-- STEP 3: Check for database function dependencies
DO $$
DECLARE
    func_count integer;
BEGIN
    -- Count functions that reference is_couples_service
    SELECT COUNT(DISTINCT p.proname) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) LIKE '%is_couples_service%';
    
    RAISE NOTICE '=== FOUND % FUNCTIONS WITH is_couples_service REFERENCES ===', func_count;
END $$;

-- STEP 4: Remove the misleading column
DO $$
DECLARE
    col_exists boolean;
BEGIN
    -- Check if column exists before trying to drop it
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'is_couples_service'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Drop the column
        ALTER TABLE services DROP COLUMN is_couples_service;
        RAISE NOTICE '✅ Successfully removed is_couples_service column';
    ELSE
        RAISE NOTICE '⚠️ Column is_couples_service does not exist - already removed';
    END IF;
END $$;

-- STEP 5: Add clear documentation
COMMENT ON TABLE services IS 'All services support both single and couples bookings. The booking type is determined by customer choice (booking_type field in bookings table), not by the service itself.';

-- STEP 6: Verify the removal
DO $$
DECLARE
    v_count integer;
    v_affected_count integer;
    v_total_services integer;
BEGIN
    -- Check if column was removed
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'services'
    AND column_name = 'is_couples_service';
    
    -- Count how many services were marked as couples-only
    SELECT COUNT(*) INTO v_affected_count
    FROM _migration_backup_services_is_couples
    WHERE is_couples_service = true;
    
    -- Count total active services
    SELECT COUNT(*) INTO v_total_services
    FROM services
    WHERE is_active = true;
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: is_couples_service column has been removed';
        RAISE NOTICE '✅ Services that were incorrectly restricted: %', v_affected_count;
        RAISE NOTICE '✅ All % active services now support both single AND couples bookings', v_total_services;
    ELSE
        RAISE WARNING '❌ FAILED: is_couples_service column still exists';
        RAISE WARNING 'Check for dependency errors and try again';
    END IF;
END $$;

-- STEP 7: Show the services that were previously restricted
DO $$
BEGIN
    RAISE NOTICE '=== SERVICES THAT WERE INCORRECTLY LIMITED TO COUPLES ONLY ===';
END $$;

SELECT 
    name as service_name,
    category,
    'Was marked as couples-only' as previous_restriction,
    'Now allows BOTH single and couples' as current_status
FROM _migration_backup_services_is_couples
WHERE is_couples_service = true
ORDER BY category, name;

-- STEP 8: Final summary
DO $$
DECLARE
    v_total integer;
    v_affected integer;
BEGIN
    SELECT COUNT(*) INTO v_total FROM services WHERE is_active = true;
    SELECT COUNT(*) INTO v_affected FROM _migration_backup_services_is_couples WHERE is_couples_service = true;
    
    RAISE NOTICE '==========================================================';
    RAISE NOTICE '                 MIGRATION COMPLETE                      ';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE 'Total active services: %', v_total;
    RAISE NOTICE 'Services that were incorrectly restricted: %', v_affected;
    RAISE NOTICE 'All services now support both single AND couples bookings';
    RAISE NOTICE 'Booking type is determined by customer choice';
    RAISE NOTICE '==========================================================';
END $$;

-- ============================================================================
-- IMPORTANT POST-MIGRATION NOTES:
-- ============================================================================
-- 1. The backup table _migration_backup_services_is_couples is preserved
-- 2. You can drop it later: DROP TABLE _migration_backup_services_is_couples;
-- 3. The business model is now: ANY service can be single OR couples
-- 4. Room assignment should use booking_type parameter, not service fields
-- 
-- ROLLBACK INSTRUCTIONS (if needed):
-- ALTER TABLE services ADD COLUMN is_couples_service boolean DEFAULT false;
-- UPDATE services s 
-- SET is_couples_service = b.is_couples_service 
-- FROM _migration_backup_services_is_couples b 
-- WHERE s.id = b.id;
-- ============================================================================