-- Fix duration constraint issue for couples bookings
-- Run this in your Supabase SQL Editor

-- First, let's check if the constraint exists
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'check_duration_matches_times';

-- If the constraint exists, drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_duration_matches_times'
    ) THEN
        ALTER TABLE bookings DROP CONSTRAINT check_duration_matches_times;
        RAISE NOTICE 'Dropped constraint check_duration_matches_times';
    ELSE
        RAISE NOTICE 'Constraint check_duration_matches_times does not exist';
    END IF;
END $$;

-- Verify the constraint is gone
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'check_duration_matches_times';

-- Now let's check the current bookings table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any other duration-related constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%duration%' OR conname LIKE '%time%';

-- Optional: Add a more flexible duration validation if needed
-- This would allow the application to handle duration calculations properly
-- ALTER TABLE bookings ADD CONSTRAINT check_duration_positive 
-- CHECK (duration > 0);

-- Verify the fix by checking a sample booking
SELECT 
    id,
    service_id,
    start_time,
    end_time,
    duration,
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) as calculated_duration_minutes
FROM bookings 
LIMIT 5;
