-- Migration: Add RPC function for proper booking cancellation
-- Purpose: Provide a direct way to cancel bookings with proper field updates
-- This bypasses TypeScript type limitations and ensures all fields are properly set

-- Create a function to cancel a booking with all proper fields
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL,
    p_cancelled_by TEXT DEFAULT 'admin'
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_booking_exists BOOLEAN;
    v_current_status TEXT;
BEGIN
    -- Check if booking exists and get current status
    SELECT EXISTS(
        SELECT 1 FROM public.bookings WHERE id = p_booking_id
    ) INTO v_booking_exists;
    
    IF NOT v_booking_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    -- Get current status
    SELECT status INTO v_current_status
    FROM public.bookings
    WHERE id = p_booking_id;
    
    -- Check if already cancelled
    IF v_current_status = 'cancelled' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking is already cancelled'
        );
    END IF;
    
    -- Update the booking with all cancellation fields
    UPDATE public.bookings
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = COALESCE(p_cancellation_reason, 'Cancelled by ' || p_cancelled_by),
        internal_notes = CASE 
            WHEN internal_notes IS NULL OR internal_notes = '' THEN
                'Cancelled: ' || COALESCE(p_cancellation_reason, 'Cancelled by ' || p_cancelled_by)
            ELSE
                'Cancelled: ' || COALESCE(p_cancellation_reason, 'Cancelled by ' || p_cancelled_by) || 
                E'\n\nPrevious notes: ' || internal_notes
        END,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Return success with booking details
    SELECT json_build_object(
        'success', true,
        'booking_id', id,
        'status', status,
        'cancelled_at', cancelled_at,
        'cancellation_reason', cancellation_reason
    ) INTO v_result
    FROM public.bookings
    WHERE id = p_booking_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark booking as completed
CREATE OR REPLACE FUNCTION complete_booking(
    p_booking_id UUID,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_booking_exists BOOLEAN;
    v_current_status TEXT;
BEGIN
    -- Check if booking exists
    SELECT EXISTS(
        SELECT 1 FROM public.bookings WHERE id = p_booking_id
    ) INTO v_booking_exists;
    
    IF NOT v_booking_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    -- Get current status
    SELECT status INTO v_current_status
    FROM public.bookings
    WHERE id = p_booking_id;
    
    -- Update the booking
    UPDATE public.bookings
    SET 
        status = 'completed',
        completed_at = NOW(),
        internal_notes = CASE 
            WHEN p_completion_notes IS NOT NULL THEN
                COALESCE(internal_notes || E'\n\n', '') || 'Completion note: ' || p_completion_notes
            ELSE
                internal_notes
        END,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Return success with booking details
    SELECT json_build_object(
        'success', true,
        'booking_id', id,
        'status', status,
        'completed_at', completed_at
    ) INTO v_result
    FROM public.bookings
    WHERE id = p_booking_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check in a booking
CREATE OR REPLACE FUNCTION checkin_booking(
    p_booking_id UUID,
    p_checkin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_booking_exists BOOLEAN;
BEGIN
    -- Check if booking exists
    SELECT EXISTS(
        SELECT 1 FROM public.bookings WHERE id = p_booking_id
    ) INTO v_booking_exists;
    
    IF NOT v_booking_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    -- Update the booking
    UPDATE public.bookings
    SET 
        status = 'in_progress',
        checked_in_at = NOW(),
        internal_notes = CASE 
            WHEN p_checkin_notes IS NOT NULL THEN
                COALESCE(internal_notes || E'\n\n', '') || 'Check-in note: ' || p_checkin_notes
            ELSE
                internal_notes
        END,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Return success with booking details
    SELECT json_build_object(
        'success', true,
        'booking_id', id,
        'status', status,
        'checked_in_at', checked_in_at
    ) INTO v_result
    FROM public.bookings
    WHERE id = p_booking_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION complete_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_booking(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION checkin_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION checkin_booking(UUID, TEXT) TO anon;

-- Add helpful comments
COMMENT ON FUNCTION cancel_booking IS 'Cancels a booking with proper timestamp and reason tracking';
COMMENT ON FUNCTION complete_booking IS 'Marks a booking as completed with proper timestamp';
COMMENT ON FUNCTION checkin_booking IS 'Checks in a booking and marks it as in progress';