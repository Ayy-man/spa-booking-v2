-- =====================================================
-- SCRIPT: Clear All Bookings for Fresh Start
-- =====================================================
-- This script safely deletes all booking data while preserving
-- customers, staff, services, and other configuration data.
-- 
-- WARNING: This will permanently delete ALL bookings!
-- Make sure you have a backup if needed.
-- =====================================================

-- Start transaction for safety
BEGIN;

-- 1. Delete all payments first (foreign key dependency)
DELETE FROM payments 
WHERE booking_id IN (SELECT id FROM bookings);

-- Show payments deleted
SELECT 'Payments deleted: ' || ROW_COUNT() as result;

-- 2. Delete all bookings
DELETE FROM bookings;

-- Show bookings deleted
SELECT 'Bookings deleted: ' || ROW_COUNT() as result;

-- 3. Delete any staff availability blocks (if using this table)
DELETE FROM staff_availability 
WHERE availability_type IN ('blocked', 'break');

-- Show availability blocks deleted
SELECT 'Staff availability blocks deleted: ' || ROW_COUNT() as result;

-- 4. Reset any auto-incrementing sequences or counters if needed
-- (This database uses UUIDs so no sequences to reset)

-- 5. Verify deletion
SELECT 
  'Remaining bookings: ' || COUNT(*) as bookings_count 
FROM bookings;

SELECT 
  'Remaining payments: ' || COUNT(*) as payments_count 
FROM payments;

-- 6. Show what data remains (should be preserved)
SELECT 'Data preserved:' as info;
SELECT 'Customers: ' || COUNT(*) as count FROM customers;
SELECT 'Staff: ' || COUNT(*) as count FROM staff;
SELECT 'Services: ' || COUNT(*) as count FROM services;
SELECT 'Rooms: ' || COUNT(*) as count FROM rooms;
SELECT 'Admin users: ' || COUNT(*) as count FROM admin_users;

-- Commit the transaction
COMMIT;

-- Final success message
SELECT '✅ All bookings cleared successfully! Database is ready for fresh bookings.' as result;