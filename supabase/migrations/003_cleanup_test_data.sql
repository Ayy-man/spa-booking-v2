-- Clean up test bookings and data
-- This migration removes test data to prevent email spam

-- Delete test bookings (keeping only real customer bookings)
DELETE FROM bookings 
WHERE customer_id IN (
  SELECT id FROM customers 
  WHERE email LIKE '%test%' 
     OR email LIKE '%example%'
     OR first_name LIKE '%Test%'
     OR first_name LIKE '%test%'
);

-- Delete test customers
DELETE FROM customers 
WHERE email LIKE '%test%' 
   OR email LIKE '%example%'
   OR first_name LIKE '%Test%'
   OR first_name LIKE '%test%';

-- Delete test walk-ins
DELETE FROM walk_ins
WHERE customer_email LIKE '%test%'
   OR customer_email LIKE '%example%'
   OR customer_name LIKE '%Test%'
   OR customer_name LIKE '%test%';

-- Clear test booking errors
DELETE FROM booking_errors
WHERE customer_email LIKE '%test%'
   OR customer_email LIKE '%example%'
   OR customer_name LIKE '%Test%'
   OR customer_name LIKE '%test%';