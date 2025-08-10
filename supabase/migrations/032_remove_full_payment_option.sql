-- Remove full_payment option from payment_option check constraint
-- Update the bookings table to only allow 'deposit' and 'pay_on_location'

-- First, update any existing 'full_payment' records to 'deposit'
UPDATE public.bookings 
SET payment_option = 'deposit' 
WHERE payment_option = 'full_payment';

-- Drop the existing check constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_payment_option_check;

-- Add the new check constraint without 'full_payment'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_payment_option_check 
CHECK (payment_option = ANY (ARRAY['deposit'::text, 'pay_on_location'::text]));

-- Update the default value to ensure it's valid
ALTER TABLE public.bookings 
ALTER COLUMN payment_option SET DEFAULT 'deposit'::text;