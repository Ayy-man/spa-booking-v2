-- Migration: Make last_name field optional in customers table
-- Description: Allow customers to be created with just a first name (single name support)
-- Author: System
-- Date: 2025-08-18

-- Make last_name column nullable in customers table
ALTER TABLE public.customers 
ALTER COLUMN last_name DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.customers.last_name IS 'Customer last name - optional field to support single-name customers';
COMMENT ON COLUMN public.customers.first_name IS 'Customer first name or full name if no last name provided';

-- Update any existing empty last_name values to NULL for consistency
UPDATE public.customers 
SET last_name = NULL 
WHERE last_name = '' OR last_name = ' ';

-- Note: This migration is backwards compatible
-- Existing records with last_name values will remain unchanged
-- New records can be created with last_name as NULL