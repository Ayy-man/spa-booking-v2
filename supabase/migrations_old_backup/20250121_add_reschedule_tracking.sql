-- Add reschedule tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS rescheduled_from uuid REFERENCES public.bookings(id),
ADD COLUMN IF NOT EXISTS rescheduled_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_appointment_date date,
ADD COLUMN IF NOT EXISTS original_start_time time without time zone,
ADD COLUMN IF NOT EXISTS last_rescheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reschedule_reason text;

-- Create reschedule_history table for tracking all reschedule events
CREATE TABLE IF NOT EXISTS public.reschedule_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  new_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  old_appointment_date date NOT NULL,
  old_start_time time without time zone NOT NULL,
  old_end_time time without time zone NOT NULL,
  new_appointment_date date NOT NULL,
  new_start_time time without time zone NOT NULL,
  new_end_time time without time zone NOT NULL,
  old_staff_id text REFERENCES public.staff(id),
  new_staff_id text REFERENCES public.staff(id),
  old_room_id integer REFERENCES public.rooms(id),
  new_room_id integer REFERENCES public.rooms(id),
  reason text,
  rescheduled_by text, -- 'customer' or 'admin' or staff name
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reschedule_history_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled_from ON public.bookings(rescheduled_from);
CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled_count ON public.bookings(rescheduled_count) WHERE rescheduled_count > 0;
CREATE INDEX IF NOT EXISTS idx_reschedule_history_original_booking ON public.reschedule_history(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_new_booking ON public.reschedule_history(new_booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_created_at ON public.reschedule_history(created_at DESC);

-- Add trigger to automatically track original appointment details
CREATE OR REPLACE FUNCTION track_original_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set original details on first reschedule
  IF NEW.rescheduled_from IS NOT NULL AND OLD.rescheduled_from IS NULL THEN
    NEW.original_appointment_date = OLD.appointment_date;
    NEW.original_start_time = OLD.start_time;
    NEW.rescheduled_count = COALESCE(OLD.rescheduled_count, 0) + 1;
    NEW.last_rescheduled_at = now();
  ELSIF NEW.rescheduled_from IS NOT NULL AND OLD.rescheduled_from IS NOT NULL THEN
    -- Increment count on subsequent reschedules
    NEW.rescheduled_count = COALESCE(OLD.rescheduled_count, 0) + 1;
    NEW.last_rescheduled_at = now();
    -- Keep original appointment details from first reschedule
    NEW.original_appointment_date = OLD.original_appointment_date;
    NEW.original_start_time = OLD.original_start_time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking original appointments
DROP TRIGGER IF EXISTS track_original_appointment_trigger ON public.bookings;
CREATE TRIGGER track_original_appointment_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.rescheduled_from IS NOT NULL)
EXECUTE FUNCTION track_original_appointment();

-- Function to get reschedule history for a booking
CREATE OR REPLACE FUNCTION get_booking_reschedule_history(p_booking_id uuid)
RETURNS TABLE (
  reschedule_date timestamp with time zone,
  old_date date,
  old_time time,
  new_date date,
  new_time time,
  reason text,
  rescheduled_by text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rh.created_at as reschedule_date,
    rh.old_appointment_date as old_date,
    rh.old_start_time as old_time,
    rh.new_appointment_date as new_date,
    rh.new_start_time as new_time,
    rh.reason,
    rh.rescheduled_by
  FROM reschedule_history rh
  WHERE rh.original_booking_id = p_booking_id
     OR rh.new_booking_id = p_booking_id
  ORDER BY rh.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a booking can be rescheduled
CREATE OR REPLACE FUNCTION can_reschedule_booking(p_booking_id uuid)
RETURNS TABLE (
  can_reschedule boolean,
  reason text
) AS $$
DECLARE
  v_booking RECORD;
  v_current_time timestamp with time zone;
BEGIN
  -- Get current Guam time
  v_current_time = now() AT TIME ZONE 'Pacific/Guam';
  
  -- Get booking details
  SELECT 
    b.*,
    b.appointment_date + b.start_time as appointment_datetime
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id;
  
  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found';
    RETURN;
  END IF;
  
  -- Check booking status
  IF v_booking.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN QUERY SELECT false, 'Cannot reschedule ' || v_booking.status || ' bookings';
    RETURN;
  END IF;
  
  -- Check reschedule count limit (max 3 reschedules)
  IF v_booking.rescheduled_count >= 3 THEN
    RETURN QUERY SELECT false, 'Maximum reschedule limit (3) reached';
    RETURN;
  END IF;
  
  -- Check if appointment is within 2 hours
  IF v_booking.appointment_datetime - v_current_time < interval '2 hours' THEN
    RETURN QUERY SELECT false, 'Cannot reschedule within 2 hours of appointment';
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Booking can be rescheduled';
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE public.reschedule_history IS 'Tracks all booking reschedule events for audit and customer service purposes';
COMMENT ON COLUMN public.bookings.rescheduled_from IS 'References the original booking if this is a rescheduled appointment';
COMMENT ON COLUMN public.bookings.rescheduled_count IS 'Number of times this booking has been rescheduled';
COMMENT ON COLUMN public.bookings.original_appointment_date IS 'The original appointment date before any reschedules';
COMMENT ON COLUMN public.bookings.original_start_time IS 'The original appointment time before any reschedules';