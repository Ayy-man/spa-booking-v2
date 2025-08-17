-- Create table to track failed booking attempts
CREATE TABLE IF NOT EXISTS public.booking_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  error_type text NOT NULL, -- 'single', 'couples', 'validation', 'conflict', etc.
  error_message text NOT NULL,
  error_details jsonb, -- Full error object with stack trace if available
  
  -- Booking attempt details
  booking_data jsonb NOT NULL, -- All the booking data that was attempted
  customer_name text,
  customer_email text,
  customer_phone text,
  
  -- Service and appointment details
  service_name text,
  service_id text,
  appointment_date date,
  appointment_time time,
  staff_name text,
  staff_id text,
  room_id integer,
  
  -- Couples booking specific
  is_couples_booking boolean DEFAULT false,
  secondary_service_name text,
  secondary_service_id text,
  secondary_staff_name text,
  secondary_staff_id text,
  
  -- Request metadata
  user_agent text,
  ip_address inet,
  session_id text,
  
  -- Resolution tracking
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT booking_errors_pkey PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX idx_booking_errors_created_at ON public.booking_errors(created_at DESC);
CREATE INDEX idx_booking_errors_error_type ON public.booking_errors(error_type);
CREATE INDEX idx_booking_errors_customer_email ON public.booking_errors(customer_email);
CREATE INDEX idx_booking_errors_appointment_date ON public.booking_errors(appointment_date);
CREATE INDEX idx_booking_errors_resolved ON public.booking_errors(resolved);

-- Add RLS policies
ALTER TABLE public.booking_errors ENABLE ROW LEVEL SECURITY;

-- Admin users can view all errors
CREATE POLICY "Admin users can view all booking errors" ON public.booking_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admin users can update errors (mark as resolved)
CREATE POLICY "Admin users can update booking errors" ON public.booking_errors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Service role can insert errors (from API)
CREATE POLICY "Service role can insert booking errors" ON public.booking_errors
  FOR INSERT
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.booking_errors IS 'Tracks all failed booking attempts for debugging and analysis';