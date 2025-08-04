-- Simple Test Payment Scenarios (Manual)
-- This script provides examples - run manually and adjust as needed
-- DO NOT run automatically - adjust customer_id, service_id, staff_id based on your data

-- First, check what data you have available:
-- SELECT id, first_name, last_name FROM customers LIMIT 5;
-- SELECT id, name FROM services LIMIT 5;
-- SELECT id, name FROM staff LIMIT 5;

-- Example 1: Update an existing booking to test deposit payment
-- UPDATE bookings 
-- SET payment_option = 'deposit', payment_status = 'paid'
-- WHERE id = 'your-booking-id-here';

-- Example 2: Update an existing booking to test full payment  
-- UPDATE bookings 
-- SET payment_option = 'full_payment', payment_status = 'paid'
-- WHERE id = 'your-booking-id-here';

-- Example 3: Update an existing booking to test pay on location
-- UPDATE bookings 
-- SET payment_option = 'pay_on_location', payment_status = 'pending'
-- WHERE id = 'your-booking-id-here';

-- To test the payment summary view:
-- SELECT * FROM booking_payment_summary WHERE appointment_date >= CURRENT_DATE;

-- To see current bookings:
SELECT 
  id, 
  appointment_date, 
  start_time,
  payment_option,
  payment_status,
  final_price,
  notes
FROM bookings 
ORDER BY appointment_date DESC, start_time DESC 
LIMIT 10;