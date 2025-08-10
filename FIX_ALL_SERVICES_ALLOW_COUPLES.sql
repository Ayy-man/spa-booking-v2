-- ============================================================================
-- FIX: All Services Should Allow Both Single and Couples Booking
-- ============================================================================
-- The business model is that ANY service can be booked as single OR couples
-- The customer chooses, not the service type

-- STEP 1: Check current state
SELECT 
    name,
    is_couples_service,
    CASE 
        WHEN is_couples_service = true THEN '❌ Incorrectly limited to couples only'
        ELSE '✅ Allows both single and couples'
    END as current_state
FROM services 
WHERE is_active = true
ORDER BY category, name;

-- STEP 2: The is_couples_service field is misleading and should not restrict booking types
-- In the future, consider removing this field entirely as it doesn't match the business model
-- For now, we'll document that this field should be IGNORED in the booking flow

-- The UI should:
-- 1. Show EVERY service with the option to book as single OR couples
-- 2. Default to single booking (most common case)
-- 3. Allow customer to toggle to couples booking if desired
-- 4. NOT use is_couples_service field to restrict options

-- IMPORTANT: Do NOT run any UPDATE statements
-- The fix is in the application logic, not the database