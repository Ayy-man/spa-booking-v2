-- Direct SQL to populate Dermal Skin Clinic database
-- Run this in Supabase SQL Editor

-- First, temporarily disable RLS to allow data insertion
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Insert Rooms
INSERT INTO rooms (id, name, capacity, capabilities) VALUES
(1, 'Room 1', 1, ARRAY['facials'::service_category, 'waxing'::service_category]),
(2, 'Room 2', 2, ARRAY['facials'::service_category, 'waxing'::service_category, 'massages'::service_category, 'packages'::service_category]),
(3, 'Room 3', 2, ARRAY['facials'::service_category, 'waxing'::service_category, 'massages'::service_category, 'treatments'::service_category, 'packages'::service_category, 'special'::service_category])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  capabilities = EXCLUDED.capabilities;

-- Insert Staff
INSERT INTO staff (id, name, email, phone, specialties, capabilities, work_days, default_room_id, initials, role) VALUES
('any', 'Any Available Staff', '', '', 'Any qualified staff member', ARRAY['facials'::service_category, 'massages'::service_category, 'treatments'::service_category, 'waxing'::service_category, 'packages'::service_category, 'special'::service_category], ARRAY[0,1,2,3,4,5,6], NULL, 'AA', 'therapist'),
('selma', 'Selma Villaver', 'happyskinhappyyou@gmail.com', '(671) 482-7765', 'All Facials (except dermaplaning)', ARRAY['facials'::service_category], ARRAY[1,3,5,6,0], 1, 'SV', 'therapist'),
('robyn', 'Robyn Camacho', 'robyncmcho@gmail.com', '(671) 480-7862', 'Facials, Waxing, Body Treatments, Massages', ARRAY['facials'::service_category, 'waxing'::service_category, 'treatments'::service_category, 'massages'::service_category, 'packages'::service_category, 'special'::service_category], ARRAY[0,1,2,3,4,5,6], 3, 'RC', 'therapist'),
('tanisha', 'Tanisha Harris', 'misstanishababyy@gmail.com', '(671) 747-5728', 'Facials and Waxing', ARRAY['facials'::service_category, 'waxing'::service_category], ARRAY[1,3,5,6,0], 2, 'TH', 'therapist'),
('leonel', 'Leonel Sidon', 'sidonleonel@gmail.com', '(671) 747-1882', 'Body Massages and Treatments (Sundays only)', ARRAY['massages'::service_category, 'treatments'::service_category], ARRAY[0], NULL, 'LS', 'therapist')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  specialties = EXCLUDED.specialties,
  capabilities = EXCLUDED.capabilities,
  work_days = EXCLUDED.work_days,
  default_room_id = EXCLUDED.default_room_id,
  initials = EXCLUDED.initials;

-- Insert Services - Facials
INSERT INTO services (id, name, category, duration, price, requires_room_3, description) VALUES
('basic_facial', 'Basic Facial', 'facials', 30, 65.00, false, '30 minute facial service'),
('deep_cleansing_facial', 'Deep Cleansing Facial', 'facials', 60, 79.00, false, '60 minute facial service'),
('placenta_collagen_facial', 'Placenta/Collagen Facial', 'facials', 60, 90.00, false, '60 minute facial service'),
('whitening_kojic_facial', 'Whitening Kojic Facial', 'facials', 60, 90.00, false, '60 minute facial service'),
('anti_acne_facial', 'Anti-Acne Facial', 'facials', 60, 90.00, false, '60 minute facial service'),
('microderm_facial', 'Microderm Facial', 'facials', 60, 99.00, false, '60 minute facial service'),
('vitamin_c_facial', 'Vitamin C Facial', 'facials', 60, 120.00, false, '60 minute facial service'),
('acne_vulgaris_facial', 'Acne Vulgaris Facial', 'facials', 60, 120.00, false, '60 minute facial service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Insert Services - Massages
INSERT INTO services (id, name, category, duration, price, requires_room_3, description) VALUES
('balinese_massage', 'Balinese Body Massage', 'massages', 60, 80.00, false, '60 minute massage service'),
('maternity_massage', 'Maternity Massage', 'massages', 60, 85.00, false, '60 minute massage service'),
('stretching_massage', 'Stretching Body Massage', 'massages', 60, 85.00, false, '60 minute massage service'),
('deep_tissue_massage', 'Deep Tissue Body Massage', 'massages', 60, 90.00, false, '60 minute massage service'),
('hot_stone_massage', 'Hot Stone Massage', 'massages', 60, 90.00, false, '60 minute massage service'),
('hot_stone_90', 'Hot Stone Massage 90 Minutes', 'massages', 90, 120.00, false, '90 minute massage service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Insert Services - Treatments (all require Room 3)
INSERT INTO services (id, name, category, duration, price, requires_room_3, description) VALUES
('underarm_cleaning', 'Underarm Cleaning', 'treatments', 30, 99.00, true, '30 minute treatment service'),
('back_treatment', 'Back Treatment', 'treatments', 30, 99.00, true, '30 minute treatment service'),
('chemical_peel_body', 'Chemical Peel (Body)', 'treatments', 30, 85.00, true, '30 minute treatment service'),
('underarm_whitening', 'Underarm/Inguinal Whitening', 'treatments', 30, 150.00, true, '30 minute treatment service'),
('microdermabrasion_body', 'Microdermabrasion (Body)', 'treatments', 30, 85.00, true, '30 minute treatment service'),
('deep_moisturizing', 'Deep Moisturizing Body Treatment', 'treatments', 30, 65.00, true, '30 minute treatment service'),
('dead_sea_scrub', 'Dead Sea Salt Body Scrub', 'treatments', 30, 65.00, true, '30 minute treatment service'),
('mud_mask_wrap', 'Mud Mask Body Wrap', 'treatments', 30, 65.00, true, '30 minute treatment service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Insert Services - Waxing
INSERT INTO services (id, name, category, duration, price, requires_room_3, description) VALUES
('eyebrow_waxing', 'Eyebrow Waxing', 'waxing', 15, 20.00, false, '15 minute waxing service'),
('lip_waxing', 'Lip Waxing', 'waxing', 5, 10.00, false, '5 minute waxing service'),
('half_arm_waxing', 'Half Arm Waxing', 'waxing', 15, 40.00, false, '15 minute waxing service'),
('full_arm_waxing', 'Full Arm Waxing', 'waxing', 30, 60.00, false, '30 minute waxing service'),
('chin_waxing', 'Chin Waxing', 'waxing', 5, 12.00, false, '5 minute waxing service'),
('neck_waxing', 'Neck Waxing', 'waxing', 15, 30.00, false, '15 minute waxing service'),
('lower_leg_waxing', 'Lower Leg Waxing', 'waxing', 30, 40.00, false, '30 minute waxing service'),
('full_leg_waxing', 'Full Leg Waxing', 'waxing', 60, 80.00, false, '60 minute waxing service'),
('full_face_waxing', 'Full Face Waxing', 'waxing', 30, 60.00, false, '30 minute waxing service'),
('bikini_waxing', 'Bikini Waxing', 'waxing', 30, 35.00, false, '30 minute waxing service'),
('underarm_waxing', 'Underarm Waxing', 'waxing', 15, 20.00, false, '15 minute waxing service'),
('brazilian_wax_women', 'Brazilian Wax (Women)', 'waxing', 45, 60.00, false, '45 minute waxing service'),
('brazilian_wax_men', 'Brazilian Waxing (Men)', 'waxing', 45, 75.00, false, '45 minute waxing service'),
('chest_wax', 'Chest Wax', 'waxing', 30, 40.00, false, '30 minute waxing service'),
('stomach_wax', 'Stomach Wax', 'waxing', 30, 40.00, false, '30 minute waxing service'),
('shoulders_wax', 'Shoulders', 'waxing', 30, 30.00, false, '30 minute waxing service'),
('feet_wax', 'Feet', 'waxing', 5, 30.00, false, '5 minute waxing service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Insert Services - Packages (couples services)
INSERT INTO services (id, name, category, duration, price, is_couples_service, description) VALUES
('balinese_facial_package', 'Balinese Body Massage + Basic Facial', 'packages', 90, 130.00, true, '90 minute package service'),
('deep_tissue_3face', 'Deep Tissue Body Massage + 3Face', 'packages', 120, 180.00, true, '120 minute package service'),
('hot_stone_microderm', 'Hot Stone Body Massage + Microderm Facial', 'packages', 150, 200.00, true, '150 minute package service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Insert Services - Special Services
INSERT INTO services (id, name, category, duration, price, requires_room_3, description) VALUES
('vajacial_brazilian', 'Basic Vajacial Cleaning + Brazilian Wax', 'special', 30, 90.00, true, '30 minute special service'),
('dermal_vip', 'Dermal VIP Card', 'special', 30, 50.00, false, '30 minute special service')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price;

-- Re-enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Verify data was inserted
SELECT 'Rooms' as table_name, count(*) as count FROM rooms
UNION ALL
SELECT 'Staff' as table_name, count(*) as count FROM staff  
UNION ALL
SELECT 'Services' as table_name, count(*) as count FROM services
ORDER BY table_name;