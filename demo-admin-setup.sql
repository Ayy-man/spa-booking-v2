-- Simple Demo Admin Setup for Supabase
-- This approach works without directly inserting into auth.users

-- Step 1: First, run the main admin-auth-setup.sql file if you haven't already

-- Step 2: Create a simple function to setup demo admin after they sign up
CREATE OR REPLACE FUNCTION setup_demo_admin()
RETURNS TEXT AS $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Look for the demo user (they need to sign up first through normal flow)
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email = 'admin@spa.local' 
  LIMIT 1;
  
  IF demo_user_id IS NULL THEN
    RETURN 'Demo user not found. Please sign up first at the main site with admin@spa.local';
  END IF;
  
  -- Check if already admin
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = demo_user_id) THEN
    RETURN 'User admin@spa.local is already an admin';
  END IF;
  
  -- Create admin record
  INSERT INTO admin_users (user_id, email, role, is_active, created_by)
  VALUES (demo_user_id, 'admin@spa.local', 'admin', true, demo_user_id);
  
  RETURN 'Successfully created admin user for admin@spa.local';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Alternative - create admin for any existing user by email
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || user_email || ' not found. They need to sign up first.';
  END IF;
  
  -- Check if already admin
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
    RETURN 'User ' || user_email || ' is already an admin';
  END IF;
  
  -- Create admin record
  INSERT INTO admin_users (user_id, email, role, is_active, created_by)
  VALUES (target_user_id, user_email, 'admin', true, target_user_id);
  
  RETURN 'Successfully created admin user for ' || user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions:
-- 1. Run this script in Supabase SQL Editor
-- 2. Go to your main site (http://localhost:3000) and sign up normally with any email
-- 3. Then run: SELECT make_user_admin('your-email@example.com');
-- 4. Or use the demo: SELECT setup_demo_admin(); (after signing up with admin@spa.local)