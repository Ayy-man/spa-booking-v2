-- Migration: Add ghl_category column to services table
-- This migration ensures the ghl_category column exists before trying to populate it

-- Add GHL category column to services table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'ghl_category') THEN
        ALTER TABLE services ADD COLUMN ghl_category VARCHAR(100);
        RAISE NOTICE 'Added ghl_category column to services table';
    ELSE
        RAISE NOTICE 'ghl_category column already exists';
    END IF;
END $$;

-- Verify the column was added
DO $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'ghl_category'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'SUCCESS: ghl_category column is now available';
    ELSE
        RAISE NOTICE 'ERROR: ghl_category column was not added';
    END IF;
END $$; 