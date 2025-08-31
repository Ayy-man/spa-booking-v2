-- Core Schema Setup and Essential Updates
-- This migration consolidates all core schema improvements and essential updates

-- ============================================
-- PART 1: CORE SCHEMA IMPROVEMENTS
-- ============================================

-- Make last_name optional for customers (single-name support)
ALTER TABLE customers 
ALTER COLUMN last_name DROP NOT NULL;

-- Add phone formatting support
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS phone_formatted TEXT 
GENERATED ALWAYS AS (
  CASE 
    WHEN phone ~ '^\d{10}$' THEN 
      '(' || SUBSTRING(phone FROM 1 FOR 3) || ') ' || 
      SUBSTRING(phone FROM 4 FOR 3) || '-' || 
      SUBSTRING(phone FROM 7 FOR 4)
    WHEN phone ~ '^\d{3}-\d{3}-\d{4}$' THEN 
      '(' || SUBSTRING(phone FROM 1 FOR 3) || ') ' || 
      SUBSTRING(phone FROM 5 FOR 3) || '-' || 
      SUBSTRING(phone FROM 9 FOR 4)
    ELSE phone
  END
) STORED;

-- Add reschedule tracking columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES bookings(id),
ADD COLUMN IF NOT EXISTS rescheduled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_appointment_date DATE,
ADD COLUMN IF NOT EXISTS original_start_time TIME,
ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
ADD COLUMN IF NOT EXISTS last_staff_change_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS staff_change_count INTEGER DEFAULT 0;

-- ============================================
-- PART 2: BOOKING ERRORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS booking_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  booking_data JSONB NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  service_name TEXT,
  service_id TEXT,
  appointment_date DATE,
  appointment_time TIME,
  staff_name TEXT,
  staff_id TEXT,
  room_id INTEGER,
  is_couples_booking BOOLEAN DEFAULT FALSE,
  secondary_service_name TEXT,
  secondary_service_id TEXT,
  secondary_staff_name TEXT,
  secondary_staff_id TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for booking errors
CREATE INDEX IF NOT EXISTS idx_booking_errors_resolved ON booking_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_booking_errors_created_at ON booking_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_errors_error_type ON booking_errors(error_type);

-- ============================================
-- PART 3: RESCHEDULE HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reschedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_booking_id UUID NOT NULL REFERENCES bookings(id),
  new_booking_id UUID REFERENCES bookings(id),
  old_appointment_date DATE NOT NULL,
  old_start_time TIME NOT NULL,
  old_end_time TIME NOT NULL,
  new_appointment_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_end_time TIME NOT NULL,
  old_staff_id TEXT REFERENCES staff(id),
  new_staff_id TEXT REFERENCES staff(id),
  old_room_id INTEGER REFERENCES rooms(id),
  new_room_id INTEGER REFERENCES rooms(id),
  reason TEXT,
  rescheduled_by TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reschedule history
CREATE INDEX IF NOT EXISTS idx_reschedule_history_booking ON reschedule_history(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_history_date ON reschedule_history(created_at DESC);

-- ============================================
-- PART 4: WALK-IN SUPPORT
-- ============================================

ALTER TABLE walk_ins
ADD COLUMN IF NOT EXISTS couples_booking_id TEXT,
ADD COLUMN IF NOT EXISTS is_couples_booking BOOLEAN DEFAULT FALSE;

-- ============================================
-- PART 5: BOOKING STATUS AUTOMATION
-- ============================================

-- Function to update booking status based on time
CREATE OR REPLACE FUNCTION update_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm pending bookings after creation
  IF NEW.status = 'pending' AND OLD.status IS NULL THEN
    NEW.status = 'confirmed';
  END IF;
  
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status updates
DROP TRIGGER IF EXISTS booking_status_update_trigger ON bookings;
CREATE TRIGGER booking_status_update_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_status();

-- ============================================
-- PART 6: CANCEL BOOKING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_booking_exists BOOLEAN;
BEGIN
  -- Check if booking exists
  SELECT EXISTS(SELECT 1 FROM bookings WHERE id = p_booking_id) INTO v_booking_exists;
  
  IF NOT v_booking_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Booking not found'
    );
  END IF;
  
  -- Update booking status
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_cancellation_reason,
    updated_at = NOW()
  WHERE id = p_booking_id
    AND status != 'cancelled';
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Booking is already cancelled or could not be updated'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking cancelled successfully',
    'booking_id', p_booking_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: TIMEZONE-AWARE VALIDATION
-- ============================================

-- Function to validate booking times in Guam timezone
CREATE OR REPLACE FUNCTION validate_booking_time_guam(
  p_date DATE,
  p_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_guam_datetime TIMESTAMPTZ;
  v_guam_hour INTEGER;
BEGIN
  -- Convert to Guam time
  v_guam_datetime = (p_date::TEXT || ' ' || p_time::TEXT)::TIMESTAMP AT TIME ZONE 'Pacific/Guam';
  v_guam_hour = EXTRACT(HOUR FROM v_guam_datetime);
  
  -- Check if within business hours (9 AM - 8 PM Guam time)
  RETURN v_guam_hour >= 9 AND v_guam_hour < 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 8: INDEXES AND PERFORMANCE
-- ============================================

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule ON bookings(rescheduled_from) WHERE rescheduled_from IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE booking_errors IS 'Tracks all booking errors for debugging and customer support';
COMMENT ON TABLE reschedule_history IS 'Audit trail for all booking reschedules';
COMMENT ON FUNCTION cancel_booking IS 'Safely cancels a booking with proper status updates';
COMMENT ON FUNCTION validate_booking_time_guam IS 'Validates booking times are within Guam business hours';