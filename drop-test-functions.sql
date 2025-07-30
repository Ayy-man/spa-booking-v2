-- =====================================================
-- DROP EXISTING TEST FUNCTIONS
-- Run this FIRST before installing the real functions
-- =====================================================

-- Drop all existing functions (if they exist)
DROP FUNCTION IF EXISTS get_available_time_slots CASCADE;
DROP FUNCTION IF EXISTS process_booking CASCADE;
DROP FUNCTION IF EXISTS assign_optimal_room CASCADE;
DROP FUNCTION IF EXISTS check_staff_capability CASCADE;
DROP FUNCTION IF EXISTS get_staff_schedule CASCADE;
DROP FUNCTION IF EXISTS test_function CASCADE;

-- Verify they're gone
SELECT proname FROM pg_proc 
WHERE proname IN (
  'get_available_time_slots',
  'process_booking', 
  'assign_optimal_room',
  'check_staff_capability',
  'get_staff_schedule'
);