-- Fix Staff Work Schedules in Database
-- Run this in your Supabase SQL editor to ensure correct work days

-- Selma Villaver: Works ALL 7 days
UPDATE staff 
SET work_days = ARRAY[0,1,2,3,4,5,6]
WHERE name = 'Selma Villaver' OR email = 'happyskinhappyyou@gmail.com';

-- Robyn Camacho: OFF Monday & Tuesday
UPDATE staff 
SET work_days = ARRAY[0,3,4,5,6]  -- Sun, Wed, Thu, Fri, Sat
WHERE name = 'Robyn Camacho' OR email = 'robyncmcho@gmail.com';

-- Tanisha Harris: OFF Tuesday & Thursday  
UPDATE staff 
SET work_days = ARRAY[0,1,3,5,6]  -- Sun, Mon, Wed, Fri, Sat
WHERE name = 'Tanisha Harris' OR email = 'misstanishababyy@gmail.com';

-- Leonel Sidon: OFF Monday & Tuesday (same as Robyn)
UPDATE staff 
SET work_days = ARRAY[0,3,4,5,6]  -- Sun, Wed, Thu, Fri, Sat
WHERE name = 'Leonel Sidon' OR email = 'sidonleonel@gmail.com';

-- Verify the updates
SELECT name, email, work_days 
FROM staff 
WHERE is_active = true
ORDER BY name;