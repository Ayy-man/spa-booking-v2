-- Fix RLS policies for booking_errors table to allow frontend error logging

-- Drop existing INSERT policy that's too restrictive
DROP POLICY IF EXISTS "Service role can insert booking errors" ON public.booking_errors;

-- Create new INSERT policy that allows anyone to log errors
-- This is necessary because errors can happen before authentication
CREATE POLICY "Anyone can insert booking errors" ON public.booking_errors
  FOR INSERT
  WITH CHECK (true);

-- Ensure other policies remain for security
-- Admin users can still view all errors (existing policy)
-- Admin users can still update errors (existing policy)

-- Add comment explaining the security model
COMMENT ON POLICY "Anyone can insert booking errors" ON public.booking_errors IS 
'Allows anonymous and authenticated users to log booking errors for debugging. View and update remain admin-only for security.';