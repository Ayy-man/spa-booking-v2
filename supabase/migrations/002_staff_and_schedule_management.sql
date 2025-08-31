-- Staff and Schedule Management System
-- This migration consolidates all staff-related functionality

-- ============================================
-- PART 1: SCHEDULE BLOCKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL REFERENCES staff(id),
  block_type TEXT NOT NULL CHECK (block_type IN ('full_day', 'time_range')),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_time_range CHECK (
    (block_type = 'full_day' AND start_time IS NULL AND end_time IS NULL) OR
    (block_type = 'time_range' AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Create indexes for schedule blocks
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_staff ON schedule_blocks(staff_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dates ON schedule_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_active ON schedule_blocks(start_date) WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- ============================================
-- PART 2: STAFF ASSIGNMENT HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS staff_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  old_staff_id TEXT REFERENCES staff(id),
  new_staff_id TEXT REFERENCES staff(id),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  service_id TEXT REFERENCES services(id),
  appointment_date DATE,
  appointment_time TIME,
  
  CONSTRAINT staff_assignment_history_booking_fk FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT staff_assignment_history_old_staff_fk FOREIGN KEY (old_staff_id) REFERENCES staff(id),
  CONSTRAINT staff_assignment_history_new_staff_fk FOREIGN KEY (new_staff_id) REFERENCES staff(id),
  CONSTRAINT staff_assignment_history_service_fk FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Create indexes for staff assignment history
CREATE INDEX IF NOT EXISTS idx_staff_assignment_booking ON staff_assignment_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_date ON staff_assignment_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_staff ON staff_assignment_history(old_staff_id, new_staff_id);

-- ============================================
-- PART 3: ADD NEW STAFF MEMBERS
-- ============================================

-- Add Phuong
INSERT INTO staff (
  id,
  name,
  email,
  phone,
  specialties,
  capabilities,
  work_days,
  role,
  initials,
  hourly_rate,
  is_active,
  default_start_time,
  default_end_time
) VALUES (
  'phuong',
  'Phuong',
  'phuong@dermalspa.com',
  '(671) 555-0106',
  'Expert in Asian skincare techniques, specializing in brightening treatments and acne management',
  ARRAY['facials', 'treatments']::service_category[],
  ARRAY[1, 3, 4, 5, 6]::INTEGER[], -- Mon, Wed, Thu, Fri, Sat
  'therapist',
  'PH',
  35.00,
  true,
  '09:00:00'::TIME,
  '18:00:00'::TIME
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capabilities = EXCLUDED.capabilities,
  work_days = EXCLUDED.work_days,
  is_active = EXCLUDED.is_active;

-- Add Bosque
INSERT INTO staff (
  id,
  name,
  email,
  phone,
  specialties,
  capabilities,
  work_days,
  role,
  initials,
  hourly_rate,
  is_active,
  default_start_time,
  default_end_time
) VALUES (
  'bosque',
  'Bosque',
  'bosque@dermalspa.com',
  '(671) 555-0107',
  'Holistic wellness specialist with expertise in therapeutic massage and energy healing',
  ARRAY['massages', 'treatments']::service_category[],
  ARRAY[2, 3, 4, 5, 0]::INTEGER[], -- Tue, Wed, Thu, Fri, Sun
  'therapist',
  'BQ',
  32.00,
  true,
  '10:00:00'::TIME,
  '19:00:00'::TIME
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capabilities = EXCLUDED.capabilities,
  work_days = EXCLUDED.work_days,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PART 4: STAFF AVAILABILITY FUNCTIONS
-- ============================================

-- Function to check if staff is available
CREATE OR REPLACE FUNCTION is_staff_available(
  p_staff_id TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_blocked BOOLEAN;
  v_day_of_week INTEGER;
  v_works_on_day BOOLEAN;
BEGIN
  -- Get day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week = EXTRACT(DOW FROM p_date);
  
  -- Check if staff works on this day
  SELECT v_day_of_week = ANY(work_days) 
  INTO v_works_on_day
  FROM staff 
  WHERE id = p_staff_id AND is_active = true;
  
  IF NOT v_works_on_day THEN
    RETURN FALSE;
  END IF;
  
  -- Check for schedule blocks
  SELECT EXISTS (
    SELECT 1 FROM schedule_blocks
    WHERE staff_id = p_staff_id
      AND p_date >= start_date
      AND (end_date IS NULL OR p_date <= end_date)
      AND (
        block_type = 'full_day' OR
        (block_type = 'time_range' AND 
         p_start_time < end_time AND 
         p_end_time > start_time)
      )
  ) INTO v_blocked;
  
  RETURN NOT v_blocked;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff schedule for a date
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_staff_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  available BOOLEAN,
  start_time TIME,
  end_time TIME,
  blocked_periods JSONB
) AS $$
DECLARE
  v_default_start TIME;
  v_default_end TIME;
  v_blocked_periods JSONB;
BEGIN
  -- Get default schedule
  SELECT default_start_time, default_end_time
  INTO v_default_start, v_default_end
  FROM staff
  WHERE id = p_staff_id;
  
  -- Get blocked periods
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'start', COALESCE(start_time, v_default_start),
        'end', COALESCE(end_time, v_default_end),
        'reason', reason
      )
    ),
    '[]'::JSONB
  )
  INTO v_blocked_periods
  FROM schedule_blocks
  WHERE staff_id = p_staff_id
    AND p_date >= start_date
    AND (end_date IS NULL OR p_date <= end_date);
  
  RETURN QUERY
  SELECT 
    is_staff_available(p_staff_id, p_date, v_default_start, v_default_end),
    v_default_start,
    v_default_end,
    v_blocked_periods;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 5: STAFF REASSIGNMENT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reassign_booking_staff(
  p_booking_id UUID,
  p_new_staff_id TEXT,
  p_changed_by TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_old_staff_id TEXT;
  v_service_id TEXT;
  v_appointment_date DATE;
  v_appointment_time TIME;
  v_result JSONB;
BEGIN
  -- Get current booking details
  SELECT staff_id, service_id, appointment_date, start_time
  INTO v_old_staff_id, v_service_id, v_appointment_date, v_appointment_time
  FROM bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Booking not found'
    );
  END IF;
  
  -- Update booking
  UPDATE bookings
  SET 
    staff_id = p_new_staff_id,
    last_staff_change_at = NOW(),
    staff_change_count = COALESCE(staff_change_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Record in history
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
    p_booking_id,
    v_old_staff_id,
    p_new_staff_id,
    p_changed_by,
    p_reason,
    v_service_id,
    v_appointment_date,
    v_appointment_time
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff reassigned successfully',
    'old_staff_id', v_old_staff_id,
    'new_staff_id', p_new_staff_id
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE schedule_blocks IS 'Manages staff availability blocks and time-off schedules';
COMMENT ON TABLE staff_assignment_history IS 'Audit trail for all staff reassignments';
COMMENT ON FUNCTION is_staff_available IS 'Checks if a staff member is available for a specific time slot';
COMMENT ON FUNCTION get_staff_schedule IS 'Returns complete schedule information for a staff member on a specific date';
COMMENT ON FUNCTION reassign_booking_staff IS 'Safely reassigns a booking to a different staff member with audit trail';