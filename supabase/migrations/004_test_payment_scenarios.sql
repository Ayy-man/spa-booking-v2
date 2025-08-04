-- Test Payment Scenarios
-- This script creates sample bookings to test the payment tracking system
-- Run this ONLY in development/testing environment

-- Sample bookings with different payment options and statuses

-- Scenario 1: New customer paid deposit online
INSERT INTO bookings (
  customer_id, service_id, staff_id, room_id,
  appointment_date, start_time, end_time, duration,
  total_price, final_price, 
  payment_option, payment_status,
  status, notes
) VALUES (
  (SELECT id FROM customers LIMIT 1), -- Use existing customer
  (SELECT id FROM services WHERE name LIKE '%Facial%' LIMIT 1),
  (SELECT id FROM staff LIMIT 1),
  1,
  CURRENT_DATE + INTERVAL '7 days',
  '10:00', '11:00', 60,
  75, 75,
  'deposit', 'paid',
  'confirmed', 'Test: Deposit paid online, balance due at appointment'
) ON CONFLICT DO NOTHING;

-- Scenario 2: Existing customer chose to pay full amount online
INSERT INTO bookings (
  customer_id, service_id, staff_id, room_id,
  appointment_date, start_time, end_time, duration,
  total_price, final_price,
  payment_option, payment_status,
  status, notes
) VALUES (
  (SELECT id FROM customers LIMIT 1), 
  (SELECT id FROM services WHERE name LIKE '%Massage%' LIMIT 1),
  (SELECT id FROM staff LIMIT 1),
  2,
  CURRENT_DATE + INTERVAL '8 days',
  '14:00', '15:30', 90,
  120, 120,
  'full_payment', 'paid',
  'confirmed', 'Test: Full payment completed online'
) ON CONFLICT DO NOTHING;

-- Scenario 3: Existing customer chose to pay on location
INSERT INTO bookings (
  customer_id, service_id, staff_id, room_id,
  appointment_date, start_time, end_time, duration,
  total_price, final_price,
  payment_option, payment_status,
  status, notes
) VALUES (
  (SELECT id FROM customers LIMIT 1),
  (SELECT id FROM services WHERE name LIKE '%Wax%' LIMIT 1),
  (SELECT id FROM staff LIMIT 1),
  1,
  CURRENT_DATE + INTERVAL '9 days',
  '11:00', '12:00', 60,
  85, 85,
  'pay_on_location', 'pending',
  'confirmed', 'Test: Will pay full amount at spa'
) ON CONFLICT DO NOTHING;

-- Query to test the payment summary view
-- SELECT * FROM booking_payment_summary WHERE appointment_date >= CURRENT_DATE;