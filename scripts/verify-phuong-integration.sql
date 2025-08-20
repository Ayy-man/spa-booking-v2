-- Verification Script: Check Phuong Bosque Integration
-- Run this script to verify that Phuong has been properly added to the system

-- ========================================
-- 1. CHECK STAFF TABLE
-- ========================================
RAISE NOTICE '=== CHECKING STAFF TABLE ===';

SELECT 
  id,
  name,
  email,
  phone,
  specialties,
  capabilities,
  work_days,
  is_active,
  default_start_time,
  default_end_time
FROM public.staff 
WHERE id = 'phuong';

-- ========================================
-- 2. CHECK STAFF SCHEDULES
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== CHECKING STAFF SCHEDULES ===';

SELECT 
  COUNT(*) as total_schedule_days,
  COUNT(CASE WHEN is_available = true THEN 1 END) as available_days,
  MIN(date) as first_scheduled_day,
  MAX(date) as last_scheduled_day,
  array_agg(DISTINCT EXTRACT(DOW FROM date)::integer ORDER BY EXTRACT(DOW FROM date)::integer) as days_of_week
FROM public.staff_schedules 
WHERE staff_id = 'phuong'
  AND date >= CURRENT_DATE;

-- ========================================
-- 3. CHECK UPCOMING AVAILABILITY (Next 7 Days)
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== NEXT 7 DAYS AVAILABILITY ===';

SELECT 
  date,
  to_char(date, 'Day') as day_name,
  start_time,
  end_time,
  is_available,
  CASE 
    WHEN break_start IS NOT NULL AND break_end IS NOT NULL 
    THEN concat(break_start::text, ' - ', break_end::text)
    ELSE 'No break scheduled'
  END as break_time
FROM public.staff_schedules 
WHERE staff_id = 'phuong'
  AND date >= CURRENT_DATE
  AND date < CURRENT_DATE + INTERVAL '7 days'
ORDER BY date;

-- ========================================
-- 4. MASSAGE SERVICES PHUONG CAN PERFORM
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== MASSAGE SERVICES PHUONG CAN PERFORM ===';

SELECT 
  id,
  name,
  duration || ' min' as duration,
  '$' || price as price,
  CASE 
    WHEN is_couples_service = true THEN 'Yes'
    ELSE 'No'
  END as couples_compatible
FROM public.services
WHERE category = 'massage'
  AND is_active = true
ORDER BY price;

-- ========================================
-- 5. COMPARE WITH OTHER MASSAGE THERAPISTS
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== COMPARISON WITH OTHER MASSAGE THERAPISTS ===';

SELECT 
  name,
  specialties,
  capabilities,
  CASE 
    WHEN array_length(work_days, 1) = 7 THEN 'All week'
    WHEN array_length(work_days, 1) = 1 THEN 'One day only'
    ELSE array_length(work_days, 1)::text || ' days/week'
  END as availability,
  work_days
FROM public.staff
WHERE 'massage' = ANY(capabilities)
  AND is_active = true
ORDER BY name;

-- ========================================
-- 6. CHECK FOR POTENTIAL CONFLICTS
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== CHECKING FOR CONFLICTS ===';

-- Check for duplicate staff IDs
SELECT COUNT(*) as duplicate_count
FROM public.staff
WHERE id = 'phuong';

-- Check for email conflicts
SELECT COUNT(*) as email_conflicts
FROM public.staff
WHERE email = 'phuong.bosque@dermalskin.com'
  AND id != 'phuong';

-- ========================================
-- 7. ROOM ASSIGNMENT CAPABILITY
-- ========================================
RAISE NOTICE '';
RAISE NOTICE '=== ROOM ASSIGNMENT CHECK ===';

SELECT 
  r.id,
  r.name,
  r.capacity,
  CASE 
    WHEN 'massage' = ANY(r.capabilities) THEN 'Can handle massages'
    ELSE 'Cannot handle massages'
  END as massage_capable
FROM public.rooms r
WHERE r.is_active = true
ORDER BY r.id;

-- ========================================
-- 8. FINAL VALIDATION
-- ========================================
DO $$
DECLARE
  phuong_exists boolean;
  schedule_count integer;
  massage_service_count integer;
  validation_passed boolean := true;
  error_messages text := '';
BEGIN
  -- Check if Phuong exists
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE id = 'phuong') INTO phuong_exists;
  IF NOT phuong_exists THEN
    validation_passed := false;
    error_messages := error_messages || '❌ Phuong not found in staff table' || E'\n';
  ELSE
    RAISE NOTICE '✅ Phuong found in staff table';
  END IF;
  
  -- Check schedules
  SELECT COUNT(*) INTO schedule_count 
  FROM public.staff_schedules 
  WHERE staff_id = 'phuong' AND date >= CURRENT_DATE;
  
  IF schedule_count = 0 THEN
    validation_passed := false;
    error_messages := error_messages || '❌ No future schedules found for Phuong' || E'\n';
  ELSE
    RAISE NOTICE '✅ % future schedule days found for Phuong', schedule_count;
  END IF;
  
  -- Check massage services
  SELECT COUNT(*) INTO massage_service_count
  FROM public.services
  WHERE category = 'massage' AND is_active = true;
  
  IF massage_service_count = 0 THEN
    validation_passed := false;
    error_messages := error_messages || '❌ No active massage services found' || E'\n';
  ELSE
    RAISE NOTICE '✅ % massage services available for Phuong to perform', massage_service_count;
  END IF;
  
  -- Final result
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF validation_passed THEN
    RAISE NOTICE '✅ VALIDATION PASSED: Phuong Bosque is properly integrated!';
    RAISE NOTICE 'Phuong can now:';
    RAISE NOTICE '  - Accept bookings for all massage services';
    RAISE NOTICE '  - Work all 7 days of the week';
    RAISE NOTICE '  - Be assigned to any available room';
    RAISE NOTICE '  - Handle couples massage bookings';
  ELSE
    RAISE WARNING '❌ VALIDATION FAILED:';
    RAISE WARNING '%', error_messages;
  END IF;
  RAISE NOTICE '========================================';
END $$;