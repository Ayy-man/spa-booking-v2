-- Add support for waivers and walk-in functionality
-- This migration adds the necessary database changes for the new features

-- Add waiver-related columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_data JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMP WITH TIME ZONE;

-- Add payment option tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_option TEXT DEFAULT 'deposit';
-- payment_option can be 'deposit' or 'full'

-- Add emergency contact information to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Create waivers table for detailed waiver storage
CREATE TABLE IF NOT EXISTS waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  service_name TEXT NOT NULL,
  signature TEXT NOT NULL,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  medical_conditions TEXT,
  allergies TEXT,
  skin_conditions TEXT,
  medications TEXT,
  pregnancy_status BOOLEAN,
  previous_waxing BOOLEAN,
  recent_sun_exposure BOOLEAN,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  waiver_content JSONB, -- Store the full waiver terms that were agreed to
  ip_address INET,
  user_agent TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waivers_customer_id ON waivers(customer_id);
CREATE INDEX IF NOT EXISTS idx_waivers_booking_id ON waivers(booking_id);
CREATE INDEX IF NOT EXISTS idx_waivers_service_category ON waivers(service_category);
CREATE INDEX IF NOT EXISTS idx_waivers_signed_at ON waivers(signed_at);

-- Add RLS policies for waivers
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;

-- Staff can see all waivers
CREATE POLICY "Staff can view all waivers" ON waivers
  FOR SELECT USING (true);

-- Staff can insert waivers
CREATE POLICY "Staff can insert waivers" ON waivers
  FOR INSERT WITH CHECK (true);

-- Staff can update waivers
CREATE POLICY "Staff can update waivers" ON waivers
  FOR UPDATE USING (true);

-- Create walk_ins table for tracking walk-in customers
CREATE TABLE IF NOT EXISTS walk_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  scheduling_type TEXT NOT NULL DEFAULT 'immediate', -- 'immediate' or 'scheduled'
  scheduled_date DATE,
  scheduled_time TIME,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  checked_in_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  ghl_webhook_sent BOOLEAN DEFAULT FALSE,
  ghl_webhook_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID, -- staff member who created the walk-in
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for walk_ins
CREATE INDEX IF NOT EXISTS idx_walk_ins_customer_id ON walk_ins(customer_id);
CREATE INDEX IF NOT EXISTS idx_walk_ins_booking_id ON walk_ins(booking_id);
CREATE INDEX IF NOT EXISTS idx_walk_ins_scheduling_type ON walk_ins(scheduling_type);
CREATE INDEX IF NOT EXISTS idx_walk_ins_status ON walk_ins(status);
CREATE INDEX IF NOT EXISTS idx_walk_ins_scheduled_date ON walk_ins(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_at ON walk_ins(created_at);

-- Add RLS policies for walk_ins
ALTER TABLE walk_ins ENABLE ROW LEVEL SECURITY;

-- Staff can see all walk-ins
CREATE POLICY "Staff can view all walk_ins" ON walk_ins
  FOR SELECT USING (true);

-- Staff can insert walk-ins
CREATE POLICY "Staff can insert walk_ins" ON walk_ins
  FOR INSERT WITH CHECK (true);

-- Staff can update walk-ins
CREATE POLICY "Staff can update walk_ins" ON walk_ins
  FOR UPDATE USING (true);

-- Add service popularity tracking
ALTER TABLE services ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;

-- Update popular services based on the frontend data
UPDATE services SET is_popular = TRUE WHERE name IN (
  'Deep Tissue Body Massage',
  'Hot Stone Massage',
  'Underarm Cleaning',
  'Dead Sea Salt Body Scrub',
  'Basic Facial (For Men & Women)',
  'Deep Cleansing Facial (for Men & Women)',
  'Anti-Acne Facial (for Men & Women)',
  'Balinese Body Massage + Basic Facial',
  'Eyebrow Waxing',
  'Lip Waxing',
  'Lower Leg Waxing',
  'Bikini Waxing',
  'Underarm Waxing'
);

-- Update recommended services
UPDATE services SET is_recommended = TRUE WHERE name IN (
  'Hot Stone Massage 90 Minutes',
  'Underarm or Inguinal Whitening',
  'Microderm Facial',
  'Vitamin C Facial with Extreme Softness',
  'Deep Tissue Body Massage + 3Face',
  'Hot Stone Body Massage + Microderm Facial',
  'Full Leg Waxing',
  'Brazilian Wax ( Women )',
  'Brazilian Waxing ( Men)'
);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_waivers_updated_at ON waivers;
CREATE TRIGGER update_waivers_updated_at 
  BEFORE UPDATE ON waivers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_walk_ins_updated_at ON walk_ins;
CREATE TRIGGER update_walk_ins_updated_at 
  BEFORE UPDATE ON walk_ins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE waivers IS 'Stores digital waivers signed by customers for spa treatments';
COMMENT ON TABLE walk_ins IS 'Tracks walk-in customers and their scheduling preferences';
COMMENT ON COLUMN bookings.waiver_signed IS 'Whether the customer has signed a waiver for this booking';
COMMENT ON COLUMN bookings.payment_option IS 'Payment option chosen: deposit or full payment';
COMMENT ON COLUMN services.is_popular IS 'Marks services as popular for frontend display';
COMMENT ON COLUMN services.is_recommended IS 'Marks services as recommended for upselling';