-- Fix reminder function to be more robust and prevent duplicate sends
-- This migration improves the cron job reliability

-- Drop the old function first
DROP FUNCTION IF EXISTS get_bookings_for_24hr_reminder();

-- Create improved function with better logic
CREATE OR REPLACE FUNCTION get_bookings_needing_reminder(
  p_hours_before integer DEFAULT 24,
  p_window_minutes integer DEFAULT 120  -- Increased window to 2 hours for daily cron
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
    -- Reminder hasn't been sent yet (prevent duplicates)
    AND b.reminder_sent_at IS NULL
    -- Reminder count is 0 or null (additional safety)
    AND COALESCE(b.reminder_send_count, 0) = 0
    -- Appointment is within the specified window (24 hours ± 2 hours)
    AND (b.appointment_date + b.start_time::time)::timestamptz BETWEEN 
      NOW() + INTERVAL '1 hour' * (p_hours_before - (p_window_minutes::numeric / 60))
      AND NOW() + INTERVAL '1 hour' * (p_hours_before + (p_window_minutes::numeric / 60))
    -- Additional safety: appointment is in the future
    AND (b.appointment_date + b.start_time::time)::timestamptz > NOW()
  ORDER BY b.appointment_date, b.start_time;
END;
$$;

-- Improve the mark_reminder_sent function with better error handling
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_exists boolean;
BEGIN
  -- Check if booking exists and is eligible for reminder
  SELECT EXISTS(
    SELECT 1 FROM bookings 
    WHERE id = p_booking_id 
    AND status = 'confirmed' 
    AND reminder_sent_at IS NULL
  ) INTO booking_exists;
  
  IF NOT booking_exists THEN
    RETURN false;
  END IF;

  -- Update the booking
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

-- Create a function to check cron job health
CREATE OR REPLACE FUNCTION check_reminder_system_health()
RETURNS TABLE (
  total_confirmed_bookings integer,
  bookings_with_reminders integer,
  bookings_needing_reminders integer,
  last_reminder_sent timestamptz,
  system_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE b.status = 'confirmed') as total_confirmed_bookings,
    COUNT(*) FILTER (WHERE b.reminder_sent_at IS NOT NULL) as bookings_with_reminders,
    COUNT(*) FILTER (WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL) as bookings_needing_reminders,
    MAX(b.reminder_sent_at) as last_reminder_sent,
    CASE 
      WHEN COUNT(*) FILTER (WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL) > 0 
      THEN 'Reminders pending'
      ELSE 'All reminders sent'
    END as system_status
  FROM bookings b
  WHERE b.appointment_date >= CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_bookings_needing_reminder(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_reminder_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_reminder_system_health() TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_optimized 
ON public.bookings(appointment_date, start_time, status, reminder_sent_at, reminder_send_count) 
WHERE status = 'confirmed' AND reminder_sent_at IS NULL; 