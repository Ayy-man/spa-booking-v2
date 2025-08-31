-- Update Staff Consultation Capabilities
-- This migration ensures staff members have proper consultation capabilities
-- Consultations are typically related to facial services, so staff who can perform facials should also perform consultations

-- ============================================
-- PART 1: ADD CONSULTATION CAPABILITY TO EXISTING STAFF
-- ============================================

-- Update Phuong to include consultations capability (already has facials)
-- Phuong specializes in Asian skincare and acne management - perfect for consultations
UPDATE staff 
SET capabilities = ARRAY['facials', 'treatments', 'consultations']::service_category[]
WHERE id = 'phuong' 
  AND NOT ('consultations' = ANY(capabilities));

-- ============================================
-- PART 2: ADD CONSULTATION CAPABILITY TO ALL FACIAL-CAPABLE STAFF
-- ============================================

-- Any staff member who can perform facials should also be able to perform consultations
-- This is a business rule: consultations are skin assessments that precede facial treatments
UPDATE staff 
SET capabilities = array_append(capabilities, 'consultations'::service_category)
WHERE 'facials' = ANY(capabilities) 
  AND NOT ('consultations' = ANY(capabilities))
  AND is_active = true;

-- ============================================
-- PART 3: VERIFY CONSULTATION SERVICE EXISTS
-- ============================================

-- Ensure there is a consultation service in the system
-- If it doesn't exist, create a basic consultation service
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
  'consultation',
  'Skin Consultation',
  'Professional skin assessment and personalized treatment recommendations. Perfect for first-time clients or those wanting to explore new treatments.',
  'consultation',
  30, -- 30 minutes
  0.00, -- Free consultation
  true,
  false,
  false,
  'FACE TREATMENTS',
  true
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  is_consultation = EXCLUDED.is_consultation,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ============================================
-- PART 4: UPDATE SERVICE CATEGORY ENUM (IF NEEDED)
-- ============================================

-- Ensure consultation is a valid service category
-- Note: This may already exist based on the codebase analysis
DO $$
BEGIN
  -- Check if consultation is already in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'consultation' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
  ) THEN
    -- Add consultation to the service_category enum
    ALTER TYPE service_category ADD VALUE 'consultation';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- consultation already exists in enum, which is fine
    NULL;
END
$$;

-- ============================================
-- PART 5: VERIFICATION AND REPORTING
-- ============================================

-- Function to verify consultation setup
CREATE OR REPLACE FUNCTION verify_consultation_setup()
RETURNS TABLE (
  setup_item TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check consultation service exists
  RETURN QUERY
  SELECT 
    'Consultation Service'::TEXT as setup_item,
    CASE WHEN EXISTS(SELECT 1 FROM services WHERE id = 'consultation' AND is_active = true) 
         THEN '✅ EXISTS' 
         ELSE '❌ MISSING' 
    END as status,
    COALESCE(
      (SELECT 'Service: ' || name || ', Duration: ' || duration || ' min, Price: $' || price::TEXT 
       FROM services WHERE id = 'consultation'),
      'No consultation service found'
    ) as details;

  -- Check staff with consultation capability
  RETURN QUERY
  SELECT 
    'Staff with Consultations'::TEXT as setup_item,
    '📋 COUNT: ' || COUNT(*)::TEXT as status,
    STRING_AGG(name || ' (' || id || ')', ', ' ORDER BY name) as details
  FROM staff 
  WHERE 'consultations' = ANY(capabilities) AND is_active = true;

  -- Check staff with facials but no consultations
  RETURN QUERY
  SELECT 
    'Staff needing Consultations'::TEXT as setup_item,
    CASE WHEN COUNT(*) = 0 THEN '✅ ALL SET' ELSE '⚠️ NEEDS UPDATE' END as status,
    CASE WHEN COUNT(*) = 0 
         THEN 'All facial staff can perform consultations'
         ELSE STRING_AGG(name || ' (' || id || ')', ', ' ORDER BY name)
    END as details
  FROM staff 
  WHERE 'facials' = ANY(capabilities) 
    AND NOT ('consultations' = ANY(capabilities))
    AND is_active = true;

  -- Check service category enum
  RETURN QUERY
  SELECT 
    'Consultation Category'::TEXT as setup_item,
    CASE WHEN EXISTS(
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'consultation' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category')
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    'Service category enum includes consultation' as details;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: RUN VERIFICATION AND SHOW RESULTS
-- ============================================

-- Display verification results
SELECT * FROM verify_consultation_setup();

-- ============================================
-- PART 7: CLEANUP AND COMMENTS
-- ============================================

-- Add comments for documentation
COMMENT ON FUNCTION verify_consultation_setup IS 'Verifies that consultation services and staff capabilities are properly configured';

-- Drop the verification function after use (optional, keep if you want to rerun later)
-- DROP FUNCTION IF EXISTS verify_consultation_setup();

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Staff consultation capabilities migration completed successfully!';
  RAISE NOTICE '📋 Staff members who can perform facials now also have consultation capability';
  RAISE NOTICE '🔍 Consultation service has been verified/created';
  RAISE NOTICE '⚡ Run "SELECT * FROM verify_consultation_setup();" to see results';
END
$$;