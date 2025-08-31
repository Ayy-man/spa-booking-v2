-- URGENT: Disable notification triggers to stop test emails
-- This migration temporarily disables all notification triggers

-- Drop all notification triggers
DROP TRIGGER IF EXISTS trigger_notify_new_booking ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_new_walk_in ON walk_ins;
DROP TRIGGER IF EXISTS trigger_notify_booking_cancelled ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_payment_received ON payments;

-- Clear all test notifications
DELETE FROM notifications 
WHERE title LIKE 'TEST |%' 
   OR message LIKE '%Test Customer%'
   OR metadata->>'test' = 'true';

-- Clear notification history for test notifications
DELETE FROM admin_notification_history
WHERE notification_id IN (
  SELECT id FROM notifications 
  WHERE title LIKE 'TEST |%' 
     OR message LIKE '%Test Customer%'
     OR metadata->>'test' = 'true'
);

-- Add a flag to prevent test bookings from creating notifications
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS skip_notifications boolean DEFAULT false;

-- Update existing test bookings to skip notifications
UPDATE bookings 
SET skip_notifications = true
WHERE notes LIKE '%TEST%' 
   OR internal_notes LIKE '%TEST%'
   OR customer_id IN (
     SELECT id FROM customers 
     WHERE first_name = 'Test' 
        OR email LIKE '%test%'
   );

-- Recreate the booking notification trigger with test check
CREATE OR REPLACE FUNCTION notify_new_booking() RETURNS trigger AS $$
DECLARE
    v_customer_name text;
    v_service_name text;
    v_staff_name text;
    v_notification_id uuid;
BEGIN
    -- Skip if this is a test booking or notifications are disabled
    IF NEW.skip_notifications = true THEN
        RETURN NEW;
    END IF;
    
    -- Skip if customer name contains "Test"
    SELECT first_name INTO v_customer_name
    FROM customers WHERE id = NEW.customer_id;
    
    IF v_customer_name ILIKE '%test%' THEN
        RETURN NEW;
    END IF;
    
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
    
    -- Don't create notification for test data
    IF v_customer_name ILIKE '%test%' OR v_service_name ILIKE '%test%' THEN
        RETURN NEW;
    END IF;
    
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

-- Only re-enable the trigger with the new check
CREATE TRIGGER trigger_notify_new_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_booking();

-- Create a function to clean up test notifications
CREATE OR REPLACE FUNCTION cleanup_test_notifications() RETURNS void AS $$
BEGIN
    -- Delete test notifications
    DELETE FROM notifications 
    WHERE title LIKE '%TEST%' 
       OR title LIKE '%Test Customer%'
       OR message LIKE '%Test Customer%'
       OR message LIKE '%test@%';
       
    -- Clear history for deleted notifications
    DELETE FROM admin_notification_history
    WHERE notification_id NOT IN (SELECT id FROM notifications);
END;
$$ LANGUAGE plpgsql;

-- Run cleanup immediately
SELECT cleanup_test_notifications();