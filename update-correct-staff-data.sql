-- Update Staff Data with Correct Real Staff Information
-- This script cleans existing staff data and inserts the correct 4 staff members
-- plus an "any" staff option for flexibility

-- Start transaction to ensure data consistency
BEGIN;

-- First, clear all existing staff records (clean slate)
-- Only delete bookings if there are staff records to avoid constraint errors
DELETE FROM bookings WHERE EXISTS (SELECT 1 FROM staff) AND staff_id IN (SELECT id FROM staff);
DELETE FROM staff;

-- Insert the correct staff data based on the actual schema
-- Schema uses: capabilities (service_category[]), work_days (integer[]), default_room_id (integer)

-- 1. Selma Villaver - Room 1, Esthetician (Facials only)
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    capabilities, 
    work_days,
    default_room_id, 
    initials,
    is_active
) VALUES (
    'selma_villaver',
    'Selma Villaver',
    'happyskinhappyyou@gmail.com',
    '(671) 482-7765',
    ARRAY['facials']::service_category[], -- Can do facials, cannot do dermaplaning
    ARRAY[1, 2, 3, 4, 5, 6, 0], -- Mon-Sun (all days)
    1, -- Room 1
    'SV',
    true
);

-- 2. Tanisha Harris - Room 2, Esthetician (Days off: Tuesday, Thursday)
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    capabilities, 
    work_days,
    default_room_id, 
    initials,
    is_active
) VALUES (
    'tanisha_harris',
    'Tanisha Harris',
    'misstanishababyy@gmail.com',
    '(671) 747-5728',
    ARRAY['facials', 'waxing']::service_category[], -- Can do facials and waxing
    ARRAY[1, 3, 5, 6, 0], -- Mon, Wed, Fri, Sat, Sun (off Tue/Thu)
    2, -- Room 2
    'TH',
    true
);

-- 3. Robyn Camacho - Room 3, Esthetician & Massage Therapist
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    capabilities, 
    work_days,
    default_room_id, 
    initials,
    is_active
) VALUES (
    'robyn_camacho',
    'Robyn Camacho',
    'robyncmcho@gmail.com',
    '(671) 480-7862',
    ARRAY['facials', 'waxing', 'treatments', 'massages']::service_category[], 
    -- Can do facials, waxing, body treatments, massage (cannot do advanced treatments)
    ARRAY[1, 2, 3, 4, 5, 6, 0], -- Mon-Sun (all days)
    3, -- Room 3
    'RC',
    true
);

-- 4. Leonel Sidon - Flexible room, Massage Therapist & Assistant (Sundays only)
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    capabilities, 
    work_days,
    default_room_id, 
    initials,
    is_active
) VALUES (
    'leonel_sidon',
    'Leonel Sidon',
    'sidonleonel@gmail.com',
    '(671) 747-1882',
    ARRAY['massages', 'treatments']::service_category[], -- Can do body massage and body treatments
    ARRAY[0], -- Sundays only
    NULL, -- Flexible room assignment
    'LS',
    true
);

-- 5. Add "Any Available Staff" option for booking flexibility
INSERT INTO staff (
    id, 
    name, 
    email, 
    phone, 
    capabilities, 
    work_days,
    default_room_id, 
    initials,
    is_active
) VALUES (
    'any',
    'Any Available Staff',
    'admin@dermalcare.com',
    '(671) 000-0000',
    ARRAY['facials', 'waxing', 'treatments', 'massages']::service_category[], -- Can perform all services
    ARRAY[1, 2, 3, 4, 5, 6, 0], -- All days
    NULL, -- No default room (flexible)
    'AA',
    true
);

-- Commit the transaction
COMMIT;

-- Verify the data was inserted correctly
SELECT 
    id,
    name,
    email,
    phone,
    capabilities,
    work_days,
    CASE 
        WHEN default_room_id = 1 THEN 'Room 1'
        WHEN default_room_id = 2 THEN 'Room 2'
        WHEN default_room_id = 3 THEN 'Room 3'
        ELSE 'Flexible'
    END AS assigned_room,
    initials,
    is_active
FROM staff
ORDER BY name;

-- Show the mapping between capabilities and actual services
SELECT DISTINCT category as service_category 
FROM services 
WHERE is_active = true
ORDER BY category;