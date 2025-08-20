-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO ADD PHUONG BOSQUE AS STAFF
-- This script adds Phuong as a massage-only therapist available all days

-- First, check if service_category enum has 'massages' value
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'massages' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
  ) THEN
    -- Add 'massages' to enum if it doesn't exist
    ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'massages';
  END IF;
END $$;

-- Insert Phuong Bosque into the staff table
INSERT INTO public.staff (
  id,
  name,
  email,
  phone,
  specialties,
  initials,
  capabilities,
  work_days,
  role,
  is_active,
  default_room_id,
  service_exclusions,
  default_start_time,
  default_end_time,
  created_at,
  updated_at
) VALUES (
  'phuong',
  'Phuong Bosque',
  'phuong.bosque@dermalskin.com',
  '(671) 555-0123',
  'Body Massages (All Types)',
  'PB',
  ARRAY['massages']::service_category[],  -- Massage capability
  ARRAY[0, 1, 2, 3, 4, 5, 6],  -- Available all days (0=Sunday through 6=Saturday)
  'therapist'::staff_role,
  true,
  null,  -- No default room assignment
  ARRAY[]::text[],  -- No service exclusions
  '09:00:00'::time,  -- Default start time 9:00 AM
  '19:00:00'::time,  -- Default end time 7:00 PM
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  specialties = EXCLUDED.specialties,
  initials = EXCLUDED.initials,
  capabilities = EXCLUDED.capabilities,
  work_days = EXCLUDED.work_days,
  is_active = EXCLUDED.is_active,
  default_start_time = EXCLUDED.default_start_time,
  default_end_time = EXCLUDED.default_end_time,
  updated_at = now();

-- Add staff schedules for Phuong for the next 90 days
INSERT INTO public.staff_schedules (
  staff_id,
  date,
  start_time,
  end_time,
  is_available,
  created_at,
  updated_at
)
SELECT 
  'phuong' as staff_id,
  generate_series::date as date,
  '09:00:00'::time as start_time,
  '19:00:00'::time as end_time,
  true as is_available,
  now() as created_at,
  now() as updated_at
FROM generate_series(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  INTERVAL '1 day'
) ON CONFLICT (staff_id, date) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available,
  updated_at = now();

-- Verify Phuong was added successfully
SELECT 
  id,
  name,
  email,
  capabilities,
  work_days,
  is_active
FROM public.staff 
WHERE id = 'phuong';

-- Show message
DO $$
DECLARE
  staff_count integer;
BEGIN
  SELECT COUNT(*) INTO staff_count 
  FROM public.staff 
  WHERE id = 'phuong';
  
  IF staff_count = 0 THEN
    RAISE EXCEPTION 'Failed to add Phuong Bosque to staff table';
  ELSE
    RAISE NOTICE 'Successfully added Phuong Bosque as staff member for massage services';
    RAISE NOTICE 'Phuong is available all 7 days a week for massage appointments';
  END IF;
END $$;