-- Test script for staff schedule validation
-- Run this after applying the migration to verify the validation works

-- Test cases for the validation function
-- These should return FALSE (staff not available)

SELECT 'Leonel on Monday (should be FALSE)' AS test_case,
       validate_staff_schedule('dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-08-05', '10:00', '11:00') AS result;

SELECT 'Selma on Tuesday (should be FALSE)' AS test_case,
       validate_staff_schedule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-08-06', '10:00', '11:00') AS result;

SELECT 'Tanisha on Thursday (should be FALSE)' AS test_case,
       validate_staff_schedule('cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-08-08', '10:00', '11:00') AS result;

-- These should return TRUE (staff available)

SELECT 'Leonel on Sunday (should be TRUE)' AS test_case,
       validate_staff_schedule('dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-08-04', '10:00', '11:00') AS result;

SELECT 'Selma on Monday (should be TRUE)' AS test_case,
       validate_staff_schedule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-08-05', '10:00', '11:00') AS result;

SELECT 'Robyn on any day (should be TRUE)' AS test_case,
       validate_staff_schedule('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-08-05', '10:00', '11:00') AS result;

-- Test edge cases

SELECT 'Staff outside working hours (should be FALSE)' AS test_case,
       validate_staff_schedule('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-08-05', '20:00', '21:00') AS result;

SELECT 'Invalid staff ID (should be FALSE)' AS test_case,
       validate_staff_schedule('invalid-staff-id', '2024-08-05', '10:00', '11:00') AS result;