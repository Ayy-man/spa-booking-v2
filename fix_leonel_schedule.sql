-- Fix Leonel Sidon's schedule to work on Sundays only (correct schedule)
-- Run this in your Supabase SQL Editor

-- Update Leonel's work days to Sunday only (0)
UPDATE staff 
SET work_days = ARRAY[0]
WHERE email = 'sidonleonel@gmail.com';

-- Verify the update
SELECT 
    id,
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
WHERE email = 'sidonleonel@gmail.com';
