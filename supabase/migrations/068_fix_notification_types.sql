-- Fix notification system types and tables
-- This migration handles existing types gracefully

-- Check and create notification_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
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
    END IF;
END$$;

-- Check and create notification_priority enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE notification_priority AS ENUM (
            'urgent',
            'high',
            'normal',
            'low'
        );
    END IF;
END$$;

-- Drop existing notification-related tables if they exist (to rebuild with proper structure)
DROP TABLE IF EXISTS admin_notification_history CASCADE;
DROP TABLE IF EXISTS admin_notification_preferences CASCADE;
DROP TABLE IF EXISTS admin_notification_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    priority notification_priority DEFAULT 'normal',
    action_url text,
    requires_action boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);

-- Create admin notification history table
CREATE TABLE IF NOT EXISTS public.admin_notification_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    admin_email text NOT NULL,
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    action_taken text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(notification_id, admin_email)
);

-- Create admin notification preferences table
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email text NOT NULL,
    notification_type notification_type NOT NULL,
    enabled boolean DEFAULT true,
    browser_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT false,
    sound_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(admin_email, notification_type)
);

-- Create admin notification settings table
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email text NOT NULL UNIQUE,
    dnd_enabled boolean DEFAULT false,
    dnd_start_time time DEFAULT '22:00'::time,
    dnd_end_time time DEFAULT '08:00'::time,
    sound_enabled boolean DEFAULT true,
    sound_volume integer DEFAULT 50 CHECK (sound_volume >= 0 AND sound_volume <= 100),
    browser_enabled boolean DEFAULT true,
    browser_permission_granted boolean DEFAULT false,
    email_enabled boolean DEFAULT false,
    email_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_notification_id ON public.admin_notification_history(notification_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_admin_email ON public.admin_notification_history(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_read_at ON public.admin_notification_history(read_at);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all for notifications" ON public.notifications
    FOR ALL USING (true);

CREATE POLICY "Allow all for admin_notification_history" ON public.admin_notification_history
    FOR ALL USING (true);

CREATE POLICY "Allow all for admin_notification_preferences" ON public.admin_notification_preferences
    FOR ALL USING (true);

CREATE POLICY "Allow all for admin_notification_settings" ON public.admin_notification_settings
    FOR ALL USING (true);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_type notification_type,
    p_title text,
    p_message text,
    p_priority notification_priority DEFAULT 'normal',
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_requires_action boolean DEFAULT false,
    p_action_url text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_notification_id uuid;
BEGIN
    INSERT INTO notifications (
        type,
        title,
        message,
        priority,
        metadata,
        requires_action,
        action_url
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_priority,
        p_metadata,
        p_requires_action,
        p_action_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new bookings
CREATE OR REPLACE FUNCTION notify_new_booking() RETURNS trigger AS $$
DECLARE
    v_customer_name text;
    v_service_name text;
    v_staff_name text;
    v_notification_id uuid;
BEGIN
    -- Get related data
    SELECT 
        COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), 'Unknown Customer'),
        COALESCE(s.name, 'Unknown Service'),
        COALESCE(st.name, 'Unknown Staff')
    INTO v_customer_name, v_service_name, v_staff_name
    FROM bookings b
    LEFT JOIN customers c ON c.id = NEW.customer_id
    LEFT JOIN services s ON s.id = NEW.service_id
    LEFT JOIN staff st ON st.id = NEW.staff_id
    WHERE b.id = NEW.id;
    
    -- Create notification
    v_notification_id := create_notification(
        'new_booking'::notification_type,
        'New Booking',
        format('%s booked %s with %s for %s at %s',
            v_customer_name,
            v_service_name,
            v_staff_name,
            NEW.appointment_date::text,
            NEW.start_time::text
        ),
        'normal'::notification_priority,
        jsonb_build_object(
            'bookingId', NEW.id,
            'customerId', NEW.customer_id,
            'customerName', v_customer_name,
            'serviceId', NEW.service_id,
            'serviceName', v_service_name,
            'staffId', NEW.staff_id,
            'staffName', v_staff_name,
            'appointmentDate', NEW.appointment_date,
            'startTime', NEW.start_time,
            'endTime', NEW.end_time,
            'totalPrice', NEW.total_price
        ),
        true,
        '/admin#schedule'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_new_booking ON bookings;

-- Create trigger for new bookings
CREATE TRIGGER trigger_notify_new_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_booking();

-- Create trigger for walk-ins
CREATE OR REPLACE FUNCTION notify_new_walk_in() RETURNS trigger AS $$
DECLARE
    v_notification_id uuid;
BEGIN
    -- Create notification
    v_notification_id := create_notification(
        'walk_in'::notification_type,
        'Walk-In Customer',
        format('%s arrived for %s - %s',
            NEW.customer_name,
            NEW.service_name,
            CASE 
                WHEN NEW.scheduling_type = 'immediate' THEN 'Immediate service'
                ELSE format('Scheduled for %s at %s', NEW.scheduled_date::text, NEW.scheduled_time::text)
            END
        ),
        'high'::notification_priority,
        jsonb_build_object(
            'walkInId', NEW.id,
            'customerName', NEW.customer_name,
            'customerPhone', NEW.customer_phone,
            'serviceName', NEW.service_name,
            'serviceCategory', NEW.service_category,
            'schedulingType', NEW.scheduling_type,
            'scheduledDate', NEW.scheduled_date,
            'scheduledTime', NEW.scheduled_time,
            'notes', NEW.notes
        ),
        true,
        '/admin#walkins'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_new_walk_in ON walk_ins;

-- Create trigger for walk-ins
CREATE TRIGGER trigger_notify_new_walk_in
    AFTER INSERT ON walk_ins
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_walk_in();

-- Create trigger for booking cancellations
CREATE OR REPLACE FUNCTION notify_booking_cancelled() RETURNS trigger AS $$
DECLARE
    v_customer_name text;
    v_service_name text;
    v_notification_id uuid;
BEGIN
    -- Only trigger on cancellation
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Get related data
        SELECT 
            COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), 'Unknown Customer'),
            COALESCE(s.name, 'Unknown Service')
        INTO v_customer_name, v_service_name
        FROM bookings b
        LEFT JOIN customers c ON c.id = NEW.customer_id
        LEFT JOIN services s ON s.id = NEW.service_id
        WHERE b.id = NEW.id;
        
        -- Create notification
        v_notification_id := create_notification(
            'booking_cancelled'::notification_type,
            'Booking Cancelled',
            format('%s cancelled %s for %s at %s',
                v_customer_name,
                v_service_name,
                NEW.appointment_date::text,
                NEW.start_time::text
            ),
            'normal'::notification_priority,
            jsonb_build_object(
                'bookingId', NEW.id,
                'customerName', v_customer_name,
                'serviceName', v_service_name,
                'appointmentDate', NEW.appointment_date,
                'startTime', NEW.start_time,
                'cancellationReason', NEW.cancellation_reason
            ),
            false,
            '/admin#schedule'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_booking_cancelled ON bookings;

-- Create trigger for booking cancellations
CREATE TRIGGER trigger_notify_booking_cancelled
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_booking_cancelled();

-- Create trigger for payment received
CREATE OR REPLACE FUNCTION notify_payment_received() RETURNS trigger AS $$
DECLARE
    v_customer_name text;
    v_service_name text;
    v_notification_id uuid;
BEGIN
    -- Only trigger on successful payment
    IF NEW.status = 'paid' THEN
        -- Get related data
        SELECT 
            COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), 'Unknown Customer'),
            COALESCE(s.name, 'Unknown Service')
        INTO v_customer_name, v_service_name
        FROM bookings b
        LEFT JOIN customers c ON c.id = b.customer_id
        LEFT JOIN services s ON s.id = b.service_id
        WHERE b.id = NEW.booking_id;
        
        -- Create notification
        v_notification_id := create_notification(
            'payment_received'::notification_type,
            'Payment Received',
            format('$%s payment confirmed for %s - %s',
                NEW.amount::text,
                v_customer_name,
                v_service_name
            ),
            'normal'::notification_priority,
            jsonb_build_object(
                'paymentId', NEW.id,
                'bookingId', NEW.booking_id,
                'amount', NEW.amount,
                'paymentMethod', NEW.payment_method,
                'customerName', v_customer_name,
                'serviceName', v_service_name
            ),
            false,
            format('/admin/bookings/%s', NEW.booking_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_payment_received ON payments;

-- Create trigger for payments
CREATE TRIGGER trigger_notify_payment_received
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION notify_payment_received();

-- Insert default admin settings for existing admin
INSERT INTO admin_notification_settings (
    admin_email,
    sound_enabled,
    browser_enabled,
    dnd_enabled
) VALUES (
    'admin@dermalspa.com',
    true,
    true,
    false
) ON CONFLICT (admin_email) DO NOTHING;

-- Insert default preferences for all notification types for admin
INSERT INTO admin_notification_preferences (admin_email, notification_type, enabled, browser_enabled, sound_enabled)
VALUES 
    ('admin@dermalspa.com', 'new_booking', true, true, true),
    ('admin@dermalspa.com', 'walk_in', true, true, true),
    ('admin@dermalspa.com', 'payment_received', true, true, true),
    ('admin@dermalspa.com', 'booking_cancelled', true, true, true),
    ('admin@dermalspa.com', 'booking_rescheduled', true, true, true),
    ('admin@dermalspa.com', 'double_booking_attempt', true, true, true),
    ('admin@dermalspa.com', 'staff_unavailable', true, true, true),
    ('admin@dermalspa.com', 'room_conflict', true, true, true),
    ('admin@dermalspa.com', 'system_alert', true, true, true)
ON CONFLICT (admin_email, notification_type) DO NOTHING;