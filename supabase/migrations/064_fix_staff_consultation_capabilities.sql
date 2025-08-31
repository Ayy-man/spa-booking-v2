-- Fix Staff Assignment for Consultation Services
-- This migration ensures consultation services work with the admin override system
-- NOTE: We don't modify enums here - the application handles the mapping

-- ============================================
-- PART 1: ENSURE CONSULTATION SERVICE EXISTS
-- ============================================

-- Create or update a consultation service
-- We'll use 'facials' as the category since that's what exists in the enum
-- The is_consultation flag will identify it as a consultation service
INSERT INTO services (
  id,
  name,
  description,
  category,
  duration,
  price,
  is_consultation,
  requires_on_site_pricing,
  allows_addons,
  ghl_category,
  is_active
) 
SELECT
  'consultation-service',
  'Consultation',
  'Professional consultation and personalized treatment recommendations',
  'facials'::service_category,  -- Use facials since it exists in the enum
  30,
  0.00,
  true,  -- This flag marks it as a consultation
  false,
  false,
  'FACE TREATMENTS',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM services 
  WHERE id = 'consultation-service' OR 
        (is_consultation = true AND is_active = true)
);

-- Update existing consultation services to ensure they're active
UPDATE services 
SET 
  is_active = true,
  is_consultation = true,
  updated_at = NOW()
WHERE is_consultation = true;

-- ============================================
-- PART 2: ENSURE STAFF CAPABILITIES ARE CORRECT
-- ============================================

-- Ensure Phuong has facials capability (for handling consultations)
-- Note: 'facials' is the plural form used in staff capabilities
UPDATE staff 
SET capabilities = 
  CASE 
    WHEN 'facials' = ANY(capabilities) THEN capabilities  -- Already has it
    ELSE array_append(capabilities, 'facials'::service_category)  -- Add it
  END
WHERE id = 'phuong' AND is_active = true;

-- ============================================
-- PART 3: INFORMATION AND STATUS
-- ============================================

DO $$
DECLARE
  v_consultation_count INTEGER;
  v_staff_with_facials INTEGER;
  v_active_staff INTEGER;
BEGIN
  -- Count consultation services
  SELECT COUNT(*) INTO v_consultation_count
  FROM services 
  WHERE is_consultation = true AND is_active = true;
  
  -- Count staff with facials capability
  SELECT COUNT(*) INTO v_staff_with_facials
  FROM staff 
  WHERE 'facials' = ANY(capabilities) AND is_active = true;
  
  -- Count all active staff
  SELECT COUNT(*) INTO v_active_staff
  FROM staff 
  WHERE is_active = true;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Staff Assignment Fix Applied';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Active consultation services: %', v_consultation_count;
  RAISE NOTICE 'Staff with facials capability: %', v_staff_with_facials;
  RAISE NOTICE 'Total active staff: %', v_active_staff;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: The admin panel now allows overriding';
  RAISE NOTICE 'staff assignments for consultation services.';
  RAISE NOTICE 'Admins can assign ANY staff to consultations.';
  RAISE NOTICE '===========================================';
END
$$;

-- ============================================
-- PART 4: SHOW CURRENT STAFF CAPABILITIES
-- ============================================

-- Display current staff and their capabilities for reference
SELECT 
  name,
  id,
  capabilities,
  is_active
FROM staff 
WHERE is_active = true
ORDER BY name;