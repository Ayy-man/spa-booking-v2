-- ============================================
-- STAFF MANAGEMENT - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Staff management system with schedule blocks and tracking
-- Created: 2025-01-31
-- Consolidates: Staff additions, schedule blocks, and staff tracking

-- ============================================
-- SECTION 1: STAFF UPDATES AND ADDITIONS
-- ============================================

-- Add new staff members (Phuong and Bosque)
-- Note: Using INSERT ... ON CONFLICT to handle existing records safely

INSERT INTO staff (id, name, email, phone, is_active, specialties, created_at, updated_at) 
VALUES 
  ('phuong', 'Phuong', 'phuong@spa.com', NULL, TRUE, ARRAY['massage', 'facial'], NOW(), NOW()),
  ('bosque', 'Bosque', 'bosque@spa.com', NULL, TRUE, ARRAY['massage', 'facial'], NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  specialties = EXCLUDED.specialties,
  updated_at = NOW();

-- ============================================
-- SECTION 2: SCHEDULE BLOCKS SYSTEM
-- ============================================

-- Create schedule_blocks table for staff availability management
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('full_day', 'time_range')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for single day blocks
  start_time TIME WITHOUT TIME ZONE, -- NULL for full day blocks
  end_time TIME WITHOUT TIME ZONE, -- NULL for full day blocks
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT schedule_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_blocks_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT schedule_blocks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  
  -- Ensure end_date is after or equal to start_date
  CONSTRAINT schedule_blocks_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  
  -- Ensure time fields are both provided or both null based on block_type
  CONSTRAINT schedule_blocks_time_check CHECK (
    (block_type = 'full_day' AND start_time IS NULL AND end_time IS NULL) OR
    (block_type = 'time_range' AND start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  
  -- Ensure end_time is after start_time for time ranges
  CONSTRAINT schedule_blocks_time_order_check CHECK (
    block_type = 'full_day' OR end_time > start_time
  )
);

-- Create indexes for efficient querying of schedule blocks
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_staff_id ON public.schedule_blocks(staff_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dates ON public.schedule_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_staff_date ON public.schedule_blocks(staff_id, start_date);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_type ON public.schedule_blocks(block_type);

-- Enable RLS (Row Level Security) on schedule_blocks
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schedule_blocks
CREATE POLICY "schedule_blocks_viewable_by_all" ON public.schedule_blocks
  FOR SELECT
  USING (TRUE);

CREATE POLICY "schedule_blocks_admin_manage" ON public.schedule_blocks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = TRUE
    )
  );

-- ============================================
-- SECTION 3: STAFF REASSIGNMENT TRACKING
-- ============================================

-- Add staff reassignment tracking to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS original_staff_id TEXT,
ADD COLUMN IF NOT EXISTS reassignment_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reassigned_by UUID;

-- Add foreign key constraint for original_staff_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_original_staff_id_fkey'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_original_staff_id_fkey 
        FOREIGN KEY (original_staff_id) REFERENCES staff(id);
    END IF;
END $$;

-- Add foreign key constraint for reassigned_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_reassigned_by_fkey'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_reassigned_by_fkey 
        FOREIGN KEY (reassigned_by) REFERENCES auth.users(id);
    END IF;
END $$;

-- Create index for staff reassignment tracking
CREATE INDEX IF NOT EXISTS idx_bookings_reassignment ON bookings(original_staff_id, reassigned_at) WHERE original_staff_id IS NOT NULL;

-- ============================================
-- SECTION 4: STAFF AVAILABILITY FUNCTIONS
-- ============================================

-- Function to check if staff member is available at a given time
CREATE OR REPLACE FUNCTION is_staff_available(
    p_staff_id TEXT,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_blocked BOOLEAN := FALSE;
BEGIN
    -- Check for full day blocks
    SELECT TRUE INTO v_is_blocked
    FROM schedule_blocks sb
    WHERE sb.staff_id = p_staff_id
    AND sb.block_type = 'full_day'
    AND p_date >= sb.start_date
    AND (sb.end_date IS NULL OR p_date <= sb.end_date)
    LIMIT 1;
    
    IF v_is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Check for time range blocks
    SELECT TRUE INTO v_is_blocked
    FROM schedule_blocks sb
    WHERE sb.staff_id = p_staff_id
    AND sb.block_type = 'time_range'
    AND p_date >= sb.start_date
    AND (sb.end_date IS NULL OR p_date <= sb.end_date)
    AND (
        -- Requested time overlaps with blocked time
        (p_start_time < sb.end_time AND p_end_time > sb.start_time)
    )
    LIMIT 1;
    
    IF v_is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Check for existing bookings
    SELECT TRUE INTO v_is_blocked
    FROM bookings b
    WHERE b.staff_id = p_staff_id
    AND b.appointment_date = p_date
    AND b.status != 'cancelled'
    AND (
        -- Requested time overlaps with existing booking
        (p_start_time < b.end_time AND p_end_time > b.start_time)
    )
    LIMIT 1;
    
    RETURN NOT COALESCE(v_is_blocked, FALSE);
END;
$$;

-- Function to get staff availability for a date range
CREATE OR REPLACE FUNCTION get_staff_availability(
    p_staff_id TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    date DATE,
    is_available BOOLEAN,
    blocked_periods JSONB,
    booked_periods JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_date DATE := p_start_date;
    v_blocked_periods JSONB;
    v_booked_periods JSONB;
    v_is_available BOOLEAN;
BEGIN
    WHILE v_current_date <= p_end_date LOOP
        -- Get blocked periods for the day
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'type', sb.block_type,
                'start_time', sb.start_time,
                'end_time', sb.end_time,
                'reason', sb.reason
            )
        ), '[]'::jsonb) INTO v_blocked_periods
        FROM schedule_blocks sb
        WHERE sb.staff_id = p_staff_id
        AND v_current_date >= sb.start_date
        AND (sb.end_date IS NULL OR v_current_date <= sb.end_date);
        
        -- Get booked periods for the day
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'booking_id', b.id,
                'start_time', b.start_time,
                'end_time', b.end_time,
                'service_name', s.name,
                'customer_name', get_customer_full_name(c.first_name, c.last_name)
            )
        ), '[]'::jsonb) INTO v_booked_periods
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN customers c ON b.customer_id = c.id
        WHERE b.staff_id = p_staff_id
        AND b.appointment_date = v_current_date
        AND b.status != 'cancelled';
        
        -- Determine if staff is available (not fully blocked)
        v_is_available := NOT EXISTS (
            SELECT 1 FROM schedule_blocks sb
            WHERE sb.staff_id = p_staff_id
            AND sb.block_type = 'full_day'
            AND v_current_date >= sb.start_date
            AND (sb.end_date IS NULL OR v_current_date <= sb.end_date)
        );
        
        RETURN QUERY SELECT 
            v_current_date,
            v_is_available,
            v_blocked_periods,
            v_booked_periods;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END;
$$;

-- Function to reassign staff for a booking
CREATE OR REPLACE FUNCTION reassign_booking_staff(
    p_booking_id UUID,
    p_new_staff_id TEXT,
    p_reason TEXT DEFAULT NULL,
    p_reassigned_by UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    old_staff_id TEXT,
    new_staff_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_record bookings%ROWTYPE;
    v_old_staff_id TEXT;
    v_conflicts INTEGER := 0;
BEGIN
    -- Get the booking details
    SELECT * INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Booking not found', NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if booking is cancelled
    IF v_booking_record.status = 'cancelled' THEN
        RETURN QUERY SELECT FALSE, 'Cannot reassign cancelled booking', NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    v_old_staff_id := v_booking_record.staff_id;
    
    -- Check if new staff member exists
    IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_new_staff_id AND is_active = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'New staff member not found or inactive', v_old_staff_id, p_new_staff_id;
        RETURN;
    END IF;
    
    -- Check if new staff is available
    IF NOT is_staff_available(
        p_new_staff_id,
        v_booking_record.appointment_date,
        v_booking_record.start_time,
        v_booking_record.end_time
    ) THEN
        RETURN QUERY SELECT FALSE, 'New staff member is not available at this time', v_old_staff_id, p_new_staff_id;
        RETURN;
    END IF;
    
    -- Update the booking
    UPDATE bookings 
    SET 
        staff_id = p_new_staff_id,
        original_staff_id = COALESCE(original_staff_id, v_old_staff_id),
        reassignment_reason = p_reason,
        reassigned_at = NOW(),
        reassigned_by = p_reassigned_by,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN QUERY SELECT 
        TRUE, 
        'Staff reassignment successful',
        v_old_staff_id,
        p_new_staff_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Error reassigning staff: ' || SQLERRM,
            v_old_staff_id,
            p_new_staff_id;
END;
$$;

-- ============================================
-- SECTION 5: SCHEDULE BLOCK MANAGEMENT
-- ============================================

-- Function to create schedule blocks
CREATE OR REPLACE FUNCTION create_schedule_block(
    p_staff_id TEXT,
    p_block_type TEXT,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL,
    p_end_time TIME DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    block_id UUID,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_block_id UUID;
    v_conflicting_bookings INTEGER := 0;
BEGIN
    -- Validate staff exists
    IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_staff_id AND is_active = TRUE) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Staff member not found or inactive';
        RETURN;
    END IF;
    
    -- Validate block type and time parameters
    IF p_block_type = 'full_day' AND (p_start_time IS NOT NULL OR p_end_time IS NOT NULL) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Full day blocks cannot have time ranges';
        RETURN;
    END IF;
    
    IF p_block_type = 'time_range' AND (p_start_time IS NULL OR p_end_time IS NULL) THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Time range blocks must have both start and end times';
        RETURN;
    END IF;
    
    IF p_block_type = 'time_range' AND p_end_time <= p_start_time THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'End time must be after start time';
        RETURN;
    END IF;
    
    -- Check for conflicting bookings
    IF p_block_type = 'full_day' THEN
        SELECT COUNT(*) INTO v_conflicting_bookings
        FROM bookings b
        WHERE b.staff_id = p_staff_id
        AND b.appointment_date >= p_start_date
        AND b.appointment_date <= COALESCE(p_end_date, p_start_date)
        AND b.status != 'cancelled';
    ELSE
        SELECT COUNT(*) INTO v_conflicting_bookings
        FROM bookings b
        WHERE b.staff_id = p_staff_id
        AND b.appointment_date >= p_start_date
        AND b.appointment_date <= COALESCE(p_end_date, p_start_date)
        AND b.status != 'cancelled'
        AND b.start_time < p_end_time
        AND b.end_time > p_start_time;
    END IF;
    
    IF v_conflicting_bookings > 0 THEN
        RETURN QUERY SELECT 
            NULL::UUID, 
            FALSE, 
            'Cannot create block: ' || v_conflicting_bookings || ' conflicting booking(s) exist';
        RETURN;
    END IF;
    
    -- Create the schedule block
    INSERT INTO schedule_blocks (
        staff_id,
        block_type,
        start_date,
        end_date,
        start_time,
        end_time,
        reason,
        created_by
    ) VALUES (
        p_staff_id,
        p_block_type,
        p_start_date,
        p_end_date,
        p_start_time,
        p_end_time,
        p_reason,
        auth.uid()
    ) RETURNING id INTO v_block_id;
    
    RETURN QUERY SELECT 
        v_block_id,
        TRUE,
        'Schedule block created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'Error creating schedule block: ' || SQLERRM;
END;
$$;

-- ============================================
-- SECTION 6: TRIGGER FUNCTIONS
-- ============================================

-- Add trigger to update updated_at timestamp for schedule_blocks
CREATE OR REPLACE FUNCTION handle_schedule_block_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_blocks_updated_at ON schedule_blocks;
CREATE TRIGGER schedule_blocks_updated_at
    BEFORE UPDATE ON schedule_blocks
    FOR EACH ROW
    EXECUTE FUNCTION handle_schedule_block_updated_at();

-- ============================================
-- SECTION 7: PERMISSIONS AND GRANTS
-- ============================================

-- Grant permissions on schedule_blocks table
GRANT ALL ON public.schedule_blocks TO authenticated;
GRANT SELECT ON public.schedule_blocks TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_staff_available TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff_available TO anon;
GRANT EXECUTE ON FUNCTION get_staff_availability TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_availability TO anon;
GRANT EXECUTE ON FUNCTION reassign_booking_staff TO authenticated;
GRANT EXECUTE ON FUNCTION create_schedule_block TO authenticated;

-- ============================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON TABLE schedule_blocks IS 
'Stores staff schedule blocks for time off, breaks, and unavailability. Supports both full-day and time-range blocks.';

COMMENT ON COLUMN schedule_blocks.block_type IS 
'Type of block: "full_day" for entire days off, "time_range" for specific hours';

COMMENT ON COLUMN schedule_blocks.start_date IS 
'Start date of the block period';

COMMENT ON COLUMN schedule_blocks.end_date IS 
'End date for multi-day blocks, NULL for single day blocks';

COMMENT ON COLUMN schedule_blocks.start_time IS 
'Start time for time_range blocks, NULL for full_day blocks';

COMMENT ON COLUMN schedule_blocks.end_time IS 
'End time for time_range blocks, NULL for full_day blocks';

COMMENT ON COLUMN bookings.original_staff_id IS 
'Original staff member assigned to booking before any reassignments';

COMMENT ON COLUMN bookings.reassignment_reason IS 
'Reason provided for staff reassignment';

COMMENT ON COLUMN bookings.reassigned_at IS 
'Timestamp when staff was reassigned';

COMMENT ON COLUMN bookings.reassigned_by IS 
'User ID who performed the staff reassignment';

COMMENT ON FUNCTION is_staff_available IS 
'Checks if a staff member is available at a specific date/time, considering blocks and existing bookings';

COMMENT ON FUNCTION get_staff_availability IS 
'Returns detailed availability information for a staff member over a date range';

COMMENT ON FUNCTION reassign_booking_staff IS 
'Safely reassigns a booking to a different staff member with availability checking and audit trail';

COMMENT ON FUNCTION create_schedule_block IS 
'Creates schedule blocks for staff unavailability with conflict detection';