-- Create All Services for Dermal Booking System
-- This script creates all services with IDs that match the booking page
-- Run this in your Supabase SQL Editor

-- Clear existing services (optional - comment out if you want to keep existing data)
-- DELETE FROM services;

-- Insert all services with correct IDs
INSERT INTO services (id, name, description, category, duration, price, requires_room_3, is_couples_service, is_active) VALUES

-- FACIALS
('basic_facial', 'Basic Facial (For Men & Women)', 'A gentle cleansing facial perfect for all skin types', 'facial', 30, 65.00, false, false, true),
('deep_cleansing_facial', 'Deep Cleansing Facial (for Men & Women)', 'Thorough pore cleansing and extraction facial', 'facial', 60, 79.00, false, false, true),
('placenta_collagen_facial', 'Placenta | Collagen Facial', 'Anti-aging facial with placenta and collagen treatment', 'facial', 60, 90.00, false, false, true),
('whitening_kojic_facial', 'Whitening Kojic Facial', 'Brightening facial with kojic acid for even skin tone', 'facial', 60, 90.00, false, false, true),
('anti_acne_facial', 'Anti-Acne Facial (for Men & Women)', 'Specialized treatment for acne-prone skin', 'facial', 60, 90.00, false, false, true),
('microderm_facial', 'Microderm Facial', 'Microdermabrasion facial for skin resurfacing', 'facial', 60, 99.00, false, false, true),
('vitamin_c_facial', 'Vitamin C Facial with Extreme Softness', 'Brightening facial with vitamin C treatment', 'facial', 60, 120.00, false, false, true),
('acne_vulgaris_facial', 'Acne Vulgaris Facial', 'Advanced acne treatment for problematic skin', 'facial', 60, 120.00, false, false, true),

-- BODY MASSAGES
('balinese_massage', 'Balinese Body Massage', 'Traditional Balinese relaxation massage', 'massage', 60, 80.00, false, false, true),
('maternity_massage', 'Maternity Massage', 'Specialized massage for expecting mothers', 'massage', 60, 85.00, false, false, true),
('stretching_massage', 'Stretching Body Massage', 'Therapeutic massage with stretching techniques', 'massage', 60, 85.00, false, false, true),
('deep_tissue_massage', 'Deep Tissue Body Massage', 'Intensive massage for muscle tension relief', 'massage', 60, 90.00, false, false, true),
('hot_stone_massage', 'Hot Stone Massage', 'Relaxing massage with heated stones', 'massage', 60, 90.00, false, false, true),
('hot_stone_90', 'Hot Stone Massage 90 Minutes', 'Extended hot stone massage session', 'massage', 90, 120.00, false, false, true),

-- BODY TREATMENTS
('underarm_cleaning', 'Underarm Cleaning', 'Professional underarm cleaning and treatment', 'body_treatment', 30, 99.00, false, false, true),
('back_treatment', 'Back Treatment', 'Deep cleansing and treatment for back acne', 'body_treatment', 30, 99.00, false, false, true),
('chemical_peel_body', 'Chemical Peel (Body) Per Area', 'Body chemical peel for skin renewal', 'body_treatment', 30, 85.00, false, false, true),
('underarm_whitening', 'Underarm or Inguinal Whitening', 'Specialized whitening treatment for sensitive areas', 'body_treatment', 30, 150.00, false, false, true),
('microdermabrasion_body', 'Microdermabrasion (Body) Per Area', 'Body microdermabrasion for smooth skin', 'body_treatment', 30, 85.00, false, false, true),
('deep_moisturizing', 'Deep Moisturizing Body Treatment', 'Intensive hydration treatment for dry skin', 'body_treatment', 30, 65.00, false, false, true),
('dead_sea_scrub', 'Dead Sea Salt Body Scrub', 'Exfoliating body scrub with Dead Sea salt', 'body_scrub', 30, 65.00, true, false, true),
('dead_sea_scrub_moisturizing', 'Dead Sea Salt Body Scrub + Deep Moisturizing', 'Exfoliating body scrub with Dead Sea salt followed by deep moisturizing treatment', 'body_scrub', 30, 65.00, true, false, true),
('mud_mask_wrap', 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment', 'Detoxifying mud wrap treatment with deep moisturizing', 'body_scrub', 30, 65.00, true, false, true),

-- WAXING SERVICES
('eyebrow_waxing', 'Eyebrow Waxing', 'Professional eyebrow shaping and waxing', 'waxing', 15, 20.00, false, false, true),
('lip_waxing', 'Lip Waxing', 'Upper lip hair removal', 'waxing', 5, 10.00, false, false, true),
('half_arm_waxing', 'Half Arm Waxing', 'Hair removal for lower or upper arms', 'waxing', 15, 40.00, false, false, true),
('full_arm_waxing', 'Full Arm Waxing', 'Complete arm hair removal', 'waxing', 30, 60.00, false, false, true),
('chin_waxing', 'Chin Waxing', 'Chin hair removal', 'waxing', 5, 12.00, false, false, true),
('neck_waxing', 'Neck Waxing', 'Neck hair removal', 'waxing', 15, 30.00, false, false, true),
('lower_leg_waxing', 'Lower Leg Waxing', 'Hair removal from knee to ankle', 'waxing', 30, 40.00, false, false, true),
('full_leg_waxing', 'Full Leg Waxing', 'Complete leg hair removal', 'waxing', 60, 80.00, false, false, true),
('full_face_waxing', 'Full Face Waxing', 'Complete facial hair removal', 'waxing', 30, 60.00, false, false, true),
('bikini_waxing', 'Bikini Waxing', 'Basic bikini line hair removal', 'waxing', 30, 35.00, false, false, true),
('underarm_waxing', 'Underarm Waxing', 'Underarm hair removal', 'waxing', 15, 20.00, false, false, true),
('brazilian_wax_women', 'Brazilian Wax ( Women )', 'Complete intimate area hair removal for women', 'waxing', 45, 60.00, false, false, true),
('brazilian_wax_men', 'Brazilian Waxing ( Men)', 'Complete intimate area hair removal for men', 'waxing', 45, 75.00, false, false, true),
('chest_wax', 'Chest Wax', 'Chest hair removal', 'waxing', 30, 40.00, false, false, true),
('stomach_wax', 'Stomach Wax', 'Stomach hair removal', 'waxing', 30, 40.00, false, false, true),
('shoulders_wax', 'Shoulders', 'Shoulder hair removal', 'waxing', 30, 30.00, false, false, true),
('feet_wax', 'Feet', 'Foot hair removal', 'waxing', 5, 30.00, false, false, true),

-- PACKAGE SERVICES (marked as couples services)
('balinese_facial_package', 'Balinese Body Massage + Basic Facial', 'Relaxing massage combined with facial treatment', 'package', 90, 130.00, false, true, true),
('deep_tissue_3face', 'Deep Tissue Body Massage + 3Face', 'Deep tissue massage with advanced facial treatment', 'package', 120, 180.00, false, true, true),
('hot_stone_microderm', 'Hot Stone Body Massage + Microderm Facial', 'Hot stone massage with microdermabrasion facial', 'package', 150, 200.00, false, true, true),

-- SPECIAL SERVICES
('vajacial_brazilian', 'Basic Vajacial Cleaning + Brazilian Wax', 'Intimate area cleaning and hair removal combo', 'waxing', 30, 90.00, false, false, true),
('dermal_vip', 'Dermal VIP Card $50 / Year', 'Annual VIP membership for exclusive benefits', 'membership', 30, 50.00, false, false, true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price,
  requires_room_3 = EXCLUDED.requires_room_3,
  is_couples_service = EXCLUDED.is_couples_service,
  is_active = EXCLUDED.is_active;

-- Verify all services were created
SELECT 
  id,
  name, 
  category, 
  price, 
  duration, 
  requires_room_3,
  is_couples_service,
  is_active 
FROM services 
ORDER BY category, name; 