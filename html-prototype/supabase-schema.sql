-- Dermal Skin Clinic - Complete Supabase Database Schema
-- Generated for spa booking system with business logic from services-data.js

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- ENUMS AND CUSTOM TYPES
-- ========================================

-- Service categories enum
CREATE TYPE service_category AS ENUM (
    'facials', 'massages', 'treatments', 'waxing', 'packages', 'special'
);

-- Booking status enum
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
    'pending', 'partial', 'paid', 'refunded', 'voided'
);

-- Staff role enum
CREATE TYPE staff_role AS ENUM (
    'therapist', 'receptionist', 'manager', 'admin'
);

-- ========================================
-- CORE TABLES
-- ========================================

-- Services table with all spa services
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category service_category NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    requires_room_3 BOOLEAN DEFAULT FALSE,
    is_couples_service BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    service_capabilities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    capabilities service_category[] NOT NULL DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table with scheduling and capabilities
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    specialties TEXT,
    capabilities service_category[] NOT NULL DEFAULT '{}',
    work_days INTEGER[] NOT NULL DEFAULT '{}', -- 0=Sunday, 1=Monday, etc.
    default_room_id INTEGER REFERENCES rooms(id),
    role staff_role DEFAULT 'therapist',
    initials TEXT,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table with CRM integration fields
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT NOT NULL,
    date_of_birth DATE,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    allergies TEXT,
    skin_type TEXT,
    preferences JSONB DEFAULT '{}',
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_visit_date TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table with conflict prevention
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES services(id),
    staff_id TEXT NOT NULL REFERENCES staff(id),
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    total_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    final_price DECIMAL(10,2) NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    notes TEXT,
    internal_notes TEXT,
    created_by TEXT, -- staff member who created booking
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints to prevent overlapping bookings
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_price CHECK (final_price >= 0),
    CONSTRAINT valid_discount CHECK (discount >= 0 AND discount <= total_price)
);

-- Staff schedules table for managing availability
CREATE TABLE staff_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    break_start TIME,
    break_end TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_schedule_time CHECK (end_time > start_time),
    CONSTRAINT valid_break_time CHECK (
        (break_start IS NULL AND break_end IS NULL) OR 
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    ),
    UNIQUE(staff_id, date)
);

-- Service packages for bundled services
CREATE TABLE service_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    service_ids TEXT[] NOT NULL,
    total_duration INTEGER NOT NULL,
    individual_price DECIMAL(10,2) NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    savings DECIMAL(10,2) GENERATED ALWAYS AS (individual_price - package_price) STORED,
    is_couples BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    transaction_id TEXT,
    status payment_status DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Services indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_services_duration ON services(duration);
CREATE INDEX idx_services_price ON services(price);

-- Staff indexes
CREATE INDEX idx_staff_capabilities ON staff USING GIN(capabilities);
CREATE INDEX idx_staff_work_days ON staff USING GIN(work_days);
CREATE INDEX idx_staff_active ON staff(is_active);

-- Customers indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_active ON customers(is_active);

-- Bookings indexes (critical for performance)
CREATE INDEX idx_bookings_date_time ON bookings(appointment_date, start_time);
CREATE INDEX idx_bookings_staff_date ON bookings(staff_id, appointment_date);
CREATE INDEX idx_bookings_room_date ON bookings(room_id, appointment_date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_datetime_range ON bookings(appointment_date, start_time, end_time);

-- Staff schedules indexes
CREATE INDEX idx_staff_schedules_date ON staff_schedules(staff_id, date);
CREATE INDEX idx_staff_schedules_availability ON staff_schedules(date, is_available);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Services - Public read, staff can modify
CREATE POLICY "Services are viewable by everyone" ON services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- Rooms - Public read, staff can modify
CREATE POLICY "Rooms are viewable by everyone" ON rooms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage rooms" ON rooms
    FOR ALL USING (auth.role() = 'authenticated');

-- Staff - Limited access based on role
CREATE POLICY "Staff can view active staff members" ON staff
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can update their own profile" ON staff
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Managers can manage all staff" ON staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE id = auth.uid()::text 
            AND role IN ('manager', 'admin')
        )
    );

-- Customers - Staff and customers can access their own data
CREATE POLICY "Customers can view their own data" ON customers
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Staff can access customer data" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customers" ON customers
    FOR INSERT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Bookings - Customers see their bookings, staff see relevant bookings
CREATE POLICY "Customers can view their bookings" ON bookings
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Staff can view their assigned bookings" ON bookings
    FOR SELECT USING (
        staff_id = auth.uid()::text OR 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Staff can manage bookings" ON bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- Staff schedules - Staff manage their own schedules
CREATE POLICY "Staff can manage their schedules" ON staff_schedules
    FOR ALL USING (staff_id = auth.uid()::text);

CREATE POLICY "Staff can view all schedules" ON staff_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service packages - Public read
CREATE POLICY "Service packages are viewable by everyone" ON service_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage service packages" ON service_packages
    FOR ALL USING (auth.role() = 'authenticated');

-- Payments - Restricted access
CREATE POLICY "Staff can manage payments" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- DATABASE FUNCTIONS
-- ========================================

-- Function to check staff availability
CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id TEXT,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_works BOOLEAN;
    has_conflicts BOOLEAN;
    day_of_week INTEGER;
BEGIN
    -- Get day of week (0 = Sunday)
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check if staff works on this day
    SELECT day_of_week = ANY(work_days) INTO staff_works
    FROM staff 
    WHERE id = p_staff_id;
    
    IF NOT staff_works THEN
        RETURN FALSE;
    END IF;
    
    -- Check for booking conflicts
    SELECT EXISTS(
        SELECT 1 FROM bookings 
        WHERE staff_id = p_staff_id 
        AND appointment_date = p_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        )
    ) INTO has_conflicts;
    
    RETURN NOT has_conflicts;
END;
$$ LANGUAGE plpgsql;

-- Function to check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
    p_room_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_conflicts BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM bookings 
        WHERE room_id = p_room_id 
        AND appointment_date = p_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        )
    ) INTO has_conflicts;
    
    RETURN NOT has_conflicts;
END;
$$ LANGUAGE plpgsql;

-- Function to get available time slots
CREATE OR REPLACE FUNCTION get_available_slots(
    p_service_id TEXT,
    p_date DATE,
    p_staff_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    staff_id TEXT,
    staff_name TEXT,
    room_id INTEGER,
    available_times TIME[]
) AS $$
BEGIN
    RETURN QUERY
    WITH service_info AS (
        SELECT duration, requires_room_3, category
        FROM services 
        WHERE id = p_service_id
    ),
    eligible_staff AS (
        SELECT s.id, s.name, s.default_room_id
        FROM staff s, service_info si
        WHERE (p_staff_id IS NULL OR s.id = p_staff_id)
        AND s.is_active = true
        AND (si.category = ANY(s.capabilities) OR s.id = 'any')
        AND EXTRACT(DOW FROM p_date) = ANY(s.work_days)
    ),
    eligible_rooms AS (
        SELECT r.id
        FROM rooms r, service_info si
        WHERE r.is_active = true
        AND (NOT si.requires_room_3 OR r.id = 3)
        AND si.category = ANY(r.capabilities)
    )
    SELECT 
        es.id,
        es.name,
        COALESCE(es.default_room_id, er.id),
        ARRAY[]::TIME[] -- Simplified - would need complex logic for actual slots
    FROM eligible_staff es
    CROSS JOIN eligible_rooms er
    WHERE (es.default_room_id IS NULL OR es.default_room_id = er.id)
    OR (es.default_room_id IS NOT NULL AND er.id = es.default_room_id);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        UPDATE customers 
        SET 
            total_visits = total_visits + 1,
            total_spent = total_spent + NEW.final_price,
            last_visit_date = NEW.appointment_date::TIMESTAMPTZ
        WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
        UPDATE customers 
        SET 
            total_visits = GREATEST(total_visits - 1, 0),
            total_spent = GREATEST(total_spent - OLD.final_price, 0)
        WHERE id = OLD.customer_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to validate bookings
CREATE OR REPLACE FUNCTION validate_booking()
RETURNS TRIGGER AS $$
DECLARE
    service_duration INTEGER;
    service_requires_room_3 BOOLEAN;
    service_category service_category;
    staff_can_perform BOOLEAN;
    room_can_handle BOOLEAN;
BEGIN
    -- Get service details
    SELECT duration, requires_room_3, category 
    INTO service_duration, service_requires_room_3, service_category
    FROM services 
    WHERE id = NEW.service_id;
    
    -- Validate duration matches
    IF NEW.duration != service_duration THEN
        RAISE EXCEPTION 'Booking duration must match service duration';
    END IF;
    
    -- Validate room requirement
    IF service_requires_room_3 AND NEW.room_id != 3 THEN
        RAISE EXCEPTION 'This service requires Room 3';
    END IF;
    
    -- Check staff capability
    SELECT service_category = ANY(capabilities) OR id = 'any'
    INTO staff_can_perform
    FROM staff 
    WHERE id = NEW.staff_id;
    
    IF NOT staff_can_perform THEN
        RAISE EXCEPTION 'Staff member cannot perform this service';
    END IF;
    
    -- Check room capability
    SELECT service_category = ANY(capabilities)
    INTO room_can_handle
    FROM rooms 
    WHERE id = NEW.room_id;
    
    IF NOT room_can_handle THEN
        RAISE EXCEPTION 'Room cannot accommodate this service';
    END IF;
    
    -- Check availability (for new bookings or time changes)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        OLD.appointment_date != NEW.appointment_date OR 
        OLD.start_time != NEW.start_time OR 
        OLD.staff_id != NEW.staff_id OR 
        OLD.room_id != NEW.room_id
    )) THEN
        -- Check staff availability
        IF NOT check_staff_availability(NEW.staff_id, NEW.appointment_date, NEW.start_time, NEW.end_time, NEW.id) THEN
            RAISE EXCEPTION 'Staff member is not available at the requested time';
        END IF;
        
        -- Check room availability
        IF NOT check_room_availability(NEW.room_id, NEW.appointment_date, NEW.start_time, NEW.end_time, NEW.id) THEN
            RAISE EXCEPTION 'Room is not available at the requested time';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON service_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Booking validation trigger
CREATE TRIGGER validate_booking_trigger 
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking();

-- Customer stats trigger
CREATE TRIGGER update_customer_stats_trigger 
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ========================================
-- INITIAL DATA POPULATION
-- ========================================

-- Insert rooms data
INSERT INTO rooms (id, name, capacity, capabilities) VALUES
(1, 'Room 1', 1, ARRAY['facials', 'waxing']::service_category[]),
(2, 'Room 2', 2, ARRAY['facials', 'waxing', 'massages', 'packages']::service_category[]),
(3, 'Room 3', 2, ARRAY['facials', 'waxing', 'massages', 'treatments', 'packages', 'special']::service_category[]);

-- Insert staff data
INSERT INTO staff (id, name, email, phone, specialties, capabilities, work_days, default_room_id, initials) VALUES
('any', 'Any Available Staff', '', '', 'Any qualified staff member', 
 ARRAY['facials', 'massages', 'treatments', 'waxing', 'packages', 'special']::service_category[], 
 ARRAY[0,1,2,3,4,5,6], NULL, 'AA'),
('selma', 'Selma Villaver', 'happyskinhappyyou@gmail.com', '(671) 482-7765', 'All Facials (except dermaplaning)', 
 ARRAY['facials']::service_category[], ARRAY[1,3,5,6,0], 1, 'SV'),
('robyn', 'Robyn Camacho', 'robyncmcho@gmail.com', '(671) 480-7862', 'Facials, Waxing, Body Treatments, Massages', 
 ARRAY['facials', 'waxing', 'treatments', 'massages', 'packages', 'special']::service_category[], 
 ARRAY[0,1,2,3,4,5,6], 3, 'RC'),
('tanisha', 'Tanisha Harris', 'misstanishababyy@gmail.com', '(671) 747-5728', 'Facials and Waxing', 
 ARRAY['facials', 'waxing']::service_category[], ARRAY[1,3,5,6,0], 2, 'TH'),
('leonel', 'Leonel Sidon', 'sidonleonel@gmail.com', '(671) 747-1882', 'Body Massages and Treatments (Sundays only)', 
 ARRAY['massages', 'treatments']::service_category[], ARRAY[0], NULL, 'LS');

-- Insert services data - Facials
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('basic_facial', 'Basic Facial', 'facials', 30, 65, false),
('deep_cleansing_facial', 'Deep Cleansing Facial', 'facials', 60, 79, false),
('placenta_collagen_facial', 'Placenta/Collagen Facial', 'facials', 60, 90, false),
('whitening_kojic_facial', 'Whitening Kojic Facial', 'facials', 60, 90, false),
('anti_acne_facial', 'Anti-Acne Facial', 'facials', 60, 90, false),
('microderm_facial', 'Microderm Facial', 'facials', 60, 99, false),
('vitamin_c_facial', 'Vitamin C Facial', 'facials', 60, 120, false),
('acne_vulgaris_facial', 'Acne Vulgaris Facial', 'facials', 60, 120, false);

-- Insert services data - Massages
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('balinese_massage', 'Balinese Body Massage', 'massages', 60, 80, false),
('maternity_massage', 'Maternity Massage', 'massages', 60, 85, false),
('stretching_massage', 'Stretching Body Massage', 'massages', 60, 85, false),
('deep_tissue_massage', 'Deep Tissue Body Massage', 'massages', 60, 90, false),
('hot_stone_massage', 'Hot Stone Massage', 'massages', 60, 90, false),
('hot_stone_90', 'Hot Stone Massage 90 Minutes', 'massages', 90, 120, false);

-- Insert services data - Treatments
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('underarm_cleaning', 'Underarm Cleaning', 'treatments', 30, 99, true),
('back_treatment', 'Back Treatment', 'treatments', 30, 99, true),
('chemical_peel_body', 'Chemical Peel (Body)', 'treatments', 30, 85, true),
('underarm_whitening', 'Underarm/Inguinal Whitening', 'treatments', 30, 150, true),
('microdermabrasion_body', 'Microdermabrasion (Body)', 'treatments', 30, 85, true),
('deep_moisturizing', 'Deep Moisturizing Body Treatment', 'treatments', 30, 65, true),
('dead_sea_scrub', 'Dead Sea Salt Body Scrub', 'treatments', 30, 65, true),
('mud_mask_wrap', 'Mud Mask Body Wrap', 'treatments', 30, 65, true);

-- Insert services data - Waxing
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('eyebrow_waxing', 'Eyebrow Waxing', 'waxing', 15, 20, false),
('lip_waxing', 'Lip Waxing', 'waxing', 5, 10, false),
('half_arm_waxing', 'Half Arm Waxing', 'waxing', 15, 40, false),
('full_arm_waxing', 'Full Arm Waxing', 'waxing', 30, 60, false),
('chin_waxing', 'Chin Waxing', 'waxing', 5, 12, false),
('neck_waxing', 'Neck Waxing', 'waxing', 15, 30, false),
('lower_leg_waxing', 'Lower Leg Waxing', 'waxing', 30, 40, false),
('full_leg_waxing', 'Full Leg Waxing', 'waxing', 60, 80, false),
('full_face_waxing', 'Full Face Waxing', 'waxing', 30, 60, false),
('bikini_waxing', 'Bikini Waxing', 'waxing', 30, 35, false),
('underarm_waxing', 'Underarm Waxing', 'waxing', 15, 20, false),
('brazilian_wax_women', 'Brazilian Wax (Women)', 'waxing', 45, 60, false),
('brazilian_wax_men', 'Brazilian Waxing (Men)', 'waxing', 45, 75, false),
('chest_wax', 'Chest Wax', 'waxing', 30, 40, false),
('stomach_wax', 'Stomach Wax', 'waxing', 30, 40, false),
('shoulders_wax', 'Shoulders', 'waxing', 30, 30, false),
('feet_wax', 'Feet', 'waxing', 5, 30, false);

-- Insert services data - Packages
INSERT INTO services (id, name, category, duration, price, requires_room_3, is_couples_service) VALUES
('balinese_facial_package', 'Balinese Body Massage + Basic Facial', 'packages', 90, 130, false, true),
('deep_tissue_3face', 'Deep Tissue Body Massage + 3Face', 'packages', 120, 180, false, true),
('hot_stone_microderm', 'Hot Stone Body Massage + Microderm Facial', 'packages', 150, 200, false, true);

-- Insert services data - Special
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('vajacial_brazilian', 'Basic Vajacial Cleaning + Brazilian Wax', 'special', 30, 90, true),
('dermal_vip', 'Dermal VIP Card', 'special', 30, 50, false);

-- Create service packages for bundled services
INSERT INTO service_packages (name, description, service_ids, total_duration, individual_price, package_price, is_couples) VALUES
('Balinese + Basic Facial', 'Relaxing combination of Balinese massage and basic facial', 
 ARRAY['balinese_massage', 'basic_facial'], 90, 145, 130, true),
('Deep Tissue + 3Face', 'Intensive massage with advanced facial treatment', 
 ARRAY['deep_tissue_massage', 'acne_vulgaris_facial'], 120, 210, 180, true),
('Hot Stone + Microderm', 'Luxury hot stone massage with microdermabrasion facial', 
 ARRAY['hot_stone_massage', 'microderm_facial'], 150, 189, 200, true);

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View for available staff and their next availability
CREATE VIEW staff_availability AS
SELECT 
    s.id,
    s.name,
    s.capabilities,
    s.work_days,
    s.is_active,
    COALESCE(next_booking.next_appointment, CURRENT_DATE) as next_available_date
FROM staff s
LEFT JOIN LATERAL (
    SELECT MIN(appointment_date) as next_appointment
    FROM bookings b
    WHERE b.staff_id = s.id 
    AND b.appointment_date >= CURRENT_DATE
    AND b.status NOT IN ('cancelled', 'no_show')
) next_booking ON true
WHERE s.is_active = true;

-- View for booking details with related information
CREATE VIEW booking_details AS
SELECT 
    b.id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.status,
    b.payment_status,
    c.first_name || ' ' || c.last_name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    s.name as service_name,
    s.category as service_category,
    s.duration as service_duration,
    st.name as staff_name,
    st.initials as staff_initials,
    r.name as room_name,
    b.total_price,
    b.discount,
    b.final_price,
    b.notes,
    b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services s ON b.service_id = s.id
JOIN staff st ON b.staff_id = st.id
JOIN rooms r ON b.room_id = r.id;

-- View for daily schedule
CREATE VIEW daily_schedule AS
SELECT 
    appointment_date,
    staff_id,
    staff_name,
    room_id,
    room_name,
    start_time,
    end_time,
    service_name,
    customer_name,
    status,
    payment_status
FROM booking_details
WHERE appointment_date >= CURRENT_DATE
ORDER BY appointment_date, start_time;

-- ========================================
-- FINAL SETUP NOTIFICATIONS
-- ========================================

-- Create a simple notification function for completed schema
CREATE OR REPLACE FUNCTION schema_setup_complete()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Dermal Skin Clinic database schema has been successfully created with ' ||
           (SELECT COUNT(*) FROM services) || ' services, ' ||
           (SELECT COUNT(*) FROM staff) || ' staff members, and ' ||
           (SELECT COUNT(*) FROM rooms) || ' rooms configured.';
END;
$$ LANGUAGE plpgsql;

-- Execute the notification
SELECT schema_setup_complete();