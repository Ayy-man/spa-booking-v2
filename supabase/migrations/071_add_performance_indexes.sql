-- Add performance indexes to improve query speed
-- This migration adds indexes on frequently queried columns

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date ON bookings(staff_id, appointment_date) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at DESC) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority) WHERE priority != 'normal';

-- Admin notification history indexes
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_email ON admin_notification_history(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_notification ON admin_notification_history(notification_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_history_read ON admin_notification_history(admin_email, read_at) WHERE read_at IS NULL;

-- Services table indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_capabilities ON staff USING GIN(capabilities);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Walk-ins table indexes
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_at ON walk_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_walk_ins_status ON walk_ins(status) WHERE status = 'pending';

-- Staff schedules indexes for availability checking
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);

-- Add partial indexes for commonly filtered queries
CREATE INDEX IF NOT EXISTS idx_bookings_pending ON bookings(appointment_date, start_time) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bookings_today ON bookings(start_time) 
  WHERE appointment_date = CURRENT_DATE AND status != 'cancelled';

-- Log the indexes created
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes have been added successfully';
    RAISE NOTICE 'These indexes will improve query performance for:';
    RAISE NOTICE '  - Booking lookups by date and staff';
    RAISE NOTICE '  - Notification queries and polling';
    RAISE NOTICE '  - Customer searches';
    RAISE NOTICE '  - Service and staff availability checks';
END $$;