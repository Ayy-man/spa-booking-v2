-- Row Level Security Policies for Dermal Booking System
-- This ensures proper data access control

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Services Table Policies (Public Read Access)
-- Allow everyone to read active services
CREATE POLICY "Services are viewable by everyone" ON services
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to read all services (for admin purposes if needed)
CREATE POLICY "All services viewable by authenticated users" ON services
    FOR SELECT USING (auth.role() = 'authenticated');

-- Rooms Table Policies (Public Read Access)
-- Allow everyone to read active rooms
CREATE POLICY "Rooms are viewable by everyone" ON rooms
    FOR SELECT USING (is_active = true);

-- Staff Table Policies (Public Read Access for Active Staff)
-- Allow everyone to read active staff information (needed for booking flow)
CREATE POLICY "Active staff are viewable by everyone" ON staff
    FOR SELECT USING (is_active = true);

-- Bookings Table Policies (Restricted Access)
-- Allow anyone to insert bookings (customer booking flow)
CREATE POLICY "Anyone can create bookings" ON bookings
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users (staff) to read all bookings
CREATE POLICY "Staff can view all bookings" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update booking status
CREATE POLICY "Staff can update bookings" ON bookings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow customers to read their own bookings by email
CREATE POLICY "Customers can view their own bookings" ON bookings
    FOR SELECT USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Staff Availability Policies
-- Only authenticated users (staff/admin) can manage availability
CREATE POLICY "Staff can manage availability" ON staff_availability
    FOR ALL USING (auth.role() = 'authenticated');

-- Additional security: Create a function to validate booking times
CREATE OR REPLACE FUNCTION validate_booking_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if booking is within business hours (9 AM - 7 PM)
    IF NEW.start_time < '09:00'::time OR NEW.end_time > '19:00'::time THEN
        RAISE EXCEPTION 'Bookings must be between 9 AM and 7 PM';
    END IF;
    
    -- Check if booking date is not in the past
    IF NEW.booking_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot book appointments in the past';
    END IF;
    
    -- Check if booking date is not more than 30 days in advance
    IF NEW.booking_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Cannot book more than 30 days in advance';
    END IF;
    
    -- Check if end time is after start time
    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'End time must be after start time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the validation trigger
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking_time();

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for room conflicts
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = NEW.room_id 
        AND booking_date = NEW.booking_date 
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Room is already booked for this time slot';
    END IF;
    
    -- Check for staff conflicts
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE staff_id = NEW.staff_id 
        AND booking_date = NEW.booking_date 
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (start_time < NEW.end_time AND end_time > NEW.start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Staff member is already booked for this time slot';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the conflict checking trigger
CREATE TRIGGER check_booking_conflicts_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();