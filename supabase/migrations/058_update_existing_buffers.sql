-- This script updates existing bookings with buffer times
-- Run this AFTER the main migration and only for future bookings

-- Update only future bookings to avoid trigger errors
UPDATE bookings
SET 
    buffer_start = CASE 
        WHEN start_time::time - INTERVAL '15 minutes' < '09:00:00'::time 
        THEN '09:00:00'::time 
        ELSE start_time::time - INTERVAL '15 minutes'
    END,
    buffer_end = CASE 
        WHEN end_time::time + INTERVAL '15 minutes' > '20:00:00'::time 
        THEN '20:00:00'::time 
        ELSE end_time::time + INTERVAL '15 minutes'
    END
WHERE buffer_start IS NULL 
  AND buffer_end IS NULL
  AND appointment_date >= CURRENT_DATE;