-- Add staff reassignment tracking to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS last_staff_change_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS staff_change_count INTEGER DEFAULT 0;

-- Create staff assignment history table for audit trail
CREATE TABLE IF NOT EXISTS staff_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  old_staff_id TEXT,
  new_staff_id TEXT,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  -- Include service and time for context
  service_id TEXT,
  appointment_date DATE,
  appointment_time TIME,
  CONSTRAINT staff_assignment_history_booking_fk 
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT staff_assignment_history_old_staff_fk 
    FOREIGN KEY (old_staff_id) REFERENCES staff(id),
  CONSTRAINT staff_assignment_history_new_staff_fk 
    FOREIGN KEY (new_staff_id) REFERENCES staff(id),
  CONSTRAINT staff_assignment_history_service_fk
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_staff_assignment_history_booking 
  ON staff_assignment_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_history_date 
  ON staff_assignment_history(appointment_date);

-- Function to check if staff can be reassigned for a booking
CREATE OR REPLACE FUNCTION can_reassign_staff(
  p_booking_id UUID,
  p_new_staff_id TEXT
) RETURNS TABLE(
  can_reassign BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_booking RECORD;
  v_service RECORD;
  v_new_staff RECORD;
  v_conflicts INTEGER;
  v_can_perform BOOLEAN;
BEGIN
  -- Get booking details
  SELECT b.*, s.category as service_category, s.name as service_name
  INTO v_booking
  FROM bookings b
  JOIN services s ON b.service_id = s.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found';
    RETURN;
  END IF;
  
  -- Check if booking is in valid status
  IF v_booking.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN QUERY SELECT FALSE, 'Cannot reassign staff for ' || v_booking.status || ' booking';
    RETURN;
  END IF;
  
  -- Check if within 2 hours of appointment (using Guam time)
  IF v_booking.appointment_date = CURRENT_DATE AND 
     v_booking.start_time <= (CURRENT_TIME + INTERVAL '2 hours') THEN
    RETURN QUERY SELECT FALSE, 'Cannot reassign staff within 2 hours of appointment';
    RETURN;
  END IF;
  
  -- If new staff is 'any', always allow
  IF p_new_staff_id = 'any' THEN
    RETURN QUERY SELECT TRUE, 'Can assign to any available staff';
    RETURN;
  END IF;
  
  -- Get new staff details
  SELECT * INTO v_new_staff
  FROM staff
  WHERE id = p_new_staff_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Staff member not found or inactive';
    RETURN;
  END IF;
  
  -- Check if staff can perform the service
  -- Check capabilities array
  IF NOT (v_booking.service_category = ANY(v_new_staff.capabilities)) THEN
    -- Special case for packages - check if staff can do any component
    IF v_booking.service_category = 'package' THEN
      -- If service name contains massage and staff can do massages, allow
      IF v_booking.service_name ILIKE '%massage%' AND 'massages' = ANY(v_new_staff.capabilities) THEN
        v_can_perform := TRUE;
      -- If service name contains facial and staff can do facials, allow
      ELSIF v_booking.service_name ILIKE '%facial%' AND 'facials' = ANY(v_new_staff.capabilities) THEN
        v_can_perform := TRUE;
      ELSE
        v_can_perform := FALSE;
      END IF;
    ELSE
      v_can_perform := FALSE;
    END IF;
    
    IF NOT v_can_perform THEN
      RETURN QUERY SELECT FALSE, 'Staff cannot perform this service';
      RETURN;
    END IF;
  END IF;
  
  -- Check service exclusions
  IF v_new_staff.service_exclusions IS NOT NULL THEN
    -- Check if service is excluded
    IF v_booking.service_name ILIKE ANY(
      SELECT '%' || REPLACE(unnest(v_new_staff.service_exclusions), '_', ' ') || '%'
    ) THEN
      RETURN QUERY SELECT FALSE, 'Staff has exclusion for this service';
      RETURN;
    END IF;
  END IF;
  
  -- Check if staff works on this day
  IF NOT (EXTRACT(DOW FROM v_booking.appointment_date)::INTEGER = ANY(v_new_staff.work_days)) THEN
    RETURN QUERY SELECT FALSE, 'Staff does not work on this day';
    RETURN;
  END IF;
  
  -- Check for scheduling conflicts
  SELECT COUNT(*) INTO v_conflicts
  FROM bookings
  WHERE staff_id = p_new_staff_id
    AND appointment_date = v_booking.appointment_date
    AND status NOT IN ('cancelled')
    AND id != p_booking_id
    AND (
      (start_time <= v_booking.start_time AND end_time > v_booking.start_time) OR
      (start_time < v_booking.end_time AND end_time >= v_booking.end_time) OR
      (start_time >= v_booking.start_time AND end_time <= v_booking.end_time)
    );
  
  IF v_conflicts > 0 THEN
    RETURN QUERY SELECT FALSE, 'Staff has conflicting appointment at this time';
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'Staff can be reassigned';
END;
$$ LANGUAGE plpgsql;

-- Function to get available staff for a specific time slot
CREATE OR REPLACE FUNCTION get_available_staff_for_slot(
  p_booking_id UUID
) RETURNS TABLE(
  staff_id TEXT,
  staff_name TEXT,
  can_perform BOOLEAN,
  is_available BOOLEAN,
  conflict_reason TEXT
) AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Get booking details
  SELECT b.*, s.category as service_category, s.name as service_name
  INTO v_booking
  FROM bookings b
  JOIN services s ON b.service_id = s.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Return all active staff with their availability status
  RETURN QUERY
  WITH staff_availability AS (
    SELECT 
      s.id,
      s.name,
      -- Check if staff can perform service
      CASE 
        WHEN s.id = 'any' THEN TRUE
        WHEN v_booking.service_category = ANY(s.capabilities) THEN TRUE
        WHEN v_booking.service_category = 'package' AND 
             (v_booking.service_name ILIKE '%massage%' AND 'massages' = ANY(s.capabilities)) THEN TRUE
        WHEN v_booking.service_category = 'package' AND 
             (v_booking.service_name ILIKE '%facial%' AND 'facials' = ANY(s.capabilities)) THEN TRUE
        ELSE FALSE
      END as can_perform_service,
      -- Check if staff works on this day
      CASE 
        WHEN s.id = 'any' THEN TRUE
        WHEN EXTRACT(DOW FROM v_booking.appointment_date)::INTEGER = ANY(s.work_days) THEN TRUE
        ELSE FALSE
      END as works_on_day,
      -- Check for conflicts
      CASE 
        WHEN s.id = 'any' THEN FALSE
        WHEN EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.staff_id = s.id
            AND b2.appointment_date = v_booking.appointment_date
            AND b2.status NOT IN ('cancelled')
            AND b2.id != p_booking_id
            AND (
              (b2.start_time <= v_booking.start_time AND b2.end_time > v_booking.start_time) OR
              (b2.start_time < v_booking.end_time AND b2.end_time >= v_booking.end_time) OR
              (b2.start_time >= v_booking.start_time AND b2.end_time <= v_booking.end_time)
            )
        ) THEN TRUE
        ELSE FALSE
      END as has_conflict,
      -- Check service exclusions
      CASE
        WHEN s.id = 'any' THEN FALSE
        WHEN s.service_exclusions IS NOT NULL AND 
             v_booking.service_name ILIKE ANY(
               SELECT '%' || REPLACE(unnest(s.service_exclusions), '_', ' ') || '%'
             ) THEN TRUE
        ELSE FALSE
      END as has_exclusion
    FROM staff s
    WHERE s.is_active = true
  )
  SELECT 
    id as staff_id,
    name as staff_name,
    can_perform_service as can_perform,
    (can_perform_service AND works_on_day AND NOT has_conflict AND NOT has_exclusion) as is_available,
    CASE
      WHEN NOT can_perform_service THEN 'Cannot perform this service'
      WHEN NOT works_on_day THEN 'Does not work on this day'
      WHEN has_conflict THEN 'Has conflicting appointment'
      WHEN has_exclusion THEN 'Service excluded for this staff'
      ELSE NULL
    END as conflict_reason
  FROM staff_availability
  ORDER BY 
    CASE WHEN id = v_booking.staff_id THEN 0 ELSE 1 END, -- Current staff first
    CASE WHEN id = 'any' THEN 1 ELSE 0 END, -- 'Any' at the end
    name;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update staff change tracking when staff_id changes
CREATE OR REPLACE FUNCTION track_staff_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if staff_id actually changed
  IF OLD.staff_id IS DISTINCT FROM NEW.staff_id THEN
    -- Update tracking columns
    NEW.last_staff_change_at = NOW();
    NEW.staff_change_count = COALESCE(OLD.staff_change_count, 0) + 1;
    
    -- Insert into history table
    INSERT INTO staff_assignment_history (
      booking_id,
      old_staff_id,
      new_staff_id,
      changed_by,
      reason,
      service_id,
      appointment_date,
      appointment_time
    ) VALUES (
      NEW.id,
      OLD.staff_id,
      NEW.staff_id,
      COALESCE(current_setting('app.current_user', true), 'system'),
      COALESCE(current_setting('app.reassignment_reason', true), 'Staff reassigned'),
      NEW.service_id,
      NEW.appointment_date,
      NEW.start_time
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for staff reassignment tracking
DROP TRIGGER IF EXISTS track_staff_reassignment_trigger ON bookings;
CREATE TRIGGER track_staff_reassignment_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.staff_id IS DISTINCT FROM NEW.staff_id)
  EXECUTE FUNCTION track_staff_reassignment();

-- Grant necessary permissions
GRANT SELECT ON staff_assignment_history TO authenticated;
GRANT INSERT ON staff_assignment_history TO authenticated;
GRANT EXECUTE ON FUNCTION can_reassign_staff TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_for_slot TO authenticated;