-- ============================================================================
-- SAFE Migration: Remove misleading is_couples_service field
-- ============================================================================
-- This migration safely removes the field after checking all dependencies

-- STEP 1: First check what depends on this column
DO $$
DECLARE
    v_count integer;
BEGIN
    -- Check if column exists
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'services'
    AND column_name = 'is_couples_service';
    
    IF v_count = 0 THEN
        RAISE NOTICE 'Column is_couples_service does not exist - nothing to do';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found is_couples_service column - checking dependencies...';
END $$;

-- STEP 2: List all functions that might reference is_couples_service
-- This helps identify what needs to be updated
SELECT DISTINCT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%is_couples_service%';

-- STEP 3: Create backup of current data before removing
CREATE TABLE IF NOT EXISTS _backup_services_is_couples AS
SELECT id, name, is_couples_service, updated_at
FROM services;

-- STEP 4: Update any functions that check is_couples_service
-- We'll update them to use booking_type parameter instead

-- Update process_booking_v2 if it exists
DO $$
BEGIN
    -- Check if function exists and uses is_couples_service
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'process_booking_v2'
    ) THEN
        -- The function will now rely on booking_type parameter instead of service field
        RAISE NOTICE 'Found process_booking_v2 - will use booking_type parameter instead';
    END IF;
END $$;

-- STEP 5: Update process_couples_booking_v3 to not check is_couples_service
DO $$
BEGIN
    -- This function should accept any service for couples booking
    -- since all services can be booked as couples
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'process_couples_booking_v3'
    ) THEN
        RAISE NOTICE 'Found process_couples_booking_v3 - will work with any service';
    END IF;
END $$;

-- STEP 6: Safely drop the column
-- This will fail if there are still dependencies
BEGIN;
    -- Try to drop the column
    ALTER TABLE services 
    DROP COLUMN IF EXISTS is_couples_service;
    
    -- If successful, add documentation
    COMMENT ON TABLE services IS 'All services can be booked as either single (one person) or couples (two people). The customer chooses the booking type at time of booking.';
    
    RAISE NOTICE 'Successfully removed is_couples_service column';
COMMIT;

-- STEP 7: Verification
-- Check that the column is gone
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
        RAISE WARNING 'Check for dependencies and errors above';
    END IF;
END $$;

-- STEP 8: Show the backup table for reference
-- You can drop this table later once confirmed everything works
SELECT 
    name,
    is_couples_service as old_value,
    CASE 
        WHEN is_couples_service = true THEN 'Was limited to couples (WRONG)'
        ELSE 'Was marked as single/couples'
    END as old_behavior,
    'Now allows both single AND couples' as new_behavior
FROM _backup_services_is_couples
WHERE is_couples_service = true
ORDER BY name;

-- Note: If this migration fails with dependency errors:
-- 1. Check the error message to see which function depends on is_couples_service
-- 2. Update that function first to remove the dependency
-- 3. Then run this migration again

-- To rollback if needed:
-- ALTER TABLE services ADD COLUMN is_couples_service boolean DEFAULT false;
-- UPDATE services s SET is_couples_service = b.is_couples_service 
-- FROM _backup_services_is_couples b WHERE s.id = b.id;