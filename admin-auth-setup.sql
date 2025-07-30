-- Admin Authentication Setup for Supabase
-- This script sets up the necessary database components for admin authentication

-- 1. Create admin_users table to manage admin privileges
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- 3. Enable RLS (Row Level Security) on admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for admin_users table
-- Policy 1: Only authenticated users can view admin users (for checking privileges)
CREATE POLICY "Allow authenticated users to view admin users" ON admin_users
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy 2: Only existing admins can insert new admin users
CREATE POLICY "Only admins can create admin users" ON admin_users
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.is_active = true
    )
  );

-- Policy 3: Only existing admins can update admin users
CREATE POLICY "Only admins can update admin users" ON admin_users
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.is_active = true
    )
  );

-- Policy 4: Only existing admins can delete admin users
CREATE POLICY "Only admins can delete admin users" ON admin_users
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.is_active = true
    )
  );

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for updated_at on admin_users
CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON admin_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Enhanced RLS policies for existing tables to ensure admin-only access

-- Bookings table - restrict admin access
DROP POLICY IF EXISTS "Enable read access for admin users" ON bookings;
CREATE POLICY "Enable read access for admin users" ON bookings
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "Enable insert access for admin users" ON bookings;
CREATE POLICY "Enable insert access for admin users" ON bookings
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "Enable update access for admin users" ON bookings;
CREATE POLICY "Enable update access for admin users" ON bookings
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Services table - restrict admin access
DROP POLICY IF EXISTS "Enable read access for admin users" ON services;
CREATE POLICY "Enable read access for admin users" ON services
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Staff table - restrict admin access  
DROP POLICY IF EXISTS "Enable read access for admin users" ON staff;
CREATE POLICY "Enable read access for admin users" ON staff
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Rooms table - restrict admin access
DROP POLICY IF EXISTS "Enable read access for admin users" ON rooms;
CREATE POLICY "Enable read access for admin users" ON rooms
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Customers table - restrict admin access
DROP POLICY IF EXISTS "Enable read access for admin users" ON customers;
CREATE POLICY "Enable read access for admin users" ON customers
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- 8. Function to check if a user is an admin (helper function)
CREATE OR REPLACE FUNCTION is_admin_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid 
    AND is_active = true 
    AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to create the first admin user (run this manually with your admin email)
-- Replace 'your-admin-email@example.com' with the actual admin email
CREATE OR REPLACE FUNCTION create_first_admin(admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  admin_record admin_users%ROWTYPE;
BEGIN
  -- Find the user by email
  SELECT * INTO user_record FROM auth.users WHERE email = admin_email;
  
  IF user_record.id IS NULL THEN
    RETURN 'User with email ' || admin_email || ' not found. Please ensure the user is registered first.';
  END IF;
  
  -- Check if already an admin
  SELECT * INTO admin_record FROM admin_users WHERE user_id = user_record.id;
  
  IF admin_record.id IS NOT NULL THEN
    RETURN 'User ' || admin_email || ' is already an admin user.';
  END IF;
  
  -- Create admin user record
  INSERT INTO admin_users (user_id, email, role, is_active, created_by)
  VALUES (user_record.id, admin_email, 'admin', true, user_record.id);
  
  RETURN 'Successfully created admin user for ' || admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant necessary permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;

-- Instructions for setup:
-- 1. Run this entire script in your Supabase SQL editor
-- 2. Create your first admin user by running: SELECT create_first_admin('your-admin-email@example.com');
-- 3. The admin user must first register through Supabase Auth (sign up normally)
-- 4. Then run the create_first_admin function with their email
-- 5. They can then log into the admin panel

-- Example of creating the first admin (uncomment and modify):
-- SELECT create_first_admin('admin@dermalspa.com');

-- Example of adding more admin users after the first one is created:
-- INSERT INTO admin_users (user_id, email, role, is_active, created_by) 
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'new-admin@example.com'),
--   'new-admin@example.com',
--   'admin',
--   true,
--   (SELECT user_id FROM admin_users WHERE role = 'admin' LIMIT 1)
-- );

-- To check current admin users:
-- SELECT au.*, u.email as user_email FROM admin_users au 
-- JOIN auth.users u ON au.user_id = u.id 
-- WHERE au.is_active = true;