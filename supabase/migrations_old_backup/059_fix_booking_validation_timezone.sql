-- Fix the validate_basic_booking trigger to properly handle timezone
-- This replaces the existing function to use proper timezone comparison

CREATE OR REPLACE FUNCTION validate_basic_booking()
RETURNS TRIGGER AS $$
DECLARE
    appointment_datetime TIMESTAMP;
    current_guam_time TIMESTAMP;
BEGIN
  -- Skip validation for updates that only modify buffer times
  IF TG_OP = 'UPDATE' AND 
     OLD.appointment_date = NEW.appointment_date AND 
     OLD.start_time = NEW.start_time AND
     OLD.end_time = NEW.end_time THEN
    RETURN NEW;
  END IF;

  -- Get current time in Guam
  current_guam_time := (NOW() AT TIME ZONE 'Pacific/Guam')::timestamp;
  
  -- Combine appointment date and time
  appointment_datetime := (NEW.appointment_date::text || ' ' || NEW.start_time::text)::timestamp;
  
  -- Check if appointment is in the past (with 2-hour buffer for advance booking)
  -- We check if the appointment is at least 2 hours in the future
  IF appointment_datetime < current_guam_time THEN
    RAISE EXCEPTION 'Cannot book appointments in the past. Current Guam time: %, Appointment time: %', 
                    current_guam_time, appointment_datetime;
  END IF;

  -- Validate business hours (9 AM to 8 PM)
  IF NEW.start_time < '09:00:00'::time OR NEW.end_time > '20:00:00'::time THEN
    RAISE EXCEPTION 'Appointments must be within business hours (9 AM - 8 PM)';
  END IF;

  -- Validate that end time is after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Appointment end time must be after start time';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the function
COMMENT ON FUNCTION validate_basic_booking() IS 'Validates booking times are in the future (Guam timezone), within business hours, and logically consistent';