-- Update staff work_days to match business requirements
-- Date: 2024-08-13
-- Purpose: Fix staff scheduling constraints in database

-- Update Selma Villaver - Works: Sun(0), Mon(1), Wed(3), Fri(5), Sat(6) - Off Tue/Thu
UPDATE staff 
SET work_days = ARRAY[0, 1, 3, 5, 6]
WHERE email = 'happyskinhappyyou@gmail.com';

-- Update Robyn Camacho - Works all days: Sun(0) through Sat(6)
UPDATE staff 
SET work_days = ARRAY[0, 1, 2, 3, 4, 5, 6]
WHERE email = 'robyncmcho@gmail.com';

-- Update Tanisha Harris - Works: Sun(0), Mon(1), Wed(3), Fri(5), Sat(6) - Off Tue/Thu
UPDATE staff 
SET work_days = ARRAY[0, 1, 3, 5, 6]
WHERE email = 'misstanishababyy@gmail.com';

-- Update Leonel Sidon - Works Sundays only
UPDATE staff 
SET work_days = ARRAY[0]
WHERE email = 'sidonleonel@gmail.com';

-- Verify the updates
SELECT 
    name,
    email,
    work_days,
    CASE 
        WHEN 0 = ANY(work_days) THEN 'Sun ' ELSE ''
    END ||
    CASE 
        WHEN 1 = ANY(work_days) THEN 'Mon ' ELSE ''
    END ||
    CASE 
        WHEN 2 = ANY(work_days) THEN 'Tue ' ELSE ''
    END ||
    CASE 
        WHEN 3 = ANY(work_days) THEN 'Wed ' ELSE ''
    END ||
    CASE 
        WHEN 4 = ANY(work_days) THEN 'Thu ' ELSE ''
    END ||
    CASE 
        WHEN 5 = ANY(work_days) THEN 'Fri ' ELSE ''
    END ||
    CASE 
        WHEN 6 = ANY(work_days) THEN 'Sat ' ELSE ''
    END as schedule_days
FROM staff
ORDER BY name;