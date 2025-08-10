-- ============================================================================
-- EMERGENCY FIX: Single Booking Being Treated as Couples Booking
-- ============================================================================
-- Run these queries in your Supabase SQL Editor to diagnose and fix the issue

-- STEP 1: Check if Basic Facial is misconfigured as couples service
SELECT 
    id, 
    name, 
    is_couples_service, 
    category, 
    duration, 
    price,
    CASE 
        WHEN is_couples_service = true THEN '❌ PROBLEM: Marked as couples service'
        ELSE '✅ Correctly marked as single service'
    END as status
FROM services 
WHERE name ILIKE '%facial%'
ORDER BY name;

-- STEP 2: Check ALL services to see which ones are marked as couples
SELECT 
    name, 
    is_couples_service,
    CASE 
        WHEN is_couples_service = true THEN '🔴 COUPLES SERVICE'
        ELSE '🟢 Single service'
    END as service_type
FROM services 
WHERE is_active = true
ORDER BY is_couples_service DESC, name;

-- STEP 3: FIX - If Basic Facial is incorrectly marked as couples service, fix it
-- Only run this if STEP 1 shows Basic Facial has is_couples_service = true

-- UPDATE services 
-- SET is_couples_service = false 
-- WHERE name ILIKE '%basic facial%' 
--   AND is_couples_service = true;

-- STEP 4: FIX - Ensure only actual couples services are marked as couples
-- Only run if you see services that shouldn't be couples services

-- UPDATE services 
-- SET is_couples_service = false 
-- WHERE is_couples_service = true 
--   AND name NOT ILIKE '%couple%' 
--   AND name NOT ILIKE '%couples%'
--   AND name NOT ILIKE '%duo%'
--   AND name NOT ILIKE '%partner%';

-- STEP 5: Verify the fix worked
-- SELECT name, is_couples_service 
-- FROM services 
-- WHERE name ILIKE '%basic facial%';

-- INSTRUCTIONS:
-- 1. Run STEP 1 and STEP 2 first to see what's wrong
-- 2. If Basic Facial shows is_couples_service = true, uncomment and run STEP 3
-- 3. If other single services are marked as couples, uncomment and run STEP 4
-- 4. Run STEP 5 to verify the fix worked
-- 5. Clear your browser localStorage and try booking again