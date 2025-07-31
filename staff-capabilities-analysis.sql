-- Staff Capabilities Analysis
-- This script shows the mapping between staff and their service capabilities
-- Based on the real staff data provided

-- Show staff capabilities with room assignments
SELECT 
    s.name,
    s.email,
    s.phone,
    s.can_perform_services as capabilities,
    CASE 
        WHEN s.default_room_id = '11111111-1111-1111-1111-111111111111' THEN 'Room 1'
        WHEN s.default_room_id = '22222222-2222-2222-2222-222222222222' THEN 'Room 2' 
        WHEN s.default_room_id = '33333333-3333-3333-3333-333333333333' THEN 'Room 3'
        ELSE 'Flexible'
    END as default_room,
    r.name as room_name,
    -- Show availability pattern
    CASE 
        WHEN s.schedule::text LIKE '%"tue": {"available": false}%' AND 
             s.schedule::text LIKE '%"thu": {"available": false}%' THEN 'Off Tue/Thu'
        WHEN s.schedule::text LIKE '%"sun": {"available": true}%' AND
             s.schedule::text LIKE '%"mon": {"available": false}%' THEN 'Sundays Only'
        ELSE 'Full Schedule'
    END as schedule_pattern
FROM staff s
LEFT JOIN rooms r ON s.default_room_id = r.id
WHERE s.is_active = true
ORDER BY s.name;

-- Show what services each staff member can perform
WITH staff_services AS (
    SELECT 
        s.name,
        unnest(s.can_perform_services) as service_category,
        s.default_room_id
    FROM staff s
    WHERE s.is_active = true
)
SELECT 
    ss.name as staff_name,
    ss.service_category,
    COUNT(serv.id) as available_services,
    string_agg(serv.name, ', ') as service_examples
FROM staff_services ss
JOIN services serv ON serv.category = ss.service_category AND serv.is_active = true
GROUP BY ss.name, ss.service_category
ORDER BY ss.name, ss.service_category;

-- Show staff restrictions (what they CANNOT do)
-- Based on the business requirements provided
SELECT 
    'Robyn Camacho' as staff_name,
    'Cannot perform advanced treatments' as restriction,
    ARRAY['Radio Frequency', 'Nano', 'Microneedling', 'Derma Roller', 'Dermaplaning'] as cannot_do
UNION ALL
SELECT 
    'Tanisha Harris' as staff_name,
    'Cannot perform advanced treatments' as restriction,
    ARRAY['Radio Frequency', 'Nano', 'Microneedling', 'Derma Roller'] as cannot_do
UNION ALL
SELECT 
    'Selma Villaver' as staff_name,
    'Limited to basic facials' as restriction,
    ARRAY['Dermaplaning'] as cannot_do
UNION ALL
SELECT 
    'Leonel Sidon' as staff_name,
    'Body treatments and massage only' as restriction,
    ARRAY['Facials', 'Waxing', 'Advanced treatments'] as cannot_do;

-- Show room capabilities vs staff assignments
SELECT 
    r.name as room_name,
    r.room_number,
    r.capabilities as room_capabilities,
    r.has_body_scrub_equipment,
    r.is_couples_room,
    string_agg(s.name, ', ') as assigned_staff
FROM rooms r
LEFT JOIN staff s ON s.default_room_id = r.id AND s.is_active = true
WHERE r.is_active = true
GROUP BY r.id, r.name, r.room_number, r.capabilities, r.has_body_scrub_equipment, r.is_couples_room
ORDER BY r.room_number;