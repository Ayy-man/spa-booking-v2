-- Disable buffer enforcement trigger
-- This allows back-to-back bookings without the 15-minute buffer requirement
-- Buffer columns remain for display purposes only

-- Drop the trigger that enforces buffer constraints
DROP TRIGGER IF EXISTS enforce_buffer_constraints_trigger ON bookings;

-- Drop the function that checks buffer conflicts
DROP FUNCTION IF EXISTS check_buffer_conflicts();

-- Add comment explaining the change
COMMENT ON TABLE bookings IS 'Buffer columns (buffer_start, buffer_end) are present for display purposes but not enforced. Back-to-back bookings are allowed.';