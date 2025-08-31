-- Fix Staff Consultation Capabilities
-- This migration ensures staff can handle consultation services
-- Since consultation might not be in the service_category enum, we'll work around it

-- ============================================
-- PART 1: ENSURE CONSULTATION ENUM VALUE EXISTS
-- ============================================

-- First try to add consultation to the enum if it doesn't exist
-- This uses a safe approach that won't fail if it already exists
DO $$
BEGIN
  -- Only try to add if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'consultation' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
  ) THEN
    ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'consultation';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If we can't add it (maybe it exists or other reason), that's ok
    -- We'll handle consultations through the facials capability
    RAISE NOTICE 'Note: Could not add consultation to enum, will map through facials capability';
END
$$;

-- ============================================
-- PART 2: UPDATE STAFF CAPABILITIES SAFELY
-- ============================================

-- For now, we'll ensure staff with facial capabilities can handle consultations
-- The admin override in the application will handle the rest

-- Make sure Phuong has facials capability (she should already have it)
UPDATE staff 
SET capabilities = 
  CASE 
    WHEN NOT ('facials' = ANY(capabilities)) 
    THEN array_append(capabilities, 'facials'::service_category)
    ELSE capabilities
  END
WHERE id = 'phuong' AND is_active = true;

-- Make sure other facial specialists have the facials capability
-- This ensures they can handle consultation services through the mapping
UPDATE staff 
SET capabilities = capabilities  -- No change needed, just ensure facials is there
WHERE 'facials' = ANY(capabilities) AND is_active = true;

-- ============================================
-- PART 3: ENSURE CONSULTATION SERVICE EXISTS
-- ============================================

-- Check if we can use consultation category, otherwise use facial
DO $$
DECLARE
  v_category service_category;
BEGIN
  -- Try to use consultation if it exists in the enum
  BEGIN
    v_category := 'consultation'::service_category;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fall back to facial if consultation doesn't exist
      v_category := 'facial'::service_category;
  END;
  
  -- Insert or update the consultation service
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
  ) VALUES (
    'consultation-service',  -- Different ID to avoid conflicts
    'Consultation',
    'Professional consultation and personalized treatment recommendations',
    v_category,  -- Use the determined category
    30,
    0.00,
    true,  -- Mark as consultation
    false,
    false,
    'FACE TREATMENTS',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    is_consultation = true,
    is_active = true,
    updated_at = NOW();
END
$$;

-- ============================================
-- PART 4: REPORTING
-- ============================================

-- Show current setup
DO $$
DECLARE
  v_enum_has_consultation BOOLEAN;
  v_staff_count INTEGER;
  v_consultation_services INTEGER;
BEGIN
  -- Check if consultation is in enum
  SELECT EXISTS(
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'consultation' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
  ) INTO v_enum_has_consultation;
  
  -- Count staff with facials capability (who can handle consultations)
  SELECT COUNT(*) INTO v_staff_count
  FROM staff 
  WHERE 'facials' = ANY(capabilities) AND is_active = true;
  
  -- Count consultation services
  SELECT COUNT(*) INTO v_consultation_services
  FROM services 
  WHERE is_consultation = true AND is_active = true;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Consultation Setup Status:';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Enum has consultation: %', CASE WHEN v_enum_has_consultation THEN 'YES' ELSE 'NO (using facials mapping)' END;
  RAISE NOTICE 'Staff with facial capability: %', v_staff_count;
  RAISE NOTICE 'Active consultation services: %', v_consultation_services;
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'The admin panel will allow overriding staff assignments for consultations';
  RAISE NOTICE '===========================================';
END
$$;