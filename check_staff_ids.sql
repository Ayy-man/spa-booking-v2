-- Check what staff IDs actually exist in the database
SELECT id, name, work_days, is_active FROM staff ORDER BY name;

-- Check if 'robyn' or 'robyn_camacho' exists
SELECT id, name FROM staff WHERE id LIKE '%robyn%' OR name LIKE '%Robyn%';

-- Check if 'any' staff exists
SELECT id, name FROM staff WHERE id = 'any';