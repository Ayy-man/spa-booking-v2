-- Create notifications system tables and functions
-- This migration sets up real-time notifications for the admin panel

-- Create enum for notification types
CREATE TYPE notification_type AS ENUM (
  'new_booking',
  'walk_in',
  'payment_received', 
  'booking_cancelled',
  'booking_rescheduled',
  'double_booking_attempt',
  'staff_unavailable',
  'room_conflict',
  'system_alert'
);

-- Create enum for notification priority
CREATE TYPE notification_priority AS ENUM (
  'urgent',
  'high',
  'normal',
  'low'
);

-- Main notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority notification_priority DEFAULT 'normal',
  metadata jsonb DEFAULT '{}'::jsonb,
  requires_action boolean DEFAULT false,
  action_url text,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Admin notification preferences table
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  notification_type notification_type NOT NULL,
  enabled boolean DEFAULT true,
  browser_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notification_preferences_unique UNIQUE (admin_email, notification_type)
);

-- Admin notification history table (tracks read/unread status per admin)
CREATE TABLE IF NOT EXISTS public.admin_notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  admin_email text NOT NULL,
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notification_history_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notification_history_notification_fkey FOREIGN KEY (notification_id) 
    REFERENCES public.notifications(id) ON DELETE CASCADE,
  CONSTRAINT admin_notification_history_unique UNIQUE (notification_id, admin_email)
);

-- Admin notification settings table
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_email text NOT NULL UNIQUE,
  sound_volume integer DEFAULT 50 CHECK (sound_volume >= 0 AND sound_volume <= 100),
  do_not_disturb_enabled boolean DEFAULT false,
  do_not_disturb_start time,
  do_not_disturb_end time,
  browser_permission_granted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notification_settings_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_priority ON public.notifications(priority);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON public.notifications(expires_at);
CREATE INDEX idx_admin_notification_history_admin ON public.admin_notification_history(admin_email);
CREATE INDEX idx_admin_notification_history_notification ON public.admin_notification_history(notification_id);
CREATE INDEX idx_admin_notification_history_read ON public.admin_notification_history(read_at);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_type notification_type,
  p_title text,
  p_message text,
  p_priority notification_priority DEFAULT 'normal',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_requires_action boolean DEFAULT false,
  p_action_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Insert the notification
  INSERT INTO public.notifications (
    type, title, message, priority, metadata, requires_action, action_url
  ) VALUES (
    p_type, p_title, p_message, p_priority, p_metadata, p_requires_action, p_action_url
  ) RETURNING id INTO v_notification_id;
  
  -- Return the notification ID
  RETURN v_notification_id;
END;
$$;

-- Function to mark notification as read for an admin
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid,
  p_admin_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the history record
  INSERT INTO public.admin_notification_history (
    notification_id, admin_email, read_at
  ) VALUES (
    p_notification_id, p_admin_email, now()
  )
  ON CONFLICT (notification_id, admin_email)
  DO UPDATE SET read_at = now();
  
  RETURN true;
END;
$$;

-- Function to get unread notification count for an admin
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_admin_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.notifications n
  LEFT JOIN public.admin_notification_history h 
    ON n.id = h.notification_id AND h.admin_email = p_admin_email
  WHERE (h.read_at IS NULL OR h.notification_id IS NULL)
    AND n.expires_at > now();
  
  RETURN v_count;
END;
$$;

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at < now();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Trigger function for new bookings
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_name text;
  v_service_name text;
  v_notification_id uuid;
BEGIN
  -- Get customer name
  SELECT first_name || ' ' || COALESCE(last_name, '') 
  INTO v_customer_name
  FROM public.customers
  WHERE id = NEW.customer_id;
  
  -- Get service name
  SELECT name 
  INTO v_service_name
  FROM public.services
  WHERE id = NEW.service_id;
  
  -- Create notification
  v_notification_id := create_notification(
    'new_booking'::notification_type,
    'New Booking',
    v_customer_name || ' booked ' || v_service_name || ' for ' || 
    TO_CHAR(NEW.booking_date, 'Mon DD') || ' at ' || 
    TO_CHAR(NEW.start_time, 'HH12:MI AM'),
    'normal'::notification_priority,
    jsonb_build_object(
      'booking_id', NEW.id,
      'customer_id', NEW.customer_id,
      'service_id', NEW.service_id,
      'booking_date', NEW.booking_date,
      'start_time', NEW.start_time
    ),
    true,
    '/admin/bookings/' || NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for new walk-ins
CREATE OR REPLACE FUNCTION notify_new_walkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Create notification for walk-in
  v_notification_id := create_notification(
    'walk_in'::notification_type,
    'New Walk-In Customer',
    NEW.customer_name || ' arrived for ' || NEW.service_name,
    'high'::notification_priority,
    jsonb_build_object(
      'walkin_id', NEW.id,
      'customer_name', NEW.customer_name,
      'service_name', NEW.service_name,
      'service_category', NEW.service_category
    ),
    true,
    '/admin#walkins'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for booking cancellations
CREATE OR REPLACE FUNCTION notify_booking_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_name text;
  v_service_name text;
  v_notification_id uuid;
BEGIN
  -- Only notify if status changed to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Get customer name
    SELECT first_name || ' ' || COALESCE(last_name, '') 
    INTO v_customer_name
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- Get service name
    SELECT name 
    INTO v_service_name
    FROM public.services
    WHERE id = NEW.service_id;
    
    -- Create notification
    v_notification_id := create_notification(
      'booking_cancelled'::notification_type,
      'Booking Cancelled',
      v_customer_name || ' cancelled ' || v_service_name || ' for ' || 
      TO_CHAR(NEW.booking_date, 'Mon DD') || ' at ' || 
      TO_CHAR(NEW.start_time, 'HH12:MI AM'),
      'normal'::notification_priority,
      jsonb_build_object(
        'booking_id', NEW.id,
        'customer_id', NEW.customer_id,
        'service_id', NEW.service_id,
        'cancellation_reason', NEW.cancellation_reason
      ),
      false,
      '/admin/bookings/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

CREATE TRIGGER trigger_notify_new_walkin
  AFTER INSERT ON public.walk_ins
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_walkin();

CREATE TRIGGER trigger_notify_booking_cancelled
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_cancelled();

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to see notifications)
CREATE POLICY "Allow authenticated users to view notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage their preferences"
  ON public.admin_notification_preferences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage their history"
  ON public.admin_notification_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage their settings"
  ON public.admin_notification_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.admin_notification_preferences TO authenticated;
GRANT ALL ON public.admin_notification_history TO authenticated;
GRANT ALL ON public.admin_notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications TO authenticated;

-- Insert default preferences for common admin emails
DO $$
DECLARE
  v_admin_email text;
  v_notification_type notification_type;
BEGIN
  -- List of notification types
  FOR v_notification_type IN SELECT unnest(enum_range(NULL::notification_type))
  LOOP
    -- Insert default preferences for admin@example.com (replace with actual admin emails)
    INSERT INTO public.admin_notification_preferences (
      admin_email, notification_type, enabled, browser_enabled, sound_enabled
    ) VALUES (
      'admin@dermalspa.com', v_notification_type, true, true, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;