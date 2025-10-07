-- ============================================
-- GENERATE DEMO BOOKINGS
-- ============================================
-- This script creates realistic demo bookings for testing
-- Run this AFTER sanitize-for-demo.sql
-- 
-- Creates:
-- - 30 past bookings (last 30 days) 
-- - 15 upcoming bookings (next 14 days)
-- - Mix of services, staff, and booking types
-- ============================================

-- Clear existing bookings to avoid conflicts
TRUNCATE bookings CASCADE;
TRUNCATE payments CASCADE;
TRUNCATE booking_addons CASCADE;
TRUNCATE reschedule_history CASCADE;

-- ============================================
-- SECTION 1: GENERATE PAST BOOKINGS (30 bookings over last 30 days)
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_customer_id UUID;
  v_service_id TEXT;
  v_staff_id TEXT;
  v_room_id INTEGER;
  v_booking_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_duration INTEGER;
  v_price NUMERIC;
  v_status TEXT;
  v_payment_status TEXT;
  i INTEGER;
  v_hour INTEGER;
  v_minute INTEGER;
  v_booking_count INTEGER := 0;
BEGIN
  -- Generate past bookings
  FOR i IN 1..30 LOOP
    -- Random date in last 30 days
    v_booking_date := CURRENT_DATE - (random() * 30)::INTEGER;
    
    -- Skip Tuesdays and Thursdays (spa closed)
    CONTINUE WHEN EXTRACT(DOW FROM v_booking_date) IN (2, 4);
    
    -- Random customer (exclude system user)
    SELECT id INTO v_customer_id
    FROM customers 
    WHERE email != 'system@demo-spa.com'
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Random service
    SELECT id, duration, price 
    INTO v_service_id, v_duration, v_price
    FROM services 
    WHERE is_active = true 
      AND is_couples_service = false
      AND category IN ('facials', 'massages', 'treatments')
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Random staff who can perform the service
    SELECT s.id, s.default_room_id
    INTO v_staff_id, v_room_id
    FROM staff s, services srv
    WHERE s.id != 'any'
      AND srv.id = v_service_id
      AND srv.category = ANY(s.capabilities)
      AND EXTRACT(DOW FROM v_booking_date)::INTEGER = ANY(s.work_days)
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- If no staff found, skip
    IF v_staff_id IS NULL THEN
      v_staff_id := 'any';
      v_room_id := 1 + floor(random() * 3)::INTEGER;
    END IF;
    
    -- Ensure room_id is set
    IF v_room_id IS NULL THEN
      v_room_id := 1 + floor(random() * 3)::INTEGER;
    END IF;
    
    -- Generate random time slot (9am to 7pm)
    v_hour := 9 + floor(random() * 10)::INTEGER;
    v_minute := (floor(random() * 4)::INTEGER) * 15; -- 0, 15, 30, or 45
    v_start_time := make_time(v_hour, v_minute, 0);
    v_end_time := v_start_time + make_interval(mins => v_duration);
    
    -- Determine status (90% completed, 10% cancelled)
    IF random() < 0.1 THEN
      v_status := 'cancelled';
      v_payment_status := 'refunded';
    ELSE
      v_status := 'completed';
      v_payment_status := 'paid';
    END IF;
    
    -- Check for time conflicts
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE appointment_date = v_booking_date
        AND staff_id = v_staff_id
        AND status != 'cancelled'
        AND (
          (start_time <= v_start_time AND end_time > v_start_time) OR
          (start_time < v_end_time AND end_time >= v_end_time) OR
          (start_time >= v_start_time AND end_time <= v_end_time)
        )
    ) THEN
      -- Insert booking
      INSERT INTO bookings (
        id, customer_id, service_id, staff_id, room_id,
        appointment_date, start_time, end_time, duration,
        total_price, discount, final_price,
        status, payment_status, payment_option,
        notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_customer_id, v_service_id, v_staff_id, v_room_id,
        v_booking_date, v_start_time, v_end_time, v_duration,
        v_price, 0, v_price,
        v_status::booking_status, v_payment_status::payment_status, 'deposit',
        'Demo booking - past', 
        v_booking_date - INTERVAL '7 days', 
        v_booking_date - INTERVAL '7 days'
      ) RETURNING id INTO v_booking_id;
      
      -- Add payment for completed bookings
      IF v_status = 'completed' THEN
        INSERT INTO payments (
          booking_id, amount, payment_method, transaction_id,
          status, processed_at, created_at
        ) VALUES (
          v_booking_id, v_price, 
          CASE floor(random() * 3)::INTEGER
            WHEN 0 THEN 'credit_card'
            WHEN 1 THEN 'debit_card'
            ELSE 'cash'
          END,
          'DEMO-' || substring(v_booking_id::text, 1, 8),
          'paid'::payment_status,
          v_booking_date + INTERVAL '30 minutes',
          v_booking_date - INTERVAL '7 days'
        );
      END IF;
      
      v_booking_count := v_booking_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % past bookings', v_booking_count;
END $$;

-- ============================================
-- SECTION 2: GENERATE UPCOMING BOOKINGS (15 bookings over next 14 days)
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_customer_id UUID;
  v_service_id TEXT;
  v_staff_id TEXT;
  v_room_id INTEGER;
  v_booking_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_duration INTEGER;
  v_price NUMERIC;
  v_status TEXT;
  v_payment_status TEXT;
  i INTEGER;
  v_hour INTEGER;
  v_minute INTEGER;
  v_booking_count INTEGER := 0;
  v_original_booking_id UUID;
BEGIN
  -- Generate upcoming bookings
  FOR i IN 1..15 LOOP
    -- Random date in next 14 days
    v_booking_date := CURRENT_DATE + (1 + random() * 14)::INTEGER;
    
    -- Skip Tuesdays and Thursdays (spa closed)
    CONTINUE WHEN EXTRACT(DOW FROM v_booking_date) IN (2, 4);
    
    -- Random customer
    SELECT id INTO v_customer_id
    FROM customers 
    WHERE email != 'system@demo-spa.com'
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Random service
    SELECT id, duration, price 
    INTO v_service_id, v_duration, v_price
    FROM services 
    WHERE is_active = true 
      AND is_couples_service = false
      AND category IN ('facials', 'massages', 'treatments')
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Random staff
    SELECT s.id, s.default_room_id
    INTO v_staff_id, v_room_id
    FROM staff s, services srv
    WHERE s.id != 'any'
      AND srv.id = v_service_id
      AND srv.category = ANY(s.capabilities)
      AND EXTRACT(DOW FROM v_booking_date)::INTEGER = ANY(s.work_days)
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- If no staff found, use any
    IF v_staff_id IS NULL THEN
      v_staff_id := 'any';
      v_room_id := 1 + floor(random() * 3)::INTEGER;
    END IF;
    
    -- Ensure room_id is set
    IF v_room_id IS NULL THEN
      v_room_id := 1 + floor(random() * 3)::INTEGER;
    END IF;
    
    -- Generate time slot (9am to 7pm)
    v_hour := 9 + floor(random() * 10)::INTEGER;
    v_minute := (floor(random() * 4)::INTEGER) * 15;
    v_start_time := make_time(v_hour, v_minute, 0);
    v_end_time := v_start_time + make_interval(mins => v_duration);
    
    -- All upcoming bookings are confirmed
    v_status := 'confirmed';
    v_payment_status := 'pending';
    
    -- Check for conflicts
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE appointment_date = v_booking_date
        AND staff_id = v_staff_id
        AND status != 'cancelled'
        AND (
          (start_time <= v_start_time AND end_time > v_start_time) OR
          (start_time < v_end_time AND end_time >= v_end_time) OR
          (start_time >= v_start_time AND end_time <= v_end_time)
        )
    ) THEN
      -- 5% chance this is a rescheduled booking
      IF random() < 0.05 AND EXISTS (SELECT 1 FROM bookings WHERE status = 'completed' LIMIT 1) THEN
        -- Get a random completed booking to mark as rescheduled from
        SELECT id INTO v_original_booking_id
        FROM bookings 
        WHERE status = 'completed'
        ORDER BY RANDOM()
        LIMIT 1;
      ELSE
        v_original_booking_id := NULL;
      END IF;
      
      -- Insert booking
      INSERT INTO bookings (
        id, customer_id, service_id, staff_id, room_id,
        appointment_date, start_time, end_time, duration,
        total_price, discount, final_price,
        status, payment_status, payment_option,
        notes, 
        rescheduled_from, rescheduled_count,
        original_appointment_date, original_start_time,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_customer_id, v_service_id, v_staff_id, v_room_id,
        v_booking_date, v_start_time, v_end_time, v_duration,
        v_price, 0, v_price,
        v_status::booking_status, v_payment_status::payment_status, 'deposit',
        CASE 
          WHEN v_original_booking_id IS NOT NULL THEN 'Demo booking - rescheduled'
          ELSE 'Demo booking - upcoming'
        END,
        v_original_booking_id,
        CASE WHEN v_original_booking_id IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN v_original_booking_id IS NOT NULL THEN v_booking_date - INTERVAL '7 days' ELSE NULL END,
        CASE WHEN v_original_booking_id IS NOT NULL THEN v_start_time ELSE NULL END,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
      ) RETURNING id INTO v_booking_id;
      
      -- Add reschedule history if this is a rescheduled booking
      IF v_original_booking_id IS NOT NULL THEN
        INSERT INTO reschedule_history (
          original_booking_id, new_booking_id,
          old_appointment_date, old_start_time, old_end_time,
          new_appointment_date, new_start_time, new_end_time,
          old_staff_id, new_staff_id,
          old_room_id, new_room_id,
          reason, rescheduled_by,
          created_at
        ) VALUES (
          v_original_booking_id, v_booking_id,
          v_booking_date - INTERVAL '7 days', v_start_time, v_end_time,
          v_booking_date, v_start_time, v_end_time,
          v_staff_id, v_staff_id,
          v_room_id, v_room_id,
          'Customer requested new date', 'customer',
          NOW() - INTERVAL '2 days'
        );
      END IF;
      
      v_booking_count := v_booking_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % upcoming bookings', v_booking_count;
END $$;

-- ============================================
-- SECTION 3: ADD COUPLES BOOKINGS
-- ============================================
DO $$
DECLARE
  v_booking_id UUID;
  v_customer_id UUID;
  v_service_id TEXT;
  v_booking_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_duration INTEGER;
  v_price NUMERIC;
  i INTEGER;
BEGIN
  -- Add 2-3 couples bookings
  FOR i IN 1..3 LOOP
    -- Mix of past and future dates
    IF i = 1 THEN
      v_booking_date := CURRENT_DATE - 10;
    ELSIF i = 2 THEN
      v_booking_date := CURRENT_DATE + 5;
    ELSE
      v_booking_date := CURRENT_DATE + 10;
    END IF;
    
    -- Skip if it's a Tuesday or Thursday
    CONTINUE WHEN EXTRACT(DOW FROM v_booking_date) IN (2, 4);
    
    -- Random customer
    SELECT id INTO v_customer_id
    FROM customers 
    WHERE email != 'system@demo-spa.com'
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Get a couples service
    SELECT id, duration, price 
    INTO v_service_id, v_duration, v_price
    FROM services 
    WHERE is_active = true 
      AND is_couples_service = true
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Skip if no couples service found
    CONTINUE WHEN v_service_id IS NULL;
    
    -- Couples bookings typically in afternoon (2-5pm)
    v_start_time := make_time(14 + floor(random() * 3)::INTEGER, 0, 0);
    v_end_time := v_start_time + make_interval(mins => COALESCE(v_duration, 90));
    
    -- Check for conflicts in Room 4 (couples suite)
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE appointment_date = v_booking_date
        AND room_id = 4
        AND status != 'cancelled'
        AND (
          (start_time <= v_start_time AND end_time > v_start_time) OR
          (start_time < v_end_time AND end_time >= v_end_time)
        )
    ) THEN
      -- Insert couples booking
      INSERT INTO bookings (
        id, customer_id, service_id, staff_id, room_id,
        appointment_date, start_time, end_time, duration,
        total_price, discount, final_price,
        status, payment_status, payment_option,
        booking_type, notes,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_customer_id, v_service_id, 
        'STAFF004', -- Specialist handles couples
        4, -- Couples suite
        v_booking_date, v_start_time, v_end_time, COALESCE(v_duration, 90),
        COALESCE(v_price, 300), 0, COALESCE(v_price, 300),
        CASE 
          WHEN v_booking_date < CURRENT_DATE THEN 'completed'::booking_status
          ELSE 'confirmed'::booking_status
        END,
        CASE 
          WHEN v_booking_date < CURRENT_DATE THEN 'paid'::payment_status
          ELSE 'pending'::payment_status
        END,
        'deposit',
        'couple',
        'Demo couples booking',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
      ) RETURNING id INTO v_booking_id;
      
      -- Add payment for past couples bookings
      IF v_booking_date < CURRENT_DATE THEN
        INSERT INTO payments (
          booking_id, amount, payment_method, transaction_id,
          status, processed_at, created_at
        ) VALUES (
          v_booking_id, COALESCE(v_price, 300),
          'credit_card',
          'DEMO-COUPLES-' || substring(v_booking_id::text, 1, 8),
          'paid'::payment_status,
          v_booking_date + INTERVAL '1 hour',
          NOW() - INTERVAL '5 days'
        );
      END IF;
      
      RAISE NOTICE 'Created couples booking for %', v_booking_date;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- SECTION 4: ADD SOME MORNING AND EVENING BOOKINGS
-- ============================================
DO $$
DECLARE
  v_customer_id UUID;
  v_service_id TEXT;
  v_staff_id TEXT;
  v_room_id INTEGER;
  v_duration INTEGER;
  v_price NUMERIC;
  v_booking_date DATE;
BEGIN
  -- Add early morning booking (9am)
  v_booking_date := CURRENT_DATE + 3;
  
  -- Skip if Tuesday or Thursday
  IF EXTRACT(DOW FROM v_booking_date) NOT IN (2, 4) THEN
    SELECT id INTO v_customer_id FROM customers WHERE email = 'jane@example.com';
    SELECT id, duration, price INTO v_service_id, v_duration, v_price
    FROM services WHERE category = 'facials' AND is_active = true LIMIT 1;
    
    INSERT INTO bookings (
      customer_id, service_id, staff_id, room_id,
      appointment_date, start_time, end_time, duration,
      total_price, discount, final_price,
      status, payment_status, payment_option,
      notes, created_at, updated_at
    ) VALUES (
      v_customer_id, v_service_id, 'STAFF002', 2,
      v_booking_date, '09:00:00'::TIME, '10:00:00'::TIME, 60,
      COALESCE(v_price, 100), 0, COALESCE(v_price, 100),
      'confirmed'::booking_status, 'pending'::payment_status, 'deposit',
      'Early morning facial - Demo', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
    );
  END IF;
  
  -- Add evening booking (6pm)
  v_booking_date := CURRENT_DATE + 4;
  
  IF EXTRACT(DOW FROM v_booking_date) NOT IN (2, 4) THEN
    SELECT id INTO v_customer_id FROM customers WHERE email = 'michael@example.com';
    SELECT id, duration, price INTO v_service_id, v_duration, v_price
    FROM services WHERE category = 'massages' AND is_active = true LIMIT 1;
    
    -- Check for conflicts
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE appointment_date = v_booking_date
        AND staff_id = 'STAFF001'
        AND start_time = '18:00:00'::TIME
    ) THEN
      INSERT INTO bookings (
        customer_id, service_id, staff_id, room_id,
        appointment_date, start_time, end_time, duration,
        total_price, discount, final_price,
        status, payment_status, payment_option,
        notes, created_at, updated_at
      ) VALUES (
        v_customer_id, v_service_id, 'STAFF001', 1,
        v_booking_date, '18:00:00'::TIME, '19:30:00'::TIME, 90,
        COALESCE(v_price, 150), 0, COALESCE(v_price, 150),
        'confirmed'::booking_status, 'pending'::payment_status, 'deposit',
        'Evening massage - Demo', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
      );
    END IF;
  END IF;
END $$;

-- ============================================
-- SECTION 5: SUMMARY
-- ============================================
DO $$
DECLARE
  v_total_bookings INTEGER;
  v_past_bookings INTEGER;
  v_upcoming_bookings INTEGER;
  v_cancelled_bookings INTEGER;
  v_couples_bookings INTEGER;
  v_rescheduled_bookings INTEGER;
  v_payments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_bookings FROM bookings;
  SELECT COUNT(*) INTO v_past_bookings FROM bookings WHERE appointment_date < CURRENT_DATE;
  SELECT COUNT(*) INTO v_upcoming_bookings FROM bookings WHERE appointment_date >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_cancelled_bookings FROM bookings WHERE status = 'cancelled';
  SELECT COUNT(*) INTO v_couples_bookings FROM bookings WHERE booking_type = 'couple';
  SELECT COUNT(*) INTO v_rescheduled_bookings FROM bookings WHERE rescheduled_from IS NOT NULL;
  SELECT COUNT(*) INTO v_payments_count FROM payments;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DEMO BOOKINGS GENERATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total bookings created: %', v_total_bookings;
  RAISE NOTICE '  - Past bookings: %', v_past_bookings;
  RAISE NOTICE '  - Upcoming bookings: %', v_upcoming_bookings;
  RAISE NOTICE '  - Cancelled bookings: %', v_cancelled_bookings;
  RAISE NOTICE '  - Couples bookings: %', v_couples_bookings;
  RAISE NOTICE '  - Rescheduled bookings: %', v_rescheduled_bookings;
  RAISE NOTICE 'Payments created: %', v_payments_count;
  RAISE NOTICE '============================================';
END $$;