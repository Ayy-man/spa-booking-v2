-- Check the actual enum values for service_category
-- Run this in your Supabase SQL Editor to see what values are allowed

-- Check if service_category is an enum and what values it accepts
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'service_category'
ORDER BY e.enumsortorder;

-- Alternative: Check the table structure
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name = 'category';

-- Check what categories currently exist in the services table
SELECT DISTINCT category FROM services ORDER BY category; 