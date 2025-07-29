-- Dermal Spa Booking System Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services table - all spa services
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('facials', 'massages', 'treatments', 'waxing', 'packages', 'special')),
    duration INTEGER NOT NULL, -- in minutes
    price DECIMAL(10,2) NOT NULL,
    requires_room_3 BOOLEAN DEFAULT FALSE,
    is_couples BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff table - all staff members
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialties TEXT,
    capabilities TEXT[] NOT NULL, -- Array of service categories they can perform
    work_days INTEGER[] NOT NULL, -- Array of day numbers (0=Sunday, 1=Monday, etc.)
    default_room INTEGER,
    initials TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table - spa rooms
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    capabilities TEXT[] NOT NULL, -- Array of service categories this room can handle
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table - customer information
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    ghl_customer_id TEXT, -- GoHighLevel customer ID for integration
    is_existing_customer BOOLEAN DEFAULT FALSE,
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table - all appointments
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id),
    staff_id TEXT REFERENCES staff(id),
    room_id INTEGER REFERENCES rooms(id),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_id TEXT, -- PayPal/GHL transaction ID
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no double booking (same staff, date, time)
    UNIQUE(staff_id, booking_date, booking_time),
    
    -- Ensure room capacity isn't exceeded (simplified constraint)
    UNIQUE(room_id, booking_date, booking_time, service_id)
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, booking_time);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_ghl_id ON customers(ghl_customer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (adjust as needed for production)
-- Services are publicly readable
CREATE POLICY "Services are publicly readable" ON services FOR SELECT USING (true);

-- Staff are publicly readable (for booking interface)
CREATE POLICY "Staff are publicly readable" ON staff FOR SELECT USING (is_active = true);

-- Rooms are publicly readable
CREATE POLICY "Rooms are publicly readable" ON rooms FOR SELECT USING (is_active = true);

-- Customers can be created by anyone (for new bookings)
CREATE POLICY "Anyone can create customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers are readable by anyone" ON customers FOR SELECT USING (true);

-- Bookings can be created by anyone (for new bookings)
CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings are readable by anyone" ON bookings FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert room data
INSERT INTO rooms (id, name, capacity, capabilities) VALUES
(1, 'Room 1', 1, ARRAY['facials', 'waxing']),
(2, 'Room 2', 2, ARRAY['facials', 'waxing', 'massages', 'packages']),
(3, 'Room 3', 2, ARRAY['facials', 'waxing', 'massages', 'treatments', 'packages', 'special']);

-- Insert staff data (from services-data.js)
INSERT INTO staff (id, name, email, phone, specialties, capabilities, work_days, default_room, initials) VALUES
('any', 'Any Available Staff', '', '', 'Any qualified staff member', ARRAY['facials', 'massages', 'treatments', 'waxing', 'packages', 'special'], ARRAY[0,1,2,3,4,5,6], NULL, 'AA'),
('selma', 'Selma Villaver', 'happyskinhappyyou@gmail.com', '(671) 482-7765', 'All Facials (except dermaplaning)', ARRAY['facials'], ARRAY[1,3,5,6,0], 1, 'SV'),
('robyn', 'Robyn Camacho', 'robyncmcho@gmail.com', '(671) 480-7862', 'Facials, Waxing, Body Treatments, Massages', ARRAY['facials', 'waxing', 'treatments', 'massages', 'packages', 'special'], ARRAY[0,1,2,3,4,5,6], 3, 'RC'),
('tanisha', 'Tanisha Harris', 'misstanishababyy@gmail.com', '(671) 747-5728', 'Facials and Waxing', ARRAY['facials', 'waxing'], ARRAY[1,3,5,6,0], 2, 'TH'),
('leonel', 'Leonel Sidon', 'sidonleonel@gmail.com', '(671) 747-1882', 'Body Massages and Treatments (Sundays only)', ARRAY['massages', 'treatments'], ARRAY[0], NULL, 'LS');

-- Insert services data (from services-data.js)
-- Facials
INSERT INTO services (id, name, category, duration, price) VALUES
('basic_facial', 'Basic Facial', 'facials', 30, 65.00),
('deep_cleansing_facial', 'Deep Cleansing Facial', 'facials', 60, 79.00),
('placenta_collagen_facial', 'Placenta/Collagen Facial', 'facials', 60, 90.00),
('whitening_kojic_facial', 'Whitening Kojic Facial', 'facials', 60, 90.00),
('anti_acne_facial', 'Anti-Acne Facial', 'facials', 60, 90.00),
('microderm_facial', 'Microderm Facial', 'facials', 60, 99.00),
('vitamin_c_facial', 'Vitamin C Facial', 'facials', 60, 120.00),
('acne_vulgaris_facial', 'Acne Vulgaris Facial', 'facials', 60, 120.00);

-- Massages
INSERT INTO services (id, name, category, duration, price) VALUES
('balinese_massage', 'Balinese Body Massage', 'massages', 60, 80.00),
('maternity_massage', 'Maternity Massage', 'massages', 60, 85.00),
('stretching_massage', 'Stretching Body Massage', 'massages', 60, 85.00),
('deep_tissue_massage', 'Deep Tissue Body Massage', 'massages', 60, 90.00),
('hot_stone_massage', 'Hot Stone Massage', 'massages', 60, 90.00),
('hot_stone_90', 'Hot Stone Massage 90 Minutes', 'massages', 90, 120.00);

-- Treatments (all require Room 3)
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('underarm_cleaning', 'Underarm Cleaning', 'treatments', 30, 99.00, true),
('back_treatment', 'Back Treatment', 'treatments', 30, 99.00, true),
('chemical_peel_body', 'Chemical Peel (Body)', 'treatments', 30, 85.00, true),
('underarm_whitening', 'Underarm/Inguinal Whitening', 'treatments', 30, 150.00, true),
('microdermabrasion_body', 'Microdermabrasion (Body)', 'treatments', 30, 85.00, true),
('deep_moisturizing', 'Deep Moisturizing Body Treatment', 'treatments', 30, 65.00, true),
('dead_sea_scrub', 'Dead Sea Salt Body Scrub', 'treatments', 30, 65.00, true),
('mud_mask_wrap', 'Mud Mask Body Wrap', 'treatments', 30, 65.00, true);

-- Waxing
INSERT INTO services (id, name, category, duration, price) VALUES
('eyebrow_waxing', 'Eyebrow Waxing', 'waxing', 15, 20.00),
('lip_waxing', 'Lip Waxing', 'waxing', 5, 10.00),
('half_arm_waxing', 'Half Arm Waxing', 'waxing', 15, 40.00),
('full_arm_waxing', 'Full Arm Waxing', 'waxing', 30, 60.00),
('chin_waxing', 'Chin Waxing', 'waxing', 5, 12.00),
('neck_waxing', 'Neck Waxing', 'waxing', 15, 30.00),
('lower_leg_waxing', 'Lower Leg Waxing', 'waxing', 30, 40.00),
('full_leg_waxing', 'Full Leg Waxing', 'waxing', 60, 80.00),
('full_face_waxing', 'Full Face Waxing', 'waxing', 30, 60.00),
('bikini_waxing', 'Bikini Waxing', 'waxing', 30, 35.00),
('underarm_waxing', 'Underarm Waxing', 'waxing', 15, 20.00),
('brazilian_wax_women', 'Brazilian Wax (Women)', 'waxing', 45, 60.00),
('brazilian_wax_men', 'Brazilian Waxing (Men)', 'waxing', 45, 75.00),
('chest_wax', 'Chest Wax', 'waxing', 30, 40.00),
('stomach_wax', 'Stomach Wax', 'waxing', 30, 40.00),
('shoulders_wax', 'Shoulders', 'waxing', 30, 30.00),
('feet_wax', 'Feet', 'waxing', 5, 30.00);

-- Packages (couples services)
INSERT INTO services (id, name, category, duration, price, is_couples) VALUES
('balinese_facial_package', 'Balinese Body Massage + Basic Facial', 'packages', 90, 130.00, true),
('deep_tissue_3face', 'Deep Tissue Body Massage + 3Face', 'packages', 120, 180.00, true),
('hot_stone_microderm', 'Hot Stone Body Massage + Microderm Facial', 'packages', 150, 200.00, true);

-- Special Services
INSERT INTO services (id, name, category, duration, price, requires_room_3) VALUES
('vajacial_brazilian', 'Basic Vajacial Cleaning + Brazilian Wax', 'special', 30, 90.00, true),
('dermal_vip', 'Dermal VIP Card', 'special', 30, 50.00, false);

-- Create a view for available booking slots (helper for frontend)
CREATE OR REPLACE VIEW available_slots AS
SELECT 
    s.id as staff_id,
    s.name as staff_name,
    s.capabilities,
    generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        INTERVAL '1 day'
    )::DATE as available_date,
    generate_series(
        '09:00:00'::TIME,
        '19:00:00'::TIME,
        INTERVAL '1 hour'
    ) as available_time
FROM staff s
WHERE s.is_active = true
  AND s.id != 'any'; -- Exclude "any" staff from slot generation

COMMENT ON VIEW available_slots IS 'Helper view to generate all possible booking slots for staff members';