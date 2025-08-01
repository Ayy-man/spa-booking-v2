-- Migration: Wipe all customer data for fresh testing
-- This migration safely removes all customer data while preserving database structure

-- First, let's see what we're about to delete
DO $$
DECLARE
    customer_count integer;
    booking_count integer;
    payment_count integer;
BEGIN
    -- Count existing data
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO payment_count FROM payments;
    
    RAISE NOTICE 'About to delete:';
    RAISE NOTICE '- % customers', customer_count;
    RAISE NOTICE '- % bookings', booking_count;
    RAISE NOTICE '- % payments', payment_count;
END $$;

-- Disable foreign key checks temporarily (if needed)
-- Note: PostgreSQL doesn't have a direct equivalent to MySQL's SET FOREIGN_KEY_CHECKS
-- We'll handle this by deleting in the correct order

-- 1. Delete payments first (they reference bookings)
DELETE FROM payments;

-- 2. Delete bookings (they reference customers, staff, services, rooms)
DELETE FROM bookings;

-- 3. Delete customers
DELETE FROM customers;

-- 4. Reset any auto-increment sequences if they exist
-- Note: PostgreSQL uses UUIDs, so sequences aren't typically used for IDs
-- But we'll reset any that might exist

-- Reset booking_id sequence if it exists (though it's likely UUID)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'bookings_id_seq') THEN
        ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
        RAISE NOTICE 'Reset bookings_id_seq';
    END IF;
END $$;

-- Reset customer_id sequence if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'customers_id_seq') THEN
        ALTER SEQUENCE customers_id_seq RESTART WITH 1;
        RAISE NOTICE 'Reset customers_id_seq';
    END IF;
END $$;

-- Reset payment_id sequence if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'payments_id_seq') THEN
        ALTER SEQUENCE payments_id_seq RESTART WITH 1;
        RAISE NOTICE 'Reset payments_id_seq';
    END IF;
END $$;

-- Verify the deletion
DO $$
DECLARE
    customer_count integer;
    booking_count integer;
    payment_count integer;
BEGIN
    -- Count remaining data
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO payment_count FROM payments;
    
    RAISE NOTICE 'After deletion:';
    RAISE NOTICE '- % customers remaining', customer_count;
    RAISE NOTICE '- % bookings remaining', booking_count;
    RAISE NOTICE '- % payments remaining', payment_count;
    
    IF customer_count = 0 AND booking_count = 0 AND payment_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All customer data has been wiped successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Some data may still remain';
    END IF;
END $$;

-- Clean up any orphaned data in related tables
-- Reset reminder tracking
UPDATE bookings SET 
    reminder_sent_at = NULL,
    reminder_send_count = 0
WHERE reminder_sent_at IS NOT NULL OR reminder_send_count > 0;

-- Note: We don't delete from these tables as they contain reference data:
-- - services (contains service definitions)
-- - staff (contains staff information)
-- - rooms (contains room information)
-- - admin_users (contains admin accounts)

RAISE NOTICE 'Database wiped successfully. Ready for fresh testing!'; 