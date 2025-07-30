-- =====================================================
-- DEBUG: Find the actual service_category enum values
-- Run this first to see what values are allowed
-- =====================================================

-- Check if service_category is an enum and what values it accepts
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'service_category'
ORDER BY e.enumsortorder;

-- Check the table structure
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name = 'category';

-- Check what categories currently exist in the services table
SELECT DISTINCT category FROM services ORDER BY category;

-- Check for any constraints on the category column
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'services' 
AND tc.constraint_type = 'CHECK'
AND cc.check_clause LIKE '%category%';

-- Show the exact error by trying to insert a test record
-- (This will fail and show us the exact error message)
DO $$
BEGIN
    INSERT INTO services (id, name, description, category, duration, price, is_couples_service, is_active)
    VALUES ('test_massage_enum', 'Test Service', 'Test', 'massage', 60, 100.00, true, true);
    
    -- If we get here, the enum worked
    RAISE NOTICE 'SUCCESS: massage enum value is valid';
    
    -- Clean up the test record
    DELETE FROM services WHERE id = 'test_massage_enum';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;