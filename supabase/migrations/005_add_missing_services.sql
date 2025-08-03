-- Add missing services to match the complete website service list
-- Migration: 005_add_missing_services.sql

-- Add missing body treatment service
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Dead Sea Salt Body Scrub + Deep Moisturizing', 'Exfoliating body scrub with Dead Sea salt followed by deep moisturizing treatment', 30, 65.00, 'body_scrub', false, true);

-- Update existing service names to match website exactly
UPDATE services SET name = 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment' WHERE name = 'Mud Mask Body Wrap';

-- Update service descriptions to be more accurate
UPDATE services SET description = 'Anti-Acne Facial (for Men & Women)' WHERE name = 'Anti-Acne Facial';
UPDATE services SET description = 'Basic Facial (For Men & Women)' WHERE name = 'Basic Facial';
UPDATE services SET description = 'Deep Cleansing Facial (for Men & Women)' WHERE name = 'Deep Cleansing Facial';
UPDATE services SET description = 'Placenta | Collagen Facial' WHERE name = 'Placenta/Collagen Facial';
UPDATE services SET description = 'Whitening Kojic Facial' WHERE name = 'Whitening Kojic Facial';
UPDATE services SET description = 'Microderm Facial' WHERE name = 'Microderm Facial';
UPDATE services SET description = 'Vitamin C Facial with Extreme Softness' WHERE name = 'Vitamin C Facial';
UPDATE services SET description = 'Acne Vulgaris Facial' WHERE name = 'Acne Vulgaris Facial';
UPDATE services SET description = 'Dermal VIP Card $50 / Year' WHERE name = 'Dermal VIP Card';

-- Update package descriptions to match website
UPDATE services SET description = 'Balinese Body Massage + Basic Facial' WHERE name = 'Balinese Body Massage + Basic Facial';
UPDATE services SET description = 'Deep Tissue Body Massage + 3Face' WHERE name = 'Deep Tissue Body Massage + 3Face';
UPDATE services SET description = 'Hot Stone Body Massage + Microderm Facial' WHERE name = 'Hot Stone Body Massage + Microderm Facial';

-- Update body treatment descriptions
UPDATE services SET description = 'Underarm Cleaning' WHERE name = 'Underarm Cleaning';
UPDATE services SET description = 'Back Treatment' WHERE name = 'Back Treatment';
UPDATE services SET description = 'Chemical Peel (Body) Per Area' WHERE name = 'Chemical Peel (Body)';
UPDATE services SET description = 'Underarm or Inguinal Whitening' WHERE name = 'Underarm/Inguinal Whitening';
UPDATE services SET description = 'Microdermabrasion (Body) Per Area' WHERE name = 'Microdermabrasion (Body)';
UPDATE services SET description = 'Deep Moisturizing Body Treatment' WHERE name = 'Deep Moisturizing Body Treatment';
UPDATE services SET description = 'Dead Sea Salt Body Scrub + Deep Moisturizing' WHERE name = 'Dead Sea Salt Body Scrub + Deep Moisturizing';

-- Update waxing service descriptions
UPDATE services SET description = 'Eyebrow Waxing' WHERE name = 'Eyebrow Waxing';
UPDATE services SET description = 'Lip Waxing' WHERE name = 'Lip Waxing';
UPDATE services SET description = 'Half Arm Waxing' WHERE name = 'Half Arm Waxing';
UPDATE services SET description = 'Full Arm Waxing' WHERE name = 'Full Arm Waxing';
UPDATE services SET description = 'Chin Waxing' WHERE name = 'Chin Waxing';
UPDATE services SET description = 'Neck Waxing' WHERE name = 'Neck Waxing';
UPDATE services SET description = 'Lower Leg Waxing' WHERE name = 'Lower Leg Waxing';
UPDATE services SET description = 'Full Leg Waxing' WHERE name = 'Full Leg Waxing';
UPDATE services SET description = 'Full Face Waxing' WHERE name = 'Full Face Waxing';
UPDATE services SET description = 'Bikini Waxing' WHERE name = 'Bikini Waxing';
UPDATE services SET description = 'Underarm Waxing' WHERE name = 'Underarm Waxing';
UPDATE services SET description = 'Brazilian Wax ( Women )' WHERE name = 'Brazilian Wax (Women)';
UPDATE services SET description = 'Brazilian Waxing ( Men)' WHERE name = 'Brazilian Waxing (Men)';
UPDATE services SET description = 'Chest Wax' WHERE name = 'Chest Wax';
UPDATE services SET description = 'Stomach Wax' WHERE name = 'Stomach Wax';
UPDATE services SET description = 'Shoulders' WHERE name = 'Shoulders';
UPDATE services SET description = 'Feet' WHERE name = 'Feet';

-- Update special service descriptions
UPDATE services SET description = 'Basic Vajacial Cleaning + Brazilian Wax' WHERE name = 'Basic Vajacial Cleaning + Brazilian Wax';

-- Ensure all services are active
UPDATE services SET is_active = true WHERE is_active IS NULL OR is_active = false; 