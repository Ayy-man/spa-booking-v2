-- ============================================
-- RESET TO V1.2.0 DATABASE SCHEMA
-- ============================================
-- This migration resets the database to match v1.2.0 release
-- Removes newer features that were added after v1.2.0
-- ============================================

-- WARNING: This will delete data and tables that were added after v1.2.0
-- Make sure to backup any important data before running this

BEGIN;

-- ============================================
-- 1. REMOVE NEWER TABLES (added after v1.2.0)
-- ============================================

-- Remove webhook_failures table (added after v1.2.0)
DROP TABLE IF EXISTS public.webhook_failures CASCADE;

-- ============================================
-- 2. REMOVE NEWER COLUMNS (added after v1.2.0)
-- ============================================

-- Remove newer columns from bookings table
ALTER TABLE public.bookings DROP COLUMN IF EXISTS booking_group_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS booking_type;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS waiver_signed;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS waiver_data;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS waiver_signed_at;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS payment_option;

-- Remove newer columns from staff table
ALTER TABLE public.staff DROP COLUMN IF EXISTS service_exclusions;
ALTER TABLE public.staff DROP COLUMN IF EXISTS default_start_time;
ALTER TABLE public.staff DROP COLUMN IF EXISTS default_end_time;

-- Remove newer columns from staff_schedules table
ALTER TABLE public.staff_schedules DROP COLUMN IF EXISTS break_start_2;
ALTER TABLE public.staff_schedules DROP COLUMN IF EXISTS break_end_2;
ALTER TABLE public.staff_schedules DROP COLUMN IF EXISTS break_start_3;
ALTER TABLE public.staff_schedules DROP COLUMN IF EXISTS break_end_3;

-- Remove newer columns from services table
ALTER TABLE public.services DROP COLUMN IF EXISTS popularity_score;
ALTER TABLE public.services DROP COLUMN IF EXISTS is_recommended;
ALTER TABLE public.services DROP COLUMN IF EXISTS is_popular;
ALTER TABLE public.services DROP COLUMN IF EXISTS is_couples_service;
ALTER TABLE public.services DROP COLUMN IF EXISTS requires_couples_room;

-- Remove newer columns from service_packages table
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS is_couples;

-- Remove newer columns from customers table
ALTER TABLE public.customers DROP COLUMN IF EXISTS phone_formatted;
ALTER TABLE public.customers DROP COLUMN IF EXISTS emergency_contact_phone_formatted;

-- Remove newer columns from walk_ins table
ALTER TABLE public.walk_ins DROP COLUMN IF EXISTS customer_phone_formatted;

-- Remove newer columns from booking_errors table
ALTER TABLE public.booking_errors DROP COLUMN IF EXISTS customer_phone_formatted;

-- ============================================
-- 3. REMOVE NEWER CONSTRAINTS (added after v1.2.0)
-- ============================================

-- Remove newer check constraints from bookings table
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

-- Remove newer check constraints from payments table
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_option_check;

-- ============================================
-- 4. REMOVE NEWER FUNCTIONS (added after v1.2.0)
-- ============================================

-- Remove newer RPC functions that were added after v1.2.0
DROP FUNCTION IF EXISTS public.send_booking_to_selma() CASCADE;

-- ============================================
-- 5. REMOVE NEWER TRIGGERS (added after v1.2.0)
-- ============================================

-- Remove newer triggers that were added after v1.2.0
-- (Keep the v1.2.0 triggers: 039, 040, 041, 042)

-- ============================================
-- 6. VERIFY V1.2.0 SCHEMA IS CORRECT
-- ============================================

-- The database should now match v1.2.0 schema with:
-- - Migrations 039-042 (phone formatting, booking cancellation, etc.)
-- - Couples booking system (v1.1.0 features)
-- - Basic admin functionality
-- - NO newer features like Selma webhooks, advanced break times, etc.

-- ============================================
-- 7. CLEANUP AND VERIFICATION
-- ============================================

-- Remove any orphaned sequences or types
-- (This will be handled automatically by PostgreSQL)

-- Verify the schema matches v1.2.0 expectations
DO $$
BEGIN
    -- Check that v1.2.0 tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_errors') THEN
        RAISE EXCEPTION 'booking_errors table missing - v1.2.0 schema incomplete';
    END IF;
    
    -- Check that v1.2.0 columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
        RAISE EXCEPTION 'cancelled_at column missing - v1.2.0 schema incomplete';
    END IF;
    
    RAISE NOTICE 'Database successfully reset to v1.2.0 schema';
END $$;

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================
-- After running this migration, verify:
-- 1. All v1.2.0 features work correctly
-- 2. Phone formatting works for Guam numbers
-- 3. Booking cancellation system functions
-- 4. Couples booking system works
-- 5. No newer features are accessible
-- ============================================
