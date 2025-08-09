-- Test script to verify room assignment is working
-- Run this after applying migration 029

-- Test 1: Basic facial service
SELECT 'Test 1: Basic Facial Service' as test_name;
SELECT * FROM debug_room_assignment(
    (SELECT id FROM services WHERE name = 'Basic Facial' LIMIT 1),
    CURRENT_DATE + 1,
    '10:00'::TIME
);

-- Test 2: Body scrub service (should assign Room 3)
SELECT 'Test 2: Body Scrub Service' as test_name;
SELECT * FROM debug_room_assignment(
    (SELECT id FROM services WHERE name = 'Dead Sea Salt Body Scrub' LIMIT 1),
    CURRENT_DATE + 1,
    '11:00'::TIME
);

-- Test 3: Package/Couples service (should prefer larger rooms)
SELECT 'Test 3: Package Service' as test_name;
SELECT * FROM debug_room_assignment(
    (SELECT id FROM services WHERE name LIKE '%+%' LIMIT 1),
    CURRENT_DATE + 1,
    '14:00'::TIME
);

-- Test 4: Check room capabilities match service categories
SELECT 'Room Capabilities Check' as test_name;
SELECT 
    r.name as room_name,
    r.capabilities,
    r.has_body_scrub_equipment,
    r.is_couples_room,
    r.capacity
FROM rooms r 
WHERE r.is_active = true
ORDER BY r.name;

-- Test 5: Check staff capabilities
SELECT 'Staff Capabilities Check' as test_name;
SELECT 
    s.name as staff_name,
    s.can_perform_services as capabilities
FROM staff s 
WHERE s.is_active = true
ORDER BY s.name;

-- Test 6: Check service categories
SELECT 'Service Categories Check' as test_name;
SELECT DISTINCT 
    category,
    COUNT(*) as service_count
FROM services 
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Test 7: Direct function call test
SELECT 'Direct Function Test' as test_name;
SELECT * FROM assign_optimal_room(
    (SELECT id FROM services WHERE name = 'Basic Facial' LIMIT 1)::uuid,
    NULL::uuid,
    CURRENT_DATE + 1,
    '15:00'::TIME
);