-- Migration: Add Missing Services and Complete Add-ons
-- Description: Adds only the services that don't exist yet and all remaining add-ons
-- Date: 2025-01-27

-- ============================================
-- PART 1: ADD MISSING SERVICES
-- ============================================

-- 3 FACE PACKAGES (these don't exist in the database)
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons, requires_room_3) VALUES
('3face_basic_micro', '3 Face Basic Facial + Microdermabrasion + Extreme Softness', 'Comprehensive facial package with microdermabrasion', 'packages', 'FACE & BODY PACKAGES', 90, 120, true, false, false),
('3face_deep_cleansing', '3 Face + Deep Cleansing Facial', 'Triple facial treatment with deep cleansing', 'packages', 'FACE & BODY PACKAGES', 90, 140, true, false, false),
('3face_placenta', '3 Face + Placenta Collagen/Whitening/Anti-Acne Facial', 'Advanced facial package with specialized treatments', 'packages', 'FACE & BODY PACKAGES', 90, 150, true, false, false),
('3face_treatment1', '3 Face + Face Treatment #1', 'Triple facial with premium treatment level 1', 'packages', 'FACE & BODY PACKAGES', 90, 160, true, false, false),
('3face_treatment2', '3 Face + Face Treatment #2', 'Triple facial with premium treatment level 2', 'packages', 'FACE & BODY PACKAGES', 90, 175, true, false, false),
('3face_vitaminc', '3 Face + Vitamin C/Acne Vulgaris Facial', 'Triple facial with vitamin C treatment', 'packages', 'FACE & BODY PACKAGES', 90, 180, true, false, false),
('3face_peel', '3 Face + Peel', 'Triple facial with chemical peel', 'packages', 'FACE & BODY PACKAGES', 90, 185, true, false, false),
('3face_deep_tissue', '3 Face + Deep Tissue', 'Triple facial with deep tissue massage', 'packages', 'FACE & BODY PACKAGES', 90, 200, true, false, false)
ON CONFLICT (id) DO NOTHING;

-- RF PACKAGE
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons, requires_room_3) VALUES
('rf_package', 'Radio Frequency Package', 'Complete RF treatment package', 'packages', 'FACE & BODY PACKAGES', 90, 280, true, false, false),
('vip_membership', 'VIP Card Membership (Annual)', 'Annual VIP membership with benefits', 'packages', 'FACE & BODY PACKAGES', 15, 50, true, false, false)
ON CONFLICT (id) DO NOTHING;

-- ADDITIONAL WAXING SERVICES (check which ones don't exist)
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons, requires_room_3) VALUES
('sideburns_wax', 'Sideburns', 'Sideburn waxing service', 'waxing', 'Waxing Services', 15, 12, true, false, false),
('upper_leg_wax', 'Upper Leg', 'Upper leg waxing service', 'waxing', 'Waxing Services', 30, 45, true, false, false),
('inner_thighs_wax', 'Inner Thighs', 'Inner thigh waxing service', 'waxing', 'Waxing Services', 15, 25, true, false, false),
('nostrils_wax', 'Nostrils', 'Nostril waxing service', 'waxing', 'Waxing Services', 15, 30, true, false, false),
('french_bikini_wax', 'French Bikini', 'French bikini waxing service', 'waxing', 'Waxing Services', 30, 45, true, false, false),
('back_wax', 'Back', 'Back waxing service', 'waxing', 'Waxing Services', 30, 60, true, false, false),
('buttocks_wax', 'Buttocks', 'Buttocks waxing service', 'waxing', 'Waxing Services', 30, 45, true, false, false),
('ears_wax', 'Ears', 'Ear waxing service', 'waxing', 'Waxing Services', 15, 30, true, false, false),
('feet_toes_wax', 'Feet/Toes', 'Feet and toes waxing service', 'waxing', 'Waxing Services', 15, 30, true, false, false),
('hands_fingers_wax', 'Hands/Fingers', 'Hands and fingers waxing service', 'waxing', 'Waxing Services', 15, 30, true, false, false)
ON CONFLICT (id) DO NOTHING;

-- Update existing services to allow add-ons where appropriate
UPDATE public.services 
SET allows_addons = true 
WHERE category = 'massages' 
  AND allows_addons IS NOT true;

UPDATE public.services 
SET allows_addons = true 
WHERE category = 'treatments' 
  AND id LIKE '%_30' OR id LIKE '%_60'
  AND allows_addons IS NOT true;

UPDATE public.services 
SET allows_addons = true 
WHERE category = 'facials'
  AND id IN (
    'vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion',
    'hydrating_glow', 'lightening_treatment', 'sunburn_treatment',
    'acne_pimple_treatment', 'extreme_softness', 'oily_skin_treatment',
    'lactic_peel', 'salicylic_peel', 'glycolic_led', 'led_photo_aging',
    'obaji_whitening', 'oxygen_face', 'derma_roller', 'dermaplaning',
    'glassy_skin', 'microneedling', 'vampire_facial', 'radio_frequency',
    'nano_treatment', 'hydrafacial'
  )
  AND allows_addons IS NOT true;

-- ============================================
-- PART 2: ADD REMAINING ADD-ONS
-- ============================================

-- Check if add-ons already exist and skip if they do
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
-- Face Treatment Level 1 Add-on (for specific services)
('addon_face_treatment_1', 'Face Treatment #1 Add-on', 'Add a Face Treatment #1 service to your facial', 50, 30, 'facial_addon_1', 
  ARRAY['vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion', 'hydrating_glow', 'lightening_treatment', 
        'sunburn_treatment', 'acne_pimple_treatment', 'extreme_softness', 'oily_skin_treatment']::text[], 1),

-- Face Treatment Level 2 Add-on
('addon_face_treatment_2', 'Face Treatment #2 Add-on', 'Add a Face Treatment #2 service to your facial', 60, 30, 'facial_addon_2',
  ARRAY['lactic_peel', 'salicylic_peel', 'glycolic_led', 'led_photo_aging', 'obaji_whitening', 'oxygen_face']::text[], 1),

-- Face Treatment Level 3 Add-on
('addon_face_treatment_3', 'Face Treatment #3 Add-on', 'Add a Face Treatment #3 service to your facial', 85, 45, 'facial_addon_3',
  ARRAY['derma_roller', 'dermaplaning', 'glassy_skin']::text[], 1),

-- Face Treatment Level 4 Add-on
('addon_face_treatment_4', 'Face Treatment #4 Add-on', 'Add a Face Treatment #4 service to your facial', 99, 55, 'facial_addon_4',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Premium Face Treatment #4 Add-ons (each $120)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_hollywood', 'Hollywood Facial Add-on', 'Add Hollywood Facial to your treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_led_aging', 'LED Photo Aging Add-on', 'Add LED Photo Aging treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_acne_vulgaris', 'Acne Vulgaris Treatment Add-on', 'Add intensive acne treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_vampire', 'Vampire Facial Add-on (Fruit Based)', 'Add vampire facial with fruit extracts', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_glassy', 'Glassy Skin Add-on', 'Add glassy skin treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_hydra', 'Hydra Facial Add-on', 'Add HydraFacial treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_obaji', 'Obaji Infusion Whitening Add-on', 'Add Obaji whitening treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_nano', 'Nano Face Treatment Add-on', 'Add nano infusion treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_dermaplan', 'Derma Planning Add-on', 'Add dermaplaning treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_microneed', 'Microneedling Add-on', 'Add microneedling treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_dark_spot', 'Dark Spot Treatment Add-on', 'Add dark spot treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: VERIFY AND REPORT
-- ============================================

DO $$
DECLARE
  v_service_count INTEGER;
  v_addon_count INTEGER;
  v_packages_count INTEGER;
  v_waxing_count INTEGER;
  r RECORD;
BEGIN
  -- Count services
  SELECT COUNT(*) INTO v_service_count FROM public.services;
  SELECT COUNT(*) INTO v_addon_count FROM public.service_addons;
  SELECT COUNT(*) INTO v_packages_count FROM public.services WHERE category = 'packages';
  SELECT COUNT(*) INTO v_waxing_count FROM public.services WHERE category = 'waxing';
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Total services: %', v_service_count;
  RAISE NOTICE '  Package services: %', v_packages_count;
  RAISE NOTICE '  Waxing services: %', v_waxing_count;
  RAISE NOTICE '  Total add-ons: %', v_addon_count;
  
  -- List the new packages added
  RAISE NOTICE 'New packages added:';
  FOR r IN SELECT id, name FROM public.services WHERE id LIKE '3face%' OR id = 'rf_package' OR id = 'vip_membership'
  LOOP
    RAISE NOTICE '  - %: %', r.id, r.name;
  END LOOP;
END $$;