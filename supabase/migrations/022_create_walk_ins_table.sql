-- Create walk_ins table for managing walk-in customers
-- Note: This matches the existing database schema structure
CREATE TABLE IF NOT EXISTS walk_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  booking_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL DEFAULT 'general',
  scheduling_type TEXT NOT NULL DEFAULT 'walk_in',
  scheduled_date DATE,
  scheduled_time TIME,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'served', 'cancelled', 'no_show')),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  ghl_webhook_sent BOOLEAN DEFAULT FALSE,
  ghl_webhook_sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_walk_ins_status ON walk_ins(status);
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_at ON walk_ins(created_at);
CREATE INDEX IF NOT EXISTS idx_walk_ins_service_name ON walk_ins(service_name);

-- Add RLS policies
ALTER TABLE walk_ins ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin access)
CREATE POLICY "Allow all operations for authenticated users" ON walk_ins
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public read access (for the check-in page)
CREATE POLICY "Allow public insert for walk-ins" ON walk_ins
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_walk_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for UPDATE to set updated_at
CREATE TRIGGER trigger_walk_ins_updated_at
  BEFORE UPDATE ON walk_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_walk_ins_updated_at();