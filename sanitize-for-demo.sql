-- ============================================
-- SANITIZE DATABASE FOR DEMO
-- ============================================
-- This script clears all sensitive data and replaces it with demo data
-- Run this script to prepare the database for public demo or sharing
-- 
-- WARNING: This will DELETE all transactional data!
-- Make sure to backup your database before running this script
-- ============================================

-- ============================================
-- SECTION 1: CLEAR ALL TRANSACTIONAL DATA
-- ============================================
-- Clear all booking-related and transactional tables
-- Using CASCADE to handle foreign key dependencies

TRUNCATE webhook_failures CASCADE;
TRUNCATE walk_ins CASCADE;
TRUNCATE waivers CASCADE;
TRUNCATE staff_assignment_history CASCADE;
TRUNCATE reschedule_history CASCADE;
TRUNCATE payments CASCADE;
TRUNCATE booking_addons CASCADE;
TRUNCATE bookings CASCADE;
TRUNCATE booking_errors CASCADE;
TRUNCATE admin_notification_history CASCADE;
TRUNCATE notifications CASCADE;
TRUNCATE schedule_blocks CASCADE;
TRUNCATE staff_schedules CASCADE;

-- ============================================
-- SECTION 2: REPLACE STAFF WITH DEMO DATA
-- ============================================
-- Remove existing staff and insert demo staff members
-- Note: Using actual enum values from migrations: facials, massages, treatments, body_treatments

DELETE FROM staff;

INSERT INTO staff (id, name, email, phone, specialties, initials, capabilities, work_days, role, default_room_id, service_exclusions, created_at, updated_at) VALUES
('STAFF001', 'Sarah Demo', 'sarah@demo-spa.com', '555-0101', 'Swedish Massage, Deep Tissue, Hot Stone', 'SD', ARRAY['massages', 'facials']::service_category[], ARRAY[1,2,3,4,5]::integer[], 'therapist', 1, ARRAY[]::text[], NOW(), NOW()),
('STAFF002', 'John Sample', 'john@demo-spa.com', '555-0102', 'Facials, Chemical Peels, Microdermabrasion', 'JS', ARRAY['facials', 'treatments']::service_category[], ARRAY[1,2,3,4,5]::integer[], 'therapist', 2, ARRAY['radio_frequency']::text[], NOW(), NOW()),
('STAFF003', 'Maria Test', 'maria@demo-spa.com', '555-0103', 'Body Wraps, Scrubs, Detox Treatments', 'MT', ARRAY['treatments', 'massages']::service_category[], ARRAY[2,3,4,5,6]::integer[], 'therapist', 3, ARRAY[]::text[], NOW(), NOW()),
('STAFF004', 'David Example', 'david@demo-spa.com', '555-0104', 'All Services, Training, Quality Control', 'DE', ARRAY['massages', 'facials', 'treatments']::service_category[], ARRAY[1,3,4,5,6]::integer[], 'therapist', NULL, ARRAY[]::text[], NOW(), NOW()),
('STAFF005', 'Lisa Demo', 'lisa@demo-spa.com', '555-0105', 'Couples Treatments, Aromatherapy, Relaxation', 'LD', ARRAY['massages', 'facials']::service_category[], ARRAY[2,3,4,5,6]::integer[], 'therapist', NULL, ARRAY[]::text[], NOW(), NOW()),
('any', 'Any Available Staff', '', '', 'Any qualified staff member', 'AA', ARRAY['massages', 'facials', 'treatments']::service_category[], ARRAY[0,1,2,3,4,5,6]::integer[], 'therapist', NULL, ARRAY[]::text[], NOW(), NOW());

-- ============================================
-- SECTION 3: REPLACE CUSTOMERS WITH DEMO DATA
-- ============================================
-- Clear existing customers and add demo customers

DELETE FROM customers;

INSERT INTO customers (id, first_name, last_name, email, phone, address, city, postal_code, date_of_birth, emergency_contact_name, emergency_contact_phone, medical_conditions, allergies, skin_type, marketing_consent, notes, total_visits, total_spent, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Jane', 'Demo', 'jane@example.com', '555-1001', '123 Main St', 'Demo City', '90210', '1985-03-15', 'John Demo', '555-2001', 'None', 'None', 'Normal', true, 'Regular customer, prefers morning appointments', 12, 2400.00, NOW() - INTERVAL '6 months', NOW()),
('22222222-2222-2222-2222-222222222222', 'Robert', 'Sample', 'robert@example.com', '555-1002', '456 Oak Ave', 'Demo City', '90210', '1978-07-22', 'Mary Sample', '555-2002', 'High blood pressure', 'Latex', 'Dry', true, 'VIP customer, appreciates premium services', 24, 4800.00, NOW() - INTERVAL '1 year', NOW()),
('33333333-3333-3333-3333-333333333333', 'Emily', 'Test', 'emily@example.com', '555-1003', '789 Pine Rd', 'Demo City', '90211', '1990-11-08', 'David Test', '555-2003', 'None', 'Nuts, certain essential oils', 'Sensitive', true, 'New customer, sensitive skin needs gentle products', 6, 900.00, NOW() - INTERVAL '3 months', NOW()),
('44444444-4444-4444-4444-444444444444', 'Michael', 'Example', 'michael@example.com', '555-1004', '321 Elm St', 'Demo City', '90212', '1982-05-30', 'Sarah Example', '555-2004', 'Diabetes', 'None', 'Oily', false, 'Long-time customer, prefers deep tissue massage', 48, 7200.00, NOW() - INTERVAL '2 years', NOW()),
('55555555-5555-5555-5555-555555555555', 'Anna', 'Demo', 'anna@example.com', '555-1005', '654 Maple Dr', 'Demo City', '90213', '1995-09-17', 'Peter Demo', '555-2005', 'Pregnancy', 'Shellfish', 'Combination', true, 'Pregnant customer, requires prenatal massage', 2, 350.00, NOW() - INTERVAL '1 month', NOW()),
('66666666-6666-6666-6666-666666666666', 'James', 'Sample', 'james@example.com', '555-1006', '987 Cedar Ln', 'Demo City', '90214', '1970-12-25', 'Linda Sample', '555-2006', 'Arthritis', 'None', 'Normal', true, 'Senior customer, prefers gentle treatments', 15, 2250.00, NOW() - INTERVAL '8 months', NOW()),
('77777777-7777-7777-7777-777777777777', 'Sophia', 'Test', 'sophia@example.com', '555-1007', '147 Birch Way', 'Demo City', '90215', '1988-04-03', 'Marcus Test', '555-2007', 'None', 'None', 'Normal', true, 'First-time customer, interested in facial treatments', 1, 150.00, NOW() - INTERVAL '2 weeks', NOW()),
('88888888-8888-8888-8888-888888888888', 'System', 'User', 'system@demo-spa.com', '555-0000', 'N/A', 'Demo City', '90210', NULL, NULL, NULL, NULL, NULL, NULL, false, 'System user for automated bookings', 0, 0.00, NOW(), NOW());

-- ============================================
-- SECTION 4: UPDATE SERVICES TO USE ROUNDED DEMO PRICES
-- ============================================
-- Update all service prices to use clean, rounded numbers

UPDATE services SET 
  price = CASE 
    WHEN price < 50 THEN 50
    WHEN price < 100 THEN 75
    WHEN price < 150 THEN 100
    WHEN price < 200 THEN 150
    WHEN price < 250 THEN 200
    WHEN price < 300 THEN 250
    WHEN price < 400 THEN 300
    WHEN price < 500 THEN 400
    ELSE 500
  END,
  updated_at = NOW();

-- Update service descriptions to be more generic
UPDATE services SET 
  description = CASE
    WHEN category = 'facials' THEN 'Professional facial treatment for skin rejuvenation'
    WHEN category = 'massages' THEN 'Therapeutic massage for relaxation and wellness'
    WHEN category = 'treatments' THEN 'Luxurious body treatment for total relaxation'
    ELSE 'Premium spa service'
  END,
  updated_at = NOW()
WHERE description IS NOT NULL;

-- ============================================
-- SECTION 5: RENAME ROOMS TO GENERIC NAMES
-- ============================================
-- Update room names to be generic

UPDATE rooms SET
  name = CASE
    WHEN id = 1 THEN 'Treatment Room 1'
    WHEN id = 2 THEN 'Treatment Room 2'
    WHEN id = 3 THEN 'Treatment Room 3'
    WHEN id = 4 THEN 'Couples Suite'
    ELSE CONCAT('Room ', id)
  END,
  updated_at = NOW();

-- ============================================
-- SECTION 6: ADD DEMO BOOKINGS FOR OCT-DEC 2025
-- ============================================
-- Create a function to generate random bookings
DO $$
DECLARE
  booking_date DATE;
  service_rec RECORD;
  customer_rec RECORD;
  staff_rec RECORD;
  room_id INTEGER;
  start_hour INTEGER;
  start_minute INTEGER;
  booking_duration INTEGER;
  booking_price NUMERIC;
  bookings_per_day INTEGER;
  i INTEGER;
  staff_capabilities TEXT;
BEGIN
  -- Loop through each day from Oct 1 to Dec 31, 2025
  FOR booking_date IN SELECT generate_series('2025-10-01'::date, '2025-12-31'::date, '1 day'::interval)::date
  LOOP
    -- Skip Tuesdays and Thursdays (spa closed days)
    IF EXTRACT(DOW FROM booking_date) NOT IN (2, 4) THEN
      -- Generate 3-4 bookings per day
      bookings_per_day := 3 + floor(random() * 2)::INTEGER;
      
      FOR i IN 1..bookings_per_day
      LOOP
        -- Select random service (exclude couples services as they need special handling)
        SELECT * INTO service_rec FROM services 
        WHERE is_active = true 
          AND is_couples_service = false
        ORDER BY RANDOM() 
        LIMIT 1;
        
        -- Select random customer (exclude system user)
        SELECT * INTO customer_rec FROM customers 
        WHERE id != '88888888-8888-8888-8888-888888888888'
        ORDER BY RANDOM() 
        LIMIT 1;
        
        -- Map service category to staff capabilities (they should match now)
        staff_capabilities := service_rec.category;
        
        -- Select random staff member who works on this day and can perform the service
        SELECT * INTO staff_rec FROM staff 
        WHERE id != 'any' 
          AND EXTRACT(DOW FROM booking_date)::integer = ANY(work_days)
          AND staff_capabilities = ANY(capabilities::text[])
        ORDER BY RANDOM() 
        LIMIT 1;
        
        -- If no staff found, use 'any' staff
        IF staff_rec.id IS NULL THEN
          SELECT * INTO staff_rec FROM staff WHERE id = 'any';
        END IF;
        
        -- Select appropriate room based on service
        IF service_rec.requires_room_3 = true THEN
          room_id := 3;
        ELSIF staff_rec.default_room_id IS NOT NULL THEN
          room_id := staff_rec.default_room_id;
        ELSE
          -- Random room 1-3
          room_id := 1 + floor(random() * 3)::INTEGER;
        END IF;
        
        -- Generate random start time between 9 AM and 5 PM
        start_hour := 9 + floor(random() * 8)::INTEGER;
        start_minute := (floor(random() * 4)::INTEGER) * 15; -- 0, 15, 30, or 45
        
        -- Use service duration
        booking_duration := service_rec.duration;
        booking_price := service_rec.price;
        
        -- Insert booking
        BEGIN
          INSERT INTO bookings (
            id,
            customer_id,
            service_id,
            staff_id,
            room_id,
            appointment_date,
            start_time,
            end_time,
            duration,
            total_price,
            discount,
            final_price,
            status,
            payment_status,
            notes,
            payment_option,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            customer_rec.id,
            service_rec.id,
            staff_rec.id,
            room_id,
            booking_date,
            make_time(start_hour, start_minute, 0),
            make_time(start_hour, start_minute, 0) + make_interval(mins => booking_duration),
            booking_duration,
            booking_price,
            0,
            booking_price,
            CASE 
              WHEN booking_date < CURRENT_DATE THEN 'completed'::booking_status
              WHEN booking_date = CURRENT_DATE THEN 'confirmed'::booking_status
              ELSE 'confirmed'::booking_status
            END,
            CASE 
              WHEN booking_date < CURRENT_DATE THEN 'paid'::payment_status
              ELSE 'pending'::payment_status
            END,
            'Demo booking - ' || service_rec.name,
            'deposit',
            NOW() - INTERVAL '30 days' + (random() * INTERVAL '20 days'),
            NOW()
          );
        EXCEPTION
          WHEN OTHERS THEN
            -- Skip if there's a conflict (e.g., overlapping booking)
            NULL;
        END;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- SECTION 7: ADD SOME COUPLES BOOKINGS
-- ============================================
-- Add a few couples bookings for variety
DO $$
DECLARE
  booking_date DATE;
  service_rec RECORD;
  customer_rec RECORD;
  i INTEGER;
BEGIN
  -- Add 10 couples bookings spread across Oct-Dec 2025
  FOR i IN 1..10
  LOOP
    -- Random date in Oct-Dec 2025, excluding Tue/Thu
    LOOP
      booking_date := '2025-10-01'::date + (random() * 92)::integer;
      EXIT WHEN EXTRACT(DOW FROM booking_date) NOT IN (2, 4);
    END LOOP;
    
    -- Select a couples service
    SELECT * INTO service_rec FROM services 
    WHERE is_couples_service = true
      AND is_active = true
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Skip if no couples service found
    IF service_rec.id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Select random customer
    SELECT * INTO customer_rec FROM customers 
    WHERE id != '88888888-8888-8888-8888-888888888888'
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Insert couples booking
    BEGIN
      INSERT INTO bookings (
        id,
        customer_id,
        service_id,
        staff_id,
        room_id,
        appointment_date,
        start_time,
        end_time,
        duration,
        total_price,
        discount,
        final_price,
        status,
        payment_status,
        booking_type,
        notes,
        payment_option,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        customer_rec.id,
        service_rec.id,
        'STAFF004', -- Specialist for couples
        4, -- Couples suite
        booking_date,
        make_time(14 + floor(random() * 3)::integer, 0, 0), -- 2-5 PM
        make_time(14 + floor(random() * 3)::integer, 0, 0) + make_interval(mins => service_rec.duration),
        service_rec.duration,
        service_rec.price,
        0,
        service_rec.price,
        'confirmed'::booking_status,
        'pending'::payment_status,
        'couple',
        'Demo couples booking - ' || service_rec.name,
        'deposit',
        NOW() - INTERVAL '20 days' + (random() * INTERVAL '10 days'),
        NOW()
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip if there's a conflict
        NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- SECTION 8: ADD DEMO NOTIFICATIONS
-- ============================================
-- Add some demo admin notifications

INSERT INTO notifications (
  id, type, title, message, priority, metadata, 
  created_at
) VALUES
(gen_random_uuid(), 'system_alert', 'Demo Database Initialized', 
 'Database has been sanitized and populated with demo data', 
 'low', '{"source": "sanitize_script"}'::jsonb, 
 NOW()),

(gen_random_uuid(), 'new_booking', 'Demo Bookings Created', 
 'Demo bookings have been created for October - December 2025', 
 'normal', '{"months": ["October", "November", "December"]}'::jsonb, 
 NOW());

-- ============================================
-- SECTION 9: CREATE SAMPLE PAYMENTS FOR PAST BOOKINGS
-- ============================================
-- Add payment records for completed bookings
INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status, processed_at)
SELECT 
  id,
  final_price,
  CASE floor(random() * 3)::integer
    WHEN 0 THEN 'credit_card'
    WHEN 1 THEN 'debit_card'
    ELSE 'cash'
  END,
  'DEMO-' || substring(id::text, 1, 8),
  'paid'::payment_status,
  created_at + INTERVAL '1 hour'
FROM bookings
WHERE status = 'completed'
  AND appointment_date < CURRENT_DATE;

-- ============================================
-- SECTION 10: FINAL CLEANUP AND OPTIMIZATION
-- ============================================

-- Update statistics for better query performance
ANALYZE;

-- ============================================
-- SUMMARY OUTPUT
-- ============================================
DO $$
DECLARE
  staff_count INTEGER;
  customer_count INTEGER;
  booking_count INTEGER;
  oct_count INTEGER;
  nov_count INTEGER;
  dec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO staff_count FROM staff WHERE id != 'any';
  SELECT COUNT(*) INTO customer_count FROM customers WHERE email != 'system@demo-spa.com';
  SELECT COUNT(*) INTO booking_count FROM bookings;
  SELECT COUNT(*) INTO oct_count FROM bookings WHERE EXTRACT(MONTH FROM appointment_date) = 10 AND EXTRACT(YEAR FROM appointment_date) = 2025;
  SELECT COUNT(*) INTO nov_count FROM bookings WHERE EXTRACT(MONTH FROM appointment_date) = 11 AND EXTRACT(YEAR FROM appointment_date) = 2025;
  SELECT COUNT(*) INTO dec_count FROM bookings WHERE EXTRACT(MONTH FROM appointment_date) = 12 AND EXTRACT(YEAR FROM appointment_date) = 2025;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DATABASE SANITIZATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Staff members created: %', staff_count;
  RAISE NOTICE 'Demo customers created: %', customer_count;
  RAISE NOTICE 'Total bookings created: %', booking_count;
  RAISE NOTICE '  - October 2025: %', oct_count;
  RAISE NOTICE '  - November 2025: %', nov_count;
  RAISE NOTICE '  - December 2025: %', dec_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All sensitive data has been replaced with demo data.';
  RAISE NOTICE 'The database is now safe for demonstration purposes.';
  RAISE NOTICE '============================================';
END $$;