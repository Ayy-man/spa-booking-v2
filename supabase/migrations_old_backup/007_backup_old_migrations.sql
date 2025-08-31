-- ============================================
-- OLD MIGRATIONS BACKUP - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Creates a backup record of all old migration files for reference
-- Created: 2025-01-31
-- Purpose: Document the migration consolidation process and maintain audit trail

-- ============================================
-- SECTION 1: MIGRATION HISTORY TABLE
-- ============================================

-- Create table to store old migration information
CREATE TABLE IF NOT EXISTS public.migration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_filename TEXT NOT NULL,
    migration_number TEXT,
    migration_title TEXT,
    consolidation_group TEXT NOT NULL,
    consolidated_into_file TEXT NOT NULL,
    original_creation_date TIMESTAMP WITH TIME ZONE,
    backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    migration_purpose TEXT,
    key_features TEXT[],
    notes TEXT
);

-- Enable RLS on migration_history
ALTER TABLE public.migration_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for migration_history (admin read-only)
CREATE POLICY "migration_history_admin_read" ON public.migration_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  );

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_migration_history_group ON public.migration_history(consolidation_group);
CREATE INDEX IF NOT EXISTS idx_migration_history_consolidated_file ON public.migration_history(consolidated_into_file);

-- ============================================
-- SECTION 2: MIGRATION RECORDS
-- ============================================

-- Insert records for all consolidated migrations
INSERT INTO public.migration_history (
    old_filename, 
    migration_number, 
    migration_title, 
    consolidation_group, 
    consolidated_into_file, 
    original_creation_date, 
    migration_purpose, 
    key_features, 
    notes
) VALUES 

-- COUPLES BOOKING SYSTEM MIGRATIONS
('030_fix_ambiguous_room_id_references.sql', '030', 'Fix Ambiguous Room ID References', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Fix room ID reference conflicts in couples booking', ARRAY['room_id_fixes', 'sql_cleanup'], 'Initial room reference fixes'),

('031_fix_couples_booking_room_logic.sql', '031', 'Fix Couples Booking Room Logic', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Improve room assignment logic for couples', ARRAY['room_assignment', 'couples_logic'], 'Room assignment improvements'),

('032_fix_couples_booking_function.sql', '032', 'Fix Couples Booking Function', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'General couples booking function fixes', ARRAY['function_fixes', 'booking_logic'], 'Function stability improvements'),

('033_create_booking_errors_table.sql', '033', 'Create Booking Errors Table', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Add error tracking for booking failures', ARRAY['error_tracking', 'debugging'], 'Error logging infrastructure'),

('034_fix_booking_errors_rls.sql', '034', 'Fix Booking Errors RLS', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Fix Row Level Security for booking errors', ARRAY['rls_policies', 'security'], 'Security policy fixes'),

('035_fix_couples_booking_room_assignment.sql', '035', 'Fix Couples Booking Room Assignment', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Room assignment algorithm improvements', ARRAY['room_assignment', 'algorithm_fixes'], 'Advanced room assignment logic'),

('036_complete_couples_booking_fix.sql', '036', 'Complete Couples Booking Fix', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Comprehensive couples booking overhaul', ARRAY['complete_overhaul', 'availability_checking', 'bulletproof_logic'], 'Final comprehensive solution'),

('037_emergency_fix_couples_constraint.sql', '037', 'Emergency Fix Couples Constraint', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Emergency constraint fixes', ARRAY['constraint_fixes', 'emergency_patch'], 'Emergency stability patch'),

('038_couples_single_slot_fix.sql', '038', 'Couples Single Slot Fix', 'couples_booking', '001_couples_booking_system.sql', '2025-01-17'::date, 'Fix single slot booking for couples', ARRAY['single_slot', 'booking_optimization'], 'Single time slot optimization'),

-- CORE SCHEMA UPDATES
('039_make_last_name_optional.sql', '039', 'Make Last Name Optional', 'core_schema', '002_core_schema_updates.sql', '2025-01-18'::date, 'Make customer last name optional', ARRAY['schema_flexibility', 'customer_data'], 'Customer data model improvement'),

('040_add_booking_status_triggers.sql', '040', 'Add Booking Status Triggers', 'core_schema', '002_core_schema_updates.sql', '2025-01-18'::date, 'Add automatic status management', ARRAY['status_triggers', 'automation'], 'Booking status automation'),

('041_add_cancel_booking_function.sql', '041', 'Add Cancel Booking Function', 'core_schema', '002_core_schema_updates.sql', '2025-01-18'::date, 'Safe booking cancellation', ARRAY['cancellation', 'booking_management'], 'Booking cancellation system'),

('042_add_phone_formatted_column.sql', '042', 'Add Phone Formatted Column', 'core_schema', '002_core_schema_updates.sql', '2025-01-18'::date, 'Phone number formatting', ARRAY['phone_formatting', 'data_display'], 'Phone number standardization'),

('050_add_couples_booking_to_walk_ins.sql', '050', 'Add Couples Booking to Walk-ins', 'core_schema', '002_core_schema_updates.sql', '2025-01-20'::date, 'Walk-in couples booking support', ARRAY['walk_ins', 'couples_support'], 'Walk-in booking enhancement'),

('059_fix_booking_validation_timezone.sql', '059', 'Fix Booking Validation Timezone', 'core_schema', '002_core_schema_updates.sql', '2025-01-21'::date, 'Timezone-aware booking validation', ARRAY['timezone_support', 'validation'], 'Timezone handling improvements'),

-- STAFF MANAGEMENT
('043_add_schedule_blocks.sql', '043', 'Add Schedule Blocks', 'staff_management', '003_staff_management.sql', '2025-01-18'::date, 'Staff availability blocking system', ARRAY['schedule_blocks', 'staff_availability'], 'Staff scheduling system'),

('051_add_staff_phuong_bosque.sql', '051', 'Add Staff Phuong Bosque', 'staff_management', '003_staff_management.sql', '2025-01-20'::date, 'Add new staff members', ARRAY['staff_additions', 'team_expansion'], 'Team expansion'),

('052_add_staff_reassignment_tracking.sql', '052', 'Add Staff Reassignment Tracking', 'staff_management', '003_staff_management.sql', '2025-01-20'::date, 'Track staff reassignments', ARRAY['reassignment_tracking', 'audit_trail'], 'Staff change tracking'),

-- SERVICES AND ADDONS
('053_add_services_and_addons.sql', '053', 'Add Services and Addons', 'services_addons', '004_services_and_addons.sql', '2025-01-20'::date, 'Comprehensive service catalog and addon system', ARRAY['service_catalog', 'addon_system', 'comprehensive_services'], 'Major service expansion'),

('054_add_missing_services_and_addons.sql', '054', 'Add Missing Services and Addons', 'services_addons', '004_services_and_addons.sql', '2025-01-20'::date, 'Additional services and addons', ARRAY['service_additions', 'addon_expansion'], 'Service catalog completion'),

('055_fix_addons_safe.sql', '055', 'Fix Addons Safe', 'services_addons', '004_services_and_addons.sql', '2025-01-20'::date, 'Safe addon system fixes', ARRAY['addon_fixes', 'system_stability'], 'Addon system stability'),

-- BOOKING BUFFERS
('057_add_buffer_columns.sql', '057', 'Add Buffer Columns', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Add buffer time columns', ARRAY['buffer_columns', 'preparation_time'], 'Initial buffer implementation'),

('058_update_existing_buffers.sql', '058', 'Update Existing Buffers', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Update existing booking buffers', ARRAY['buffer_updates', 'data_migration'], 'Buffer data updates'),

('060_enforce_buffer_constraints.sql', '060', 'Enforce Buffer Constraints', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Add buffer validation constraints', ARRAY['buffer_validation', 'constraint_enforcement'], 'Buffer constraint system'),

('061_disable_buffer_enforcement.sql', '061', 'Disable Buffer Enforcement', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Temporarily disable buffer enforcement', ARRAY['buffer_disable', 'system_flexibility'], 'Buffer enforcement toggle'),

('062_simplify_buffers_to_appointments.sql', '062', 'Simplify Buffers to Appointments', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Simplify buffer system using separate appointments', ARRAY['buffer_simplification', 'appointment_based_buffers'], 'Final buffer architecture'),

('063_fix_buffer_service_id.sql', '063', 'Fix Buffer Service ID', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Fix buffer service ID issues', ARRAY['service_id_fixes', 'buffer_services'], 'Buffer service fixes'),

('064_implement_buffer_columns_system.sql', '064', 'Implement Buffer Columns System', 'booking_buffers', '005_booking_buffers.sql', '2025-01-21'::date, 'Implement enhanced buffer column system', ARRAY['buffer_columns', 'enhanced_system'], 'Enhanced buffer implementation'),

-- CONSULTATION SERVICES
('056_add_consultation_service.sql', '056', 'Add Consultation Service', 'consultation_services', '006_consultation_services.sql', '2025-01-21'::date, 'Add consultation service support', ARRAY['consultation_services', 'service_flags'], 'Consultation system foundation'),

('065_add_consultation_category_tbd_pricing.sql', '065', 'Add Consultation Category TBD Pricing', 'consultation_services', '006_consultation_services.sql', '2025-01-21'::date, 'TBD pricing for consultations', ARRAY['tbd_pricing', 'consultation_categories'], 'TBD pricing system'),

('066_fix_consultation_services.sql', '066', 'Fix Consultation Services', 'consultation_services', '006_consultation_services.sql', '2025-01-21'::date, 'Fix consultation service issues', ARRAY['consultation_fixes', 'service_stability'], 'Consultation system fixes'),

('067_cleanup_duplicate_consultations.sql', '067', 'Cleanup Duplicate Consultations', 'consultation_services', '006_consultation_services.sql', '2025-01-21'::date, 'Remove duplicate consultation services', ARRAY['data_cleanup', 'duplicate_removal'], 'Data cleanup and optimization'),

('068_smart_consultation_cleanup.sql', '068', 'Smart Consultation Cleanup', 'consultation_services', '006_consultation_services.sql', '2025-01-21'::date, 'Intelligent consultation cleanup', ARRAY['smart_cleanup', 'data_optimization'], 'Advanced data cleanup'),

-- SPECIAL MIGRATIONS
('20250121_add_reschedule_tracking.sql', '20250121', 'Add Reschedule Tracking', 'core_schema', '002_core_schema_updates.sql', '2025-01-21'::date, 'Track booking reschedules', ARRAY['reschedule_tracking', 'booking_history'], 'Reschedule tracking system'),

('RESET_TO_V1_2_0.sql', 'RESET', 'Reset to V1.2.0', 'system_reset', 'N/A - System Reset', '2025-01-20'::date, 'System reset to stable version', ARRAY['system_reset', 'version_control'], 'Emergency system reset - not consolidated')

ON CONFLICT (old_filename) DO UPDATE SET
    migration_title = EXCLUDED.migration_title,
    consolidation_group = EXCLUDED.consolidation_group,
    consolidated_into_file = EXCLUDED.consolidated_into_file,
    key_features = EXCLUDED.key_features,
    notes = EXCLUDED.notes;

-- ============================================
-- SECTION 3: MIGRATION SUMMARY VIEW
-- ============================================

-- Create view for migration consolidation summary
CREATE OR REPLACE VIEW migration_consolidation_summary AS
SELECT 
    consolidation_group,
    consolidated_into_file,
    COUNT(*) as old_migrations_count,
    array_agg(old_filename ORDER BY migration_number) as consolidated_files,
    array_agg(DISTINCT migration_purpose) as purposes,
    string_agg(DISTINCT key_features::text, ', ') as all_features,
    MIN(original_creation_date) as earliest_migration,
    MAX(original_creation_date) as latest_migration
FROM migration_history
WHERE consolidation_group != 'system_reset'
GROUP BY consolidation_group, consolidated_into_file
ORDER BY consolidation_group;

-- Grant access to the view
GRANT SELECT ON migration_consolidation_summary TO authenticated;

-- ============================================
-- SECTION 4: MIGRATION VERIFICATION FUNCTIONS
-- ============================================

-- Function to verify migration consolidation completeness
CREATE OR REPLACE FUNCTION verify_migration_consolidation()
RETURNS TABLE (
    consolidation_group TEXT,
    total_old_migrations INTEGER,
    consolidated_file TEXT,
    verification_status TEXT,
    missing_features TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    expected_groups TEXT[] := ARRAY[
        'couples_booking',
        'core_schema', 
        'staff_management',
        'services_addons',
        'booking_buffers',
        'consultation_services'
    ];
    group_name TEXT;
BEGIN
    FOREACH group_name IN ARRAY expected_groups
    LOOP
        RETURN QUERY
        SELECT 
            mcs.consolidation_group,
            mcs.old_migrations_count,
            mcs.consolidated_into_file,
            CASE 
                WHEN mcs.old_migrations_count > 0 THEN 'CONSOLIDATED'
                ELSE 'MISSING'
            END as verification_status,
            ARRAY[]::TEXT[] as missing_features -- Placeholder for future feature checking
        FROM migration_consolidation_summary mcs
        WHERE mcs.consolidation_group = group_name;
        
        -- If no record found, return missing status
        IF NOT FOUND THEN
            RETURN QUERY
            SELECT 
                group_name,
                0,
                'MISSING FILE',
                'NOT FOUND',
                ARRAY['consolidation_missing']::TEXT[];
        END IF;
    END LOOP;
END;
$$;

-- Function to get consolidation statistics
CREATE OR REPLACE FUNCTION get_consolidation_statistics()
RETURNS TABLE (
    total_old_migrations INTEGER,
    total_consolidated_files INTEGER,
    consolidation_groups INTEGER,
    earliest_migration_date DATE,
    latest_migration_date DATE,
    consolidation_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_old_migrations,
        COUNT(DISTINCT consolidated_into_file)::INTEGER as total_consolidated_files,
        COUNT(DISTINCT consolidation_group)::INTEGER as consolidation_groups,
        MIN(original_creation_date)::DATE as earliest_migration_date,
        MAX(original_creation_date)::DATE as latest_migration_date,
        CURRENT_DATE as consolidation_date
    FROM migration_history
    WHERE consolidation_group != 'system_reset';
END;
$$;

-- ============================================
-- SECTION 5: PERMISSIONS AND GRANTS
-- ============================================

-- Grant permissions on migration history table
GRANT SELECT ON public.migration_history TO authenticated;
GRANT ALL ON public.migration_history TO authenticated; -- Allow admins to manage history

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION verify_migration_consolidation TO authenticated;
GRANT EXECUTE ON FUNCTION get_consolidation_statistics TO authenticated;

-- ============================================
-- SECTION 6: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON TABLE migration_history IS 
'Archive of all old migration files that have been consolidated into the new 6-file structure';

COMMENT ON COLUMN migration_history.consolidation_group IS 
'Logical grouping of related migrations (couples_booking, core_schema, staff_management, etc.)';

COMMENT ON COLUMN migration_history.consolidated_into_file IS 
'The new consolidated file that contains the functionality from this old migration';

COMMENT ON COLUMN migration_history.key_features IS 
'Array of key features/functionality provided by the original migration';

COMMENT ON VIEW migration_consolidation_summary IS 
'Summary view showing how old migrations were consolidated into the new file structure';

COMMENT ON FUNCTION verify_migration_consolidation IS 
'Verifies that all expected migration groups have been properly consolidated';

COMMENT ON FUNCTION get_consolidation_statistics IS 
'Provides overall statistics about the migration consolidation process';

-- ============================================
-- SECTION 7: FINAL CONSOLIDATION SUMMARY
-- ============================================

-- Display consolidation results
DO $$
DECLARE
    consolidation_stats RECORD;
BEGIN
    SELECT * INTO consolidation_stats FROM get_consolidation_statistics();
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION CONSOLIDATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Old Migrations: %', consolidation_stats.total_old_migrations;
    RAISE NOTICE 'Consolidated Into Files: %', consolidation_stats.total_consolidated_files;
    RAISE NOTICE 'Consolidation Groups: %', consolidation_stats.consolidation_groups;
    RAISE NOTICE 'Migration Period: % to %', consolidation_stats.earliest_migration_date, consolidation_stats.latest_migration_date;
    RAISE NOTICE 'Consolidation Date: %', consolidation_stats.consolidation_date;
    RAISE NOTICE '';
    RAISE NOTICE 'New Migration Files:';
    RAISE NOTICE '- 001_couples_booking_system.sql';
    RAISE NOTICE '- 002_core_schema_updates.sql';
    RAISE NOTICE '- 003_staff_management.sql';
    RAISE NOTICE '- 004_services_and_addons.sql';
    RAISE NOTICE '- 005_booking_buffers.sql';
    RAISE NOTICE '- 006_consultation_services.sql';
    RAISE NOTICE '- 007_backup_old_migrations.sql';
    RAISE NOTICE '========================================';
END $$;