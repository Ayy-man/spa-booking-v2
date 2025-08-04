-- Migration: Add payment tracking improvements
-- Description: Updates to track payment options (deposit, full payment, pay on location)

-- The payment_option field already exists as text in the bookings table
-- We just need to ensure it can handle our new values:
-- 'deposit', 'full_payment', 'pay_on_location'

-- Add a check constraint to ensure valid payment options
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS payment_option_check;

ALTER TABLE bookings
ADD CONSTRAINT payment_option_check 
CHECK (payment_option IN ('deposit', 'full_payment', 'pay_on_location'));

-- Create an index on payment_option for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_option ON bookings(payment_option);

-- Create an index on payment_status for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Update any existing bookings that don't have payment_option set
UPDATE bookings 
SET payment_option = 'deposit' 
WHERE payment_option IS NULL;

-- Make payment_option NOT NULL since we always want to track this
ALTER TABLE bookings 
ALTER COLUMN payment_option SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN bookings.payment_option IS 'Payment method selected: deposit (partial payment), full_payment (paid in full online), pay_on_location (will pay at spa)';
COMMENT ON COLUMN bookings.payment_status IS 'Current payment status: pending (awaiting payment), paid (payment received), partial (deposit paid), etc.';

-- Create a view for easy payment reporting
CREATE OR REPLACE VIEW booking_payment_summary AS
SELECT 
  b.id,
  b.appointment_date,
  b.start_time,
  c.first_name || ' ' || c.last_name as customer_name,
  c.email as customer_email,
  s.name as service_name,
  b.final_price,
  b.payment_option,
  b.payment_status,
  CASE 
    WHEN b.payment_option = 'pay_on_location' THEN b.final_price
    WHEN b.payment_option = 'deposit' AND b.payment_status = 'paid' THEN b.final_price - 30
    WHEN b.payment_option = 'full_payment' AND b.payment_status = 'paid' THEN 0
    ELSE b.final_price
  END as amount_due,
  CASE 
    WHEN b.payment_option = 'pay_on_location' THEN 'Collect full payment'
    WHEN b.payment_option = 'deposit' AND b.payment_status = 'paid' THEN 'Collect remaining balance'
    WHEN b.payment_option = 'full_payment' AND b.payment_status = 'paid' THEN 'No payment needed'
    ELSE 'Check payment status'
  END as collection_instructions
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN services s ON b.service_id = s.id
WHERE b.status NOT IN ('cancelled', 'no_show')
ORDER BY b.appointment_date, b.start_time;

-- Grant appropriate permissions
GRANT SELECT ON booking_payment_summary TO authenticated;
GRANT SELECT ON booking_payment_summary TO anon;