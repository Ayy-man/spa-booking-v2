-- Add reminder tracking to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_send_count integer DEFAULT 0;

-- Create index for efficient querying of bookings needing reminders
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_lookup 
ON public.bookings(appointment_date, start_time, reminder_sent_at) 
WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Create function to find bookings that need 24-hour reminders
CREATE OR REPLACE FUNCTION get_bookings_for_24hr_reminder()
RETURNS TABLE (
  booking_id uuid,
  customer_id uuid,
  service_id uuid,
  staff_id uuid,
  room_id integer,
  appointment_date date,
  start_time time,
  end_time time,
  duration integer,
  total_price numeric,
  final_price numeric,
  notes text,
  booking_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.customer_id,
    b.service_id,
    b.staff_id,
    b.room_id,
    b.appointment_date,
    b.start_time::time,
    b.end_time::time,
    b.duration,
    b.total_price,
    b.final_price,
    b.notes,
    b.booking_type
  FROM bookings b
  WHERE 
    -- Booking is confirmed
    b.status = 'confirmed'
    -- Reminder hasn't been sent yet
    AND b.reminder_sent_at IS NULL
    -- Appointment is approximately 24 hours from now (with 1 hour window)
    AND b.appointment_date = CURRENT_DATE + INTERVAL '1 day'
    AND b.start_time::time BETWEEN (CURRENT_TIME - INTERVAL '30 minutes') AND (CURRENT_TIME + INTERVAL '30 minutes')
  ORDER BY b.appointment_date, b.start_time;
END;
$$;

-- Create function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings
  SET 
    reminder_sent_at = NOW(),
    reminder_send_count = COALESCE(reminder_send_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_booking_id
  AND status = 'confirmed'
  AND reminder_sent_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create a more flexible function that can be called at any time
-- This is better for cron jobs that might run at different times
CREATE OR REPLACE FUNCTION get_bookings_needing_reminder(
  p_hours_before integer DEFAULT 24,
  p_window_minutes integer DEFAULT 60
)
RETURNS TABLE (
  booking_id uuid,
  customer_id uuid,
  service_id uuid,
  staff_id uuid,
  room_id integer,
  appointment_date date,
  start_time time,
  end_time time,
  duration integer,
  total_price numeric,
  final_price numeric,
  notes text,
  booking_type text,
  appointment_datetime timestamptz,
  hours_until_appointment numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.customer_id,
    b.service_id,
    b.staff_id,
    b.room_id,
    b.appointment_date,
    b.start_time::time,
    b.end_time::time,
    b.duration,
    b.total_price,
    b.final_price,
    b.notes,
    b.booking_type,
    (b.appointment_date + b.start_time::time)::timestamptz as appointment_datetime,
    EXTRACT(EPOCH FROM ((b.appointment_date + b.start_time::time)::timestamptz - NOW())) / 3600 as hours_until_appointment
  FROM bookings b
  WHERE 
    -- Booking is confirmed
    b.status = 'confirmed'
    -- Reminder hasn't been sent yet
    AND b.reminder_sent_at IS NULL
    -- Appointment is within the specified window
    AND (b.appointment_date + b.start_time::time)::timestamptz BETWEEN 
      NOW() + INTERVAL '1 hour' * (p_hours_before - (p_window_minutes::numeric / 60))
      AND NOW() + INTERVAL '1 hour' * (p_hours_before + (p_window_minutes::numeric / 60))
  ORDER BY b.appointment_date, b.start_time;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_bookings_for_24hr_reminder() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_reminder_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bookings_needing_reminder(integer, integer) TO authenticated;