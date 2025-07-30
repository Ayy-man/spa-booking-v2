-- Manual Service Updates for Dermal Booking System
-- Run this in your Supabase SQL Editor to update services
-- Updated for actual database schema

-- 1. Add missing body treatment service
INSERT INTO services (id, name, description, category, duration, price, requires_room_3, is_couples_service, is_active) VALUES
('dead_sea_scrub_moisturizing', 'Dead Sea Salt Body Scrub + Deep Moisturizing', 'Exfoliating body scrub with Dead Sea salt followed by deep moisturizing treatment', 'body_scrub', 30, 65.00, true, false, true);

-- 2. Update existing service names and descriptions to match website exactly
UPDATE services SET 
  name = 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment',
  description = 'Detoxifying mud wrap treatment with deep moisturizing'
WHERE name = 'Mud Mask Body Wrap';

-- 3. Update facial service descriptions
UPDATE services SET description = 'Anti-Acne Facial (for Men & Women)' WHERE name = 'Anti-Acne Facial';
UPDATE services SET description = 'Basic Facial (For Men & Women)' WHERE name = 'Basic Facial';
UPDATE services SET description = 'Deep Cleansing Facial (for Men & Women)' WHERE name = 'Deep Cleansing Facial';
UPDATE services SET description = 'Placenta | Collagen Facial' WHERE name = 'Placenta/Collagen Facial';
UPDATE services SET description = 'Whitening Kojic Facial' WHERE name = 'Whitening Kojic Facial';
UPDATE services SET description = 'Microderm Facial' WHERE name = 'Microderm Facial';
UPDATE services SET description = 'Vitamin C Facial with Extreme Softness' WHERE name = 'Vitamin C Facial';
UPDATE services SET description = 'Acne Vulgaris Facial' WHERE name = 'Acne Vulgaris Facial';
UPDATE services SET description = 'Dermal VIP Card $50 / Year' WHERE name = 'Dermal VIP Card';

-- 4. Update package descriptions and mark as couples services
UPDATE services SET 
  description = 'Balinese Body Massage + Basic Facial',
  is_couples_service = true
WHERE name = 'Balinese Body Massage + Basic Facial';

UPDATE services SET 
  description = 'Deep Tissue Body Massage + 3Face',
  is_couples_service = true
WHERE name = 'Deep Tissue Body Massage + 3Face';

UPDATE services SET 
  description = 'Hot Stone Body Massage + Microderm Facial',
  is_couples_service = true
WHERE name = 'Hot Stone Body Massage + Microderm Facial';

-- 5. Update body treatment descriptions
UPDATE services SET description = 'Underarm Cleaning' WHERE name = 'Underarm Cleaning';
UPDATE services SET description = 'Back Treatment' WHERE name = 'Back Treatment';
UPDATE services SET description = 'Chemical Peel (Body) Per Area' WHERE name = 'Chemical Peel (Body)';
UPDATE services SET description = 'Underarm or Inguinal Whitening' WHERE name = 'Underarm/Inguinal Whitening';
UPDATE services SET description = 'Microdermabrasion (Body) Per Area' WHERE name = 'Microdermabrasion (Body)';
UPDATE services SET description = 'Deep Moisturizing Body Treatment' WHERE name = 'Deep Moisturizing Body Treatment';

-- 6. Update waxing service descriptions
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

-- 7. Update special service descriptions
UPDATE services SET description = 'Basic Vajacial Cleaning + Brazilian Wax' WHERE name = 'Basic Vajacial Cleaning + Brazilian Wax';

-- 8. Ensure all services are active
UPDATE services SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- 9. Update service IDs to match the booking page (if they don't exist, create them)
-- This ensures consistency between the frontend and database

-- 10. Verify the updates
SELECT 
  id,
  name, 
  description, 
  category, 
  price, 
  duration, 
  requires_room_3,
  is_couples_service,
  is_active 
FROM services 
ORDER BY category, name; 