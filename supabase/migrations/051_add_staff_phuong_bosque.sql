-- Migration: Add Phuong Bosque as a new staff member
-- Description: Adds Phuong as a massage-only therapist available all days of the week

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
  ARRAY['massage']::service_category[],  -- Only massage capability
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
-- This ensures Phuong shows as available in the booking system
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

-- Grant necessary permissions for the new staff member
-- This ensures the booking system can query Phuong's availability
GRANT SELECT ON public.staff TO anon, authenticated;
GRANT SELECT ON public.staff_schedules TO anon, authenticated;

-- Add comment for documentation
COMMENT ON COLUMN public.staff.id IS 'Staff identifier - phuong added for massage services';

-- Verification query to confirm Phuong was added successfully
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
    RAISE NOTICE 'Successfully added Phuong Bosque as staff member';
  END IF;
END $$;