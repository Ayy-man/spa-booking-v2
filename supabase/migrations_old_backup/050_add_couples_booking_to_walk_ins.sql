-- Add couples booking support to walk_ins table
-- This migration adds fields to support couples walk-in bookings

-- Add couples_booking_id field to link related walk-in entries
ALTER TABLE public.walk_ins 
ADD COLUMN IF NOT EXISTS couples_booking_id text,
ADD COLUMN IF NOT EXISTS is_couples_booking boolean DEFAULT false;

-- Add index for faster lookup of linked couples bookings
CREATE INDEX IF NOT EXISTS idx_walk_ins_couples_booking_id 
ON public.walk_ins(couples_booking_id) 
WHERE couples_booking_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.walk_ins.couples_booking_id IS 'Unique identifier to link two walk-in entries for couples bookings';
COMMENT ON COLUMN public.walk_ins.is_couples_booking IS 'Flag to indicate if this walk-in is part of a couples booking';

-- Function to get linked couples booking
CREATE OR REPLACE FUNCTION get_linked_walk_in(walk_in_id uuid)
RETURNS TABLE (
  id uuid,
  customer_name text,
  customer_phone text,
  service_name text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w2.id,
    w2.customer_name,
    w2.customer_phone,
    w2.service_name,
    w2.status
  FROM walk_ins w1
  JOIN walk_ins w2 ON w1.couples_booking_id = w2.couples_booking_id
  WHERE w1.id = walk_in_id
    AND w2.id != walk_in_id
    AND w1.couples_booking_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_linked_walk_in(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_linked_walk_in(uuid) TO anon;