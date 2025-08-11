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
SELECT 
    '=== SERVICES CURRENTLY MARKED AS COUPLES-ONLY ===' as info;

SELECT 
    name,
    category,
    ghl_category,
    is_couples_service,
    CASE 
        WHEN is_couples_service = true THEN '❌ Currently restricted to couples only'
        ELSE '✅ Already allows both single and couples'
    END as current_restriction,
    '✅ Will allow BOTH single and couples bookings after migration' as after_migration
FROM services
WHERE is_active = true
ORDER BY is_couples_service DESC, category, name;

-- STEP 3: Check for database function dependencies
SELECT 
    '=== CHECKING DATABASE FUNCTIONS FOR DEPENDENCIES ===' as info;

-- List functions that reference is_couples_service
SELECT DISTINCT 
    p.proname as function_name,
    'Contains reference to is_couples_service' as dependency_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%is_couples_service%'
ORDER BY p.proname;

-- STEP 4: Update functions to remove is_couples_service dependencies
-- These functions need to be updated to not check the field

-- Update assign_optimal_room function if it exists
DO $$
BEGIN
    -- Check if the function uses is_couples_service and update it
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'assign_optimal_room'
        AND pg_get_functiondef(p.oid) LIKE '%is_couples_service%'
    ) THEN
        RAISE NOTICE 'Updating assign_optimal_room function to remove is_couples_service dependency...';
        
        -- Create updated version without is_couples_service check
        CREATE OR REPLACE FUNCTION assign_optimal_room(
            p_service_id text,
            p_appointment_date date,
            p_start_time time,
            p_end_time time,
            p_staff_id text DEFAULT NULL,
            p_booking_type varchar DEFAULT 'single'
        )
        RETURNS integer AS $func$
        DECLARE
            v_room_id integer;
            v_requires_room_3 boolean;
            v_staff_default_room integer;
        BEGIN
            -- Get service requirements (no longer check is_couples_service)
            SELECT requires_room_3 
            INTO v_requires_room_3
            FROM services 
            WHERE id = p_service_id;
            
            -- Get staff's default room if specified
            IF p_staff_id IS NOT NULL THEN
                SELECT default_room_id INTO v_staff_default_room
                FROM staff
                WHERE id = p_staff_id;
            END IF;
            
            -- Room assignment logic (updated)
            -- 1. Body scrub/treatment services must use Room 3
            IF v_requires_room_3 = true THEN
                -- Check if Room 3 is available
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE room_id = 3
                    AND appointment_date = p_appointment_date
                    AND status NOT IN ('cancelled', 'no_show')
                    AND (start_time < p_end_time AND end_time > p_start_time)
                ) THEN
                    RETURN 3;
                ELSE
                    RETURN NULL; -- Room 3 required but not available
                END IF;
            END IF;
            
            -- 2. For couples bookings, prefer rooms 2 or 3 (capacity 2)
            -- Note: Now based on booking_type parameter, not service field
            IF p_booking_type = 'couple' THEN
                -- Try Room 3 first (preferred for couples)
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE room_id = 3
                    AND appointment_date = p_appointment_date
                    AND status NOT IN ('cancelled', 'no_show')
                    AND (start_time < p_end_time AND end_time > p_start_time)
                ) THEN
                    RETURN 3;
                END IF;
                
                -- Try Room 2
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE room_id = 2
                    AND appointment_date = p_appointment_date
                    AND status NOT IN ('cancelled', 'no_show')
                    AND (start_time < p_end_time AND end_time > p_start_time)
                ) THEN
                    RETURN 2;
                END IF;
                
                RETURN NULL; -- No couples room available
            END IF;
            
            -- 3. Try staff's default room
            IF v_staff_default_room IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE room_id = v_staff_default_room
                    AND appointment_date = p_appointment_date
                    AND status NOT IN ('cancelled', 'no_show')
                    AND (start_time < p_end_time AND end_time > p_start_time)
                ) THEN
                    RETURN v_staff_default_room;
                END IF;
            END IF;
            
            -- 4. Find any available room
            SELECT id INTO v_room_id
            FROM rooms
            WHERE is_active = true
            AND id NOT IN (
                SELECT DISTINCT room_id
                FROM bookings
                WHERE appointment_date = p_appointment_date
                AND status NOT IN ('cancelled', 'no_show')
                AND (start_time < p_end_time AND end_time > p_start_time)
            )
            ORDER BY 
                CASE 
                    WHEN id = 3 THEN 1  -- Prefer Room 3
                    WHEN id = 2 THEN 2  -- Then Room 2
                    ELSE 3              -- Then Room 1
                END
            LIMIT 1;
            
            RETURN v_room_id;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE '✅ Updated assign_optimal_room function';
    ELSE
        RAISE NOTICE '✅ assign_optimal_room function does not need updating';
    END IF;
END $$;

-- STEP 5: Remove the misleading column
ALTER TABLE services 
DROP COLUMN IF EXISTS is_couples_service;

-- STEP 6: Add clear documentation
COMMENT ON TABLE services IS 'All services support both single and couples bookings. The booking type is determined by customer choice (booking_type field in bookings table), not by the service itself.';

-- STEP 7: Verify the removal
DO $$
DECLARE
    v_count integer;
    v_affected_count integer;
BEGIN
    -- Check if column was removed
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'services'
    AND column_name = 'is_couples_service';
    
    -- Check how many services were affected
    SELECT COUNT(*) INTO v_affected_count
    FROM _migration_backup_services_is_couples
    WHERE is_couples_service = true;
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: is_couples_service column has been removed';
        RAISE NOTICE '✅ Total services affected: %', v_affected_count;
        RAISE NOTICE '✅ All % services now support both single AND couples bookings', (SELECT COUNT(*) FROM services WHERE is_active = true);
    ELSE
        RAISE WARNING '❌ FAILED: is_couples_service column still exists';
        RAISE WARNING 'Check for dependency errors above';
    END IF;
END $$;

-- STEP 8: Show the services that were previously restricted
SELECT 
    '=== SERVICES THAT WERE INCORRECTLY LIMITED TO COUPLES ONLY ===' as summary_info;

SELECT 
    name as service_name,
    category,
    ghl_category,
    'Was incorrectly marked as couples-only (is_couples_service = true)' as previous_restriction,
    'Now correctly allows BOTH single and couples bookings' as current_status
FROM _migration_backup_services_is_couples
WHERE is_couples_service = true
ORDER BY category, name;

-- STEP 9: Final verification query
SELECT 
    '=== MIGRATION SUMMARY ===' as final_summary,
    (SELECT COUNT(*) FROM services WHERE is_active = true) as total_active_services,
    'All services now support both single and couples bookings' as new_business_model,
    'Booking type determined by customer choice (booking_type field)' as implementation_note;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed):
-- ============================================================================
-- If you need to restore the column (NOT recommended):
-- 
-- ALTER TABLE services ADD COLUMN is_couples_service boolean DEFAULT false;
-- UPDATE services s 
-- SET is_couples_service = b.is_couples_service 
-- FROM _migration_backup_services_is_couples b 
-- WHERE s.id = b.id;
-- 
-- Then drop the backup table:
-- DROP TABLE IF EXISTS _migration_backup_services_is_couples;
-- ============================================================================

-- IMPORTANT NOTES:
-- 1. The backup table _migration_backup_services_is_couples is preserved
-- 2. You can drop it later once you confirm everything works correctly
-- 3. The business model is now: ANY service can be single OR couples booking
-- 4. The frontend should NOT check service fields for couples availability
-- 5. Room assignment is now based on booking_type parameter, not service field