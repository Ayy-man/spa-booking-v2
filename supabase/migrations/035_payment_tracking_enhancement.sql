-- Migration: 035_payment_tracking_enhancement.sql
-- Description: Add comprehensive payment tracking with webhook support
-- Author: Spa Booking System
-- Date: 2025-01-12

-- Create payment_transactions table for tracking all payment events
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  customer_email VARCHAR(255),
  metadata JSONB,
  webhook_received_at TIMESTAMPTZ,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  CONSTRAINT valid_provider CHECK (payment_provider IN ('fastpaydirect', 'gohighlevel', 'stripe', 'manual'))
);

-- Create webhook_events table for logging all webhook activity
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  signature VARCHAR(500),
  signature_verified BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_attempts INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'ignored'))
);

-- Create indexes for performance
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_processing_status ON webhook_events(processing_status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Add RLS policies for payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to payment_transactions"
  ON payment_transactions
  FOR ALL
  TO service_role
  USING (true);

-- Policy: Authenticated users can view their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE customer_id IN (
        SELECT id FROM customers 
        WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Add RLS policies for webhook_events (admin only)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook events
CREATE POLICY "Service role has full access to webhook_events"
  ON webhook_events
  FOR ALL
  TO service_role
  USING (true);

-- Create function to update payment status from webhook
CREATE OR REPLACE FUNCTION process_payment_webhook(
  p_booking_id UUID,
  p_transaction_id VARCHAR,
  p_provider VARCHAR,
  p_amount DECIMAL,
  p_status VARCHAR,
  p_payload JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  booking_updated BOOLEAN,
  transaction_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_existing_transaction RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking 
  FROM bookings 
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'Booking not found', 
      false, 
      false;
    RETURN;
  END IF;
  
  -- Check if transaction already exists
  SELECT * INTO v_existing_transaction
  FROM payment_transactions
  WHERE transaction_id = p_transaction_id;
  
  IF FOUND THEN
    -- Update existing transaction
    UPDATE payment_transactions
    SET 
      status = p_status,
      webhook_payload = p_payload,
      webhook_received_at = NOW(),
      updated_at = NOW()
    WHERE transaction_id = p_transaction_id;
    
    RETURN QUERY SELECT 
      true, 
      'Transaction updated', 
      false, 
      false;
    RETURN;
  END IF;
  
  -- Verify amount matches booking
  IF p_amount != v_booking.final_price THEN
    -- Log suspicious activity but continue
    INSERT INTO webhook_events (
      event_type,
      provider,
      payload,
      error_message,
      processing_status
    ) VALUES (
      'payment.amount_mismatch',
      p_provider,
      jsonb_build_object(
        'booking_id', p_booking_id,
        'expected', v_booking.final_price,
        'received', p_amount
      ),
      'Payment amount does not match booking amount',
      'failed'
    );
  END IF;
  
  -- Create payment transaction
  INSERT INTO payment_transactions (
    booking_id,
    transaction_id,
    payment_provider,
    amount,
    status,
    webhook_payload,
    webhook_received_at
  ) VALUES (
    p_booking_id,
    p_transaction_id,
    p_provider,
    p_amount,
    p_status,
    p_payload,
    NOW()
  );
  
  -- Update booking payment status if payment completed
  IF p_status = 'completed' THEN
    UPDATE bookings
    SET 
      payment_status = 'paid',
      updated_at = NOW()
    WHERE id = p_booking_id
    AND payment_status != 'paid'; -- Don't update if already paid
    
    RETURN QUERY SELECT 
      true, 
      'Payment processed and booking updated', 
      true, 
      true;
  ELSE
    RETURN QUERY SELECT 
      true, 
      'Payment transaction recorded', 
      false, 
      true;
  END IF;
END;
$$;

-- Create function to check payment status
CREATE OR REPLACE FUNCTION get_payment_status(p_booking_id UUID)
RETURNS TABLE (
  payment_status VARCHAR,
  payment_option VARCHAR,
  last_transaction JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.payment_status::VARCHAR,
    b.payment_option::VARCHAR,
    CASE 
      WHEN pt.id IS NOT NULL THEN
        jsonb_build_object(
          'transaction_id', pt.transaction_id,
          'amount', pt.amount,
          'status', pt.status,
          'provider', pt.payment_provider,
          'created_at', pt.created_at
        )
      ELSE NULL
    END as last_transaction
  FROM bookings b
  LEFT JOIN LATERAL (
    SELECT * FROM payment_transactions
    WHERE booking_id = p_booking_id
    ORDER BY created_at DESC
    LIMIT 1
  ) pt ON true
  WHERE b.id = p_booking_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_payment_webhook TO service_role;
GRANT EXECUTE ON FUNCTION get_payment_status TO service_role, authenticated;

-- Add comment for documentation
COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions for bookings with webhook support';
COMMENT ON TABLE webhook_events IS 'Logs all webhook events for debugging and audit purposes';
COMMENT ON FUNCTION process_payment_webhook IS 'Processes payment webhooks and updates booking status';
COMMENT ON FUNCTION get_payment_status IS 'Returns current payment status for a booking';