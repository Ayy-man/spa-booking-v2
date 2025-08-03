-- Seed Data for Dermal Booking System
-- Initial data for rooms, staff, and services based on business requirements

-- Insert Rooms
INSERT INTO rooms (id, name, room_number, capacity, capabilities, has_body_scrub_equipment, is_couples_room) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Room 1',
    1,
    1,
    ARRAY['facial', 'massage', 'waxing', 'body_treatment'],
    false,
    false
),
(
    '22222222-2222-2222-2222-222222222222',
    'Room 2',
    2,
    2,
    ARRAY['facial', 'massage', 'waxing', 'body_treatment'],
    false,
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'Room 3',
    3,
    2,
    ARRAY['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub'],
    true,
    true
);

-- Insert Staff with their capabilities and schedules
INSERT INTO staff (id, name, email, phone, can_perform_services, default_room_id, schedule) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Selma Villaver',
    'happyskinhappyyou@gmail.com',
    '(671) 647-7546',
    ARRAY['facial'],
    '11111111-1111-1111-1111-111111111111', -- Room 1
    '{
        "mon": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "tue": {"available": false},
        "wed": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "thu": {"available": false},
        "fri": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sat": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sun": {"available": true, "start_time": "09:00", "end_time": "19:00"}
    }'::jsonb
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Robyn Camacho',
    'robyncmcho@gmail.com',
    '(671) 647-7546',
    ARRAY['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub'],
    '33333333-3333-3333-3333-333333333333', -- Room 3
    '{
        "mon": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "tue": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "wed": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "thu": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "fri": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sat": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sun": {"available": true, "start_time": "09:00", "end_time": "19:00"}
    }'::jsonb
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Tanisha Harris',
    'misstanishababyy@gmail.com',
    '(671) 647-7546',
    ARRAY['facial', 'waxing'],
    '22222222-2222-2222-2222-222222222222', -- Room 2
    '{
        "mon": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "tue": {"available": false},
        "wed": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "thu": {"available": false},
        "fri": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sat": {"available": true, "start_time": "09:00", "end_time": "19:00"},
        "sun": {"available": true, "start_time": "09:00", "end_time": "19:00"}
    }'::jsonb
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Leonel Sidon',
    'sidonleonel@gmail.com',
    '(671) 647-7546',
    ARRAY['massage', 'body_treatment'],
    NULL, -- No default room, assists anywhere
    '{
        "mon": {"available": false},
        "tue": {"available": false},
        "wed": {"available": false},
        "thu": {"available": false},
        "fri": {"available": false},
        "sat": {"available": false},
        "sun": {"available": true, "start_time": "09:00", "end_time": "19:00"}
    }'::jsonb
);

-- Insert Services
-- FACIALS
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Basic Facial', 'A gentle cleansing facial perfect for all skin types', 30, 65.00, 'facial', false, false),
('Deep Cleansing Facial', 'Thorough pore cleansing and extraction facial', 60, 79.00, 'facial', false, false),
('Placenta/Collagen Facial', 'Anti-aging facial with placenta and collagen treatment', 60, 90.00, 'facial', false, false),
('Whitening Kojic Facial', 'Brightening facial with kojic acid for even skin tone', 60, 90.00, 'facial', false, false),
('Anti-Acne Facial', 'Specialized treatment for acne-prone skin', 60, 90.00, 'facial', false, false),
('Microderm Facial', 'Microdermabrasion facial for skin resurfacing', 60, 99.00, 'facial', false, false),
('Vitamin C Facial', 'Brightening facial with vitamin C treatment', 60, 120.00, 'facial', false, false),
('Acne Vulgaris Facial', 'Advanced acne treatment for problematic skin', 60, 120.00, 'facial', false, false);

-- BODY MASSAGES
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Balinese Body Massage', 'Traditional Balinese relaxation massage', 60, 80.00, 'massage', false, false),
('Maternity Massage', 'Specialized massage for expecting mothers', 60, 85.00, 'massage', false, false),
('Stretching Body Massage', 'Therapeutic massage with stretching techniques', 60, 85.00, 'massage', false, false),
('Deep Tissue Body Massage', 'Intensive massage for muscle tension relief', 60, 90.00, 'massage', false, false),
('Hot Stone Massage', 'Relaxing massage with heated stones', 60, 90.00, 'massage', false, false),
('Hot Stone Massage 90 Minutes', 'Extended hot stone massage session', 90, 120.00, 'massage', false, false);

-- BODY TREATMENTS  
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Underarm Cleaning', 'Professional underarm cleaning and treatment', 30, 99.00, 'body_treatment', false, false),
('Back Treatment', 'Deep cleansing and treatment for back acne', 30, 99.00, 'body_treatment', false, false),
('Chemical Peel (Body)', 'Body chemical peel for skin renewal', 30, 85.00, 'body_treatment', false, false),
('Underarm/Inguinal Whitening', 'Specialized whitening treatment for sensitive areas', 30, 150.00, 'body_treatment', false, false),
('Microdermabrasion (Body)', 'Body microdermabrasion for smooth skin', 30, 85.00, 'body_treatment', false, false),
('Deep Moisturizing Body Treatment', 'Intensive hydration treatment for dry skin', 30, 65.00, 'body_treatment', false, false),
('Dead Sea Salt Body Scrub', 'Exfoliating body scrub with Dead Sea salt', 30, 65.00, 'body_scrub', false, true),
('Mud Mask Body Wrap', 'Detoxifying mud wrap treatment', 30, 65.00, 'body_scrub', false, true);

-- WAXING SERVICES
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Eyebrow Waxing', 'Professional eyebrow shaping and waxing', 15, 20.00, 'waxing', false, false),
('Lip Waxing', 'Upper lip hair removal', 5, 10.00, 'waxing', false, false),
('Half Arm Waxing', 'Hair removal for lower or upper arms', 15, 40.00, 'waxing', false, false),
('Full Arm Waxing', 'Complete arm hair removal', 30, 60.00, 'waxing', false, false),
('Chin Waxing', 'Chin hair removal', 5, 12.00, 'waxing', false, false),
('Neck Waxing', 'Neck hair removal', 15, 30.00, 'waxing', false, false),
('Lower Leg Waxing', 'Hair removal from knee to ankle', 30, 40.00, 'waxing', false, false),
('Full Leg Waxing', 'Complete leg hair removal', 60, 80.00, 'waxing', false, false),
('Full Face Waxing', 'Complete facial hair removal', 30, 60.00, 'waxing', false, false),
('Bikini Waxing', 'Basic bikini line hair removal', 30, 35.00, 'waxing', false, false),
('Underarm Waxing', 'Underarm hair removal', 15, 20.00, 'waxing', false, false),
('Brazilian Wax (Women)', 'Complete intimate area hair removal for women', 45, 60.00, 'waxing', false, false),
('Brazilian Waxing (Men)', 'Complete intimate area hair removal for men', 45, 75.00, 'waxing', false, false),
('Chest Wax', 'Chest hair removal', 30, 40.00, 'waxing', false, false),
('Stomach Wax', 'Stomach hair removal', 30, 40.00, 'waxing', false, false),
('Shoulders', 'Shoulder hair removal', 30, 30.00, 'waxing', false, false),
('Feet', 'Foot hair removal', 5, 30.00, 'waxing', false, false);

-- PACKAGE SERVICES (marked as couples services since they're extended treatments)
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room, is_package) VALUES
('Balinese Body Massage + Basic Facial', 'Relaxing massage combined with facial treatment', 90, 130.00, 'package', true, false, true),
('Deep Tissue Body Massage + 3Face', 'Deep tissue massage with advanced facial treatment', 120, 180.00, 'package', true, false, true),
('Hot Stone Body Massage + Microderm Facial', 'Hot stone massage with microdermabrasion facial', 150, 200.00, 'package', true, false, true);

-- SPECIAL SERVICES
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Basic Vajacial Cleaning + Brazilian Wax', 'Intimate area cleaning and hair removal combo', 30, 90.00, 'waxing', false, false),
('Dermal VIP Card', 'Annual VIP membership for exclusive benefits', 30, 50.00, 'membership', false, false);