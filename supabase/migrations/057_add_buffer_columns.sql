-- Add buffer columns to bookings table for 15-minute prep/cleanup time
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS buffer_start TIME,
ADD COLUMN IF NOT EXISTS buffer_end TIME;

-- Add indexes for better query performance when checking buffer overlaps
CREATE INDEX IF NOT EXISTS idx_bookings_buffer_times 
ON bookings (appointment_date, buffer_start, buffer_end) 
WHERE status != 'cancelled';

-- Add comment explaining the purpose of buffer columns
COMMENT ON COLUMN bookings.buffer_start IS '15-minute buffer before appointment for prep/setup';
COMMENT ON COLUMN bookings.buffer_end IS '15-minute buffer after appointment for cleanup/transition';