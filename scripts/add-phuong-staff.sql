-- Script to add Phuong Bosque to the booking system
-- Run this in Supabase SQL Editor to add Phuong as a staff member

-- First, check if Phuong already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff WHERE id = 'phuong') THEN
    RAISE NOTICE 'Phuong already exists in the staff table, updating...';
  ELSE
    RAISE NOTICE 'Adding Phuong to the staff table...';
  END IF;
END $$;

-- Insert or update Phuong in the staff table
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
  hourly_rate,
  created_at,
  updated_at
) VALUES (
  'phuong',
  'Phuong Bosque',
  'phuong.bosque@dermalskin.com',
  '(671) 555-0123',
  'Body Massages (All Types)',
  'PB',
  ARRAY['massage']::service_category[],
  ARRAY[0, 1, 2, 3, 4, 5, 6]::integer[],  -- All days of the week
  'therapist'::staff_role,
  true,
  null,  -- No default room
  ARRAY[]::text[],  -- No service exclusions
  '09:00:00'::time,
  '19:00:00'::time,
  null,  -- Hourly rate can be set later if needed
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
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  service_exclusions = EXCLUDED.service_exclusions,
  default_start_time = EXCLUDED.default_start_time,
  default_end_time = EXCLUDED.default_end_time,
  updated_at = now();

-- Create staff schedules for the next 90 days
-- This ensures Phuong appears as available in the booking system
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    INTERVAL '1 day'
  )::date as schedule_date
)
INSERT INTO public.staff_schedules (
  staff_id,
  date,
  start_time,
  end_time,
  is_available,
  break_start,
  break_end,
  notes,
  created_at,
  updated_at
)
SELECT 
  'phuong',
  schedule_date,
  '09:00:00'::time,
  '19:00:00'::time,
  true,
  '12:00:00'::time,  -- Lunch break start
  '13:00:00'::time,  -- Lunch break end
  'Standard schedule - available for all massage services',
  now(),
  now()
FROM date_series
ON CONFLICT (staff_id, date) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available,
  break_start = EXCLUDED.break_start,
  break_end = EXCLUDED.break_end,
  updated_at = now()
WHERE staff_schedules.staff_id = 'phuong';

-- Verify the insertion
SELECT 
  id,
  name,
  email,
  specialties,
  capabilities,
  work_days,
  is_active
FROM public.staff 
WHERE id = 'phuong';

-- Check schedule creation
SELECT 
  COUNT(*) as schedule_days_created,
  MIN(date) as first_day,
  MAX(date) as last_day
FROM public.staff_schedules 
WHERE staff_id = 'phuong';

-- List massage services that Phuong can perform
SELECT 
  id,
  name,
  duration,
  price
FROM public.services
WHERE category = 'massage'
  AND is_active = true
ORDER BY name;

-- Success message
DO $$
DECLARE
  staff_exists boolean;
  schedule_count integer;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE id = 'phuong') INTO staff_exists;
  SELECT COUNT(*) INTO schedule_count FROM public.staff_schedules WHERE staff_id = 'phuong';
  
  IF staff_exists AND schedule_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Phuong Bosque has been added to the system with % days of availability', schedule_count;
  ELSIF staff_exists THEN
    RAISE WARNING '⚠️  WARNING: Phuong was added but no schedule was created';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Failed to add Phuong to the system';
  END IF;
END $$;