-- Migration: Add formatted phone number columns for better display
-- Purpose: Store both raw and formatted phone numbers for Guam (671) area code

-- Add phone_formatted column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS phone_formatted text;

-- Add phone_formatted column to walk_ins table  
ALTER TABLE public.walk_ins
ADD COLUMN IF NOT EXISTS customer_phone_formatted text;

-- Add emergency_contact_phone_formatted to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS emergency_contact_phone_formatted text;

-- Add phone_formatted to booking_errors table for tracking
ALTER TABLE public.booking_errors
ADD COLUMN IF NOT EXISTS customer_phone_formatted text;

-- Create function to format Guam phone numbers
CREATE OR REPLACE FUNCTION format_guam_phone(phone_number text)
RETURNS text AS $$
DECLARE
    cleaned text;
    formatted text;
BEGIN
    -- Remove all non-numeric characters
    cleaned := regexp_replace(phone_number, '[^0-9]', '', 'g');
    
    -- Handle different input formats
    IF LENGTH(cleaned) = 7 THEN
        -- 7-digit local number, add 671 prefix
        formatted := '(671) ' || SUBSTRING(cleaned FROM 1 FOR 3) || '-' || SUBSTRING(cleaned FROM 4 FOR 4);
    ELSIF LENGTH(cleaned) = 10 AND SUBSTRING(cleaned FROM 1 FOR 3) = '671' THEN
        -- 10-digit with 671 prefix
        formatted := '(' || SUBSTRING(cleaned FROM 1 FOR 3) || ') ' || 
                    SUBSTRING(cleaned FROM 4 FOR 3) || '-' || 
                    SUBSTRING(cleaned FROM 7 FOR 4);
    ELSIF LENGTH(cleaned) = 11 AND SUBSTRING(cleaned FROM 1 FOR 4) = '1671' THEN
        -- 11-digit with 1671 prefix
        formatted := '(' || SUBSTRING(cleaned FROM 2 FOR 3) || ') ' || 
                    SUBSTRING(cleaned FROM 5 FOR 3) || '-' || 
                    SUBSTRING(cleaned FROM 8 FOR 4);
    ELSE
        -- Return original if format is unexpected
        formatted := phone_number;
    END IF;
    
    RETURN formatted;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to normalize phone for storage (always 671XXXXXXX)
CREATE OR REPLACE FUNCTION normalize_phone_for_db(phone_number text)
RETURNS text AS $$
DECLARE
    cleaned text;
BEGIN
    -- Remove all non-numeric characters
    cleaned := regexp_replace(phone_number, '[^0-9]', '', 'g');
    
    -- Handle different input formats
    IF LENGTH(cleaned) = 7 THEN
        -- 7-digit local number, add 671 prefix
        RETURN '671' || cleaned;
    ELSIF LENGTH(cleaned) = 11 AND SUBSTRING(cleaned FROM 1 FOR 1) = '1' THEN
        -- Remove country code
        RETURN SUBSTRING(cleaned FROM 2);
    ELSIF LENGTH(cleaned) = 10 AND SUBSTRING(cleaned FROM 1 FOR 3) = '671' THEN
        -- Already in correct format
        RETURN cleaned;
    ELSE
        -- Return cleaned version
        RETURN cleaned;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing phone numbers with formatted versions
UPDATE public.customers 
SET 
    phone_formatted = format_guam_phone(phone),
    emergency_contact_phone_formatted = format_guam_phone(emergency_contact_phone)
WHERE phone IS NOT NULL;

UPDATE public.walk_ins
SET customer_phone_formatted = format_guam_phone(customer_phone)
WHERE customer_phone IS NOT NULL;

UPDATE public.booking_errors
SET customer_phone_formatted = format_guam_phone(customer_phone)
WHERE customer_phone IS NOT NULL;

-- Create trigger to auto-format phone numbers on insert/update
CREATE OR REPLACE FUNCTION auto_format_phone_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- For customers table
    IF TG_TABLE_NAME = 'customers' THEN
        IF NEW.phone IS NOT NULL THEN
            NEW.phone := normalize_phone_for_db(NEW.phone);
            NEW.phone_formatted := format_guam_phone(NEW.phone);
        END IF;
        IF NEW.emergency_contact_phone IS NOT NULL THEN
            NEW.emergency_contact_phone := normalize_phone_for_db(NEW.emergency_contact_phone);
            NEW.emergency_contact_phone_formatted := format_guam_phone(NEW.emergency_contact_phone);
        END IF;
    -- For walk_ins table
    ELSIF TG_TABLE_NAME = 'walk_ins' THEN
        IF NEW.customer_phone IS NOT NULL THEN
            NEW.customer_phone := normalize_phone_for_db(NEW.customer_phone);
            NEW.customer_phone_formatted := format_guam_phone(NEW.customer_phone);
        END IF;
    -- For booking_errors table
    ELSIF TG_TABLE_NAME = 'booking_errors' THEN
        IF NEW.customer_phone IS NOT NULL THEN
            NEW.customer_phone := normalize_phone_for_db(NEW.customer_phone);
            NEW.customer_phone_formatted := format_guam_phone(NEW.customer_phone);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_format_phone_customers ON public.customers;
DROP TRIGGER IF EXISTS auto_format_phone_walkins ON public.walk_ins;
DROP TRIGGER IF EXISTS auto_format_phone_errors ON public.booking_errors;

-- Create triggers for auto-formatting
CREATE TRIGGER auto_format_phone_customers
    BEFORE INSERT OR UPDATE OF phone, emergency_contact_phone ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION auto_format_phone_numbers();

CREATE TRIGGER auto_format_phone_walkins
    BEFORE INSERT OR UPDATE OF customer_phone ON public.walk_ins
    FOR EACH ROW
    EXECUTE FUNCTION auto_format_phone_numbers();

CREATE TRIGGER auto_format_phone_errors
    BEFORE INSERT OR UPDATE OF customer_phone ON public.booking_errors
    FOR EACH ROW
    EXECUTE FUNCTION auto_format_phone_numbers();

-- Create indexes for phone number searches
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone_formatted ON public.customers(phone_formatted);
CREATE INDEX IF NOT EXISTS idx_walk_ins_customer_phone ON public.walk_ins(customer_phone);

-- Add check constraint to ensure phone numbers are in correct format
ALTER TABLE public.customers
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION format_guam_phone(text) TO authenticated;
GRANT EXECUTE ON FUNCTION format_guam_phone(text) TO anon;
GRANT EXECUTE ON FUNCTION normalize_phone_for_db(text) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_phone_for_db(text) TO anon;
GRANT EXECUTE ON FUNCTION auto_format_phone_numbers() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_format_phone_numbers() TO anon;

-- Add comments for documentation
COMMENT ON COLUMN public.customers.phone_formatted IS 'Formatted phone number for display: (671) XXX-XXXX';
COMMENT ON COLUMN public.walk_ins.customer_phone_formatted IS 'Formatted phone number for display: (671) XXX-XXXX';
COMMENT ON COLUMN public.customers.emergency_contact_phone_formatted IS 'Formatted emergency contact phone for display';
COMMENT ON FUNCTION format_guam_phone(text) IS 'Formats phone numbers to Guam standard: (671) XXX-XXXX';
COMMENT ON FUNCTION normalize_phone_for_db(text) IS 'Normalizes phone numbers for database storage: 671XXXXXXX';