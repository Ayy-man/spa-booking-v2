-- ============================================
-- SERVICES AND ADDONS SYSTEM - CONSOLIDATED MIGRATION
-- ============================================
-- Description: Complete service catalog and addon system implementation
-- Created: 2025-01-31
-- Consolidates: Service additions, addon system, and service management

-- ============================================
-- SECTION 1: ADDON SYSTEM TABLES
-- ============================================

-- Create service_addons table for storing add-on services
CREATE TABLE IF NOT EXISTS public.service_addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  duration INTEGER NOT NULL CHECK (duration >= 0), -- in minutes
  category TEXT NOT NULL, -- 'massage_addon', 'facial_addon_1', etc.
  applies_to_services TEXT[], -- Array of service IDs this add-on can be applied to
  applies_to_categories service_category[], -- Array of service categories this applies to
  max_quantity INTEGER DEFAULT 1, -- Maximum number of times this add-on can be selected
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_addons junction table
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES public.service_addons(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  price_at_booking NUMERIC NOT NULL, -- Store the price at time of booking
  duration_at_booking INTEGER NOT NULL, -- Store duration at time of booking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add allows_addons flag to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS allows_addons BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking_id ON public.booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_addon_id ON public.booking_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_category ON public.service_addons(category);
CREATE INDEX IF NOT EXISTS idx_service_addons_active ON public.service_addons(is_active);
CREATE INDEX IF NOT EXISTS idx_services_allows_addons ON public.services(allows_addons) WHERE allows_addons = TRUE;

-- ============================================
-- SECTION 2: COMPREHENSIVE SERVICE CATALOG
-- ============================================

-- CONSULTATION SERVICE
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('consultation', 'Consultation', 'Professional skin consultation and treatment planning', 'facials', 'FACE TREATMENTS', 30, 25, true, false)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- 3 FACE PACKAGES (90 minutes each)
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('3face_basic_micro', '3 Face Basic Facial + Microdermabrasion + Extreme Softness', 'Comprehensive facial package with microdermabrasion', 'packages', 'FACE & BODY PACKAGES', 90, 120, true, false),
('3face_deep_cleansing', '3 Face + Deep Cleansing Facial', 'Triple facial treatment with deep cleansing', 'packages', 'FACE & BODY PACKAGES', 90, 140, true, false),
('3face_placenta', '3 Face + Placenta Collagen/Whitening/Anti-Acne Facial', 'Advanced facial package with specialized treatments', 'packages', 'FACE & BODY PACKAGES', 90, 150, true, false),
('3face_treatment1', '3 Face + Face Treatment #1', 'Triple facial with premium treatment level 1', 'packages', 'FACE & BODY PACKAGES', 90, 160, true, false),
('3face_treatment2', '3 Face + Face Treatment #2', 'Triple facial with premium treatment level 2', 'packages', 'FACE & BODY PACKAGES', 90, 175, true, false),
('3face_vitaminc', '3 Face + Vitamin C/Acne Vulgaris Facial', 'Triple facial with vitamin C treatment', 'packages', 'FACE & BODY PACKAGES', 90, 180, true, false),
('3face_peel', '3 Face + Peel', 'Triple facial with chemical peel', 'packages', 'FACE & BODY PACKAGES', 90, 185, true, false),
('3face_deep_tissue', '3 Face + Deep Tissue', 'Triple facial with deep tissue massage', 'packages', 'FACE & BODY PACKAGES', 90, 200, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- ADDITIONAL WAXING SERVICES
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('sideburns_wax', 'Sideburns', 'Sideburn waxing service', 'waxing', 'Waxing Services', 15, 12, true, false),
('upper_leg_wax', 'Upper Leg', 'Upper leg waxing service', 'waxing', 'Waxing Services', 30, 45, true, false),
('inner_thighs_wax', 'Inner Thighs', 'Inner thigh waxing service', 'waxing', 'Waxing Services', 15, 25, true, false),
('nostrils_wax', 'Nostrils', 'Nostril waxing service', 'waxing', 'Waxing Services', 15, 30, true, false),
('french_bikini_wax', 'French Bikini', 'French bikini waxing service', 'waxing', 'Waxing Services', 30, 45, true, false),
('back_wax', 'Back', 'Back waxing service', 'waxing', 'Waxing Services', 30, 60, true, false),
('buttocks_wax', 'Buttocks', 'Buttocks waxing service', 'waxing', 'Waxing Services', 30, 45, true, false),
('ears_wax', 'Ears', 'Ear waxing service', 'waxing', 'Waxing Services', 15, 30, true, false),
('feet_toes_wax', 'Feet/Toes', 'Feet and toes waxing service', 'waxing', 'Waxing Services', 15, 30, true, false),
('hands_fingers_wax', 'Hands/Fingers', 'Hands and fingers waxing service', 'waxing', 'Waxing Services', 15, 30, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- OTHER BODY TREATMENTS (30/60 minute options) - Allow add-ons for massage enhancements
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('hair_scalp_30', 'Hair and Scalp Treatment (30 min)', 'Relaxing hair and scalp treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('hair_scalp_60', 'Hair and Scalp Treatment (60 min)', 'Extended hair and scalp treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('headspa_30', 'Headspa (30 min)', 'Rejuvenating head spa treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('headspa_60', 'Headspa (60 min)', 'Extended head spa treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('face_massage_30', 'Face Massage (30 min)', 'Relaxing facial massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('face_massage_60', 'Face Massage (60 min)', 'Extended facial massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('shoulder_face_arms_30', 'Shoulder, Face, Arms and Head Massage (30 min)', 'Multi-area massage treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('shoulder_face_arms_60', 'Shoulder, Face, Arms and Head Massage (60 min)', 'Extended multi-area massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('foot_massage_30', 'Foot Massage (30 min)', 'Relaxing foot massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('foot_massage_60', 'Foot Massage (60 min)', 'Extended foot massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('back_massage_30', 'Back Massage (30 min)', 'Targeted back massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('back_massage_60', 'Back Massage (60 min)', 'Extended back massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('dry_head_massage_30', 'Dry Head Massage (30 min)', 'Dry technique head massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('dry_head_massage_60', 'Dry Head Massage (60 min)', 'Extended dry head massage', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('deep_moisturizing_body_30', 'Deep Moisturizing Body (30 min)', 'Intensive body moisturizing treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('deep_moisturizing_body_60', 'Deep Moisturizing Body (60 min)', 'Extended body moisturizing treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('back_arms_scrub_30', 'Back or Arms/Shoulder Scrub (30 min)', 'Exfoliating scrub treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('back_arms_scrub_60', 'Back or Arms/Shoulder Scrub (60 min)', 'Extended exfoliating treatment', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  allows_addons = EXCLUDED.allows_addons,
  updated_at = NOW();

-- FACE TREATMENT #1 (All $70, 30 mins) - Allow facial add-ons
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('vitamin_c_treatment', 'Vitamin C Treatment', 'Brightening vitamin C facial treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('collagen_treatment', 'Collagen Treatment', 'Firming collagen facial treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('microderm_abrasion', 'Microdermabrasion', 'Professional microdermabrasion treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('hydrating_glow', 'Hydrating/Instant Glow', 'Hydrating treatment for instant glow', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('lightening_treatment', 'Lightening Treatment', 'Skin brightening and lightening treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('sunburn_treatment', 'Sunburn Treatment', 'Soothing sunburn recovery treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('acne_pimple_treatment', 'Acne/Pimple Treatment', 'Targeted acne and pimple treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('extreme_softness', 'Extreme Softness', 'Ultra-softening facial treatment', 'facials', 'FACE TREATMENTS', 30, 70, true, true),
('oily_skin_treatment', 'Oily Skin Care Treatment', 'Specialized treatment for oily skin', 'facials', 'FACE TREATMENTS', 30, 70, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  allows_addons = EXCLUDED.allows_addons,
  updated_at = NOW();

-- FACE TREATMENT #2 (All $75, 30 mins) - Allow facial add-ons
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('lactic_peel', 'Lactic Peel', 'Gentle lactic acid peel treatment', 'facials', 'FACE TREATMENTS', 30, 75, true, true),
('salicylic_peel', 'Salicylic Peel', 'Deep-cleaning salicylic acid peel', 'facials', 'FACE TREATMENTS', 30, 75, true, true),
('glycolic_led', 'Glycolic LED Photo Aging', 'Glycolic peel with LED therapy', 'facials', 'FACE TREATMENTS', 30, 75, true, true),
('led_photo_aging', 'LED Photo Aging', 'LED light therapy for anti-aging', 'facials', 'FACE TREATMENTS', 30, 75, true, true),
('obaji_whitening', 'Obaji Infusion Whitening', 'Obaji whitening infusion treatment', 'facials', 'FACE TREATMENTS', 30, 75, true, true),
('oxygen_face', 'Oxygen Face Treatment', 'Oxygen infusion facial treatment', 'facials', 'FACE TREATMENTS', 30, 75, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  allows_addons = EXCLUDED.allows_addons,
  updated_at = NOW();

-- FACE TREATMENT #3 (All $99, 45 mins) - Allow facial add-ons
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('derma_roller', 'Derma Roller', 'Micro-needling with derma roller', 'facials', 'FACE TREATMENTS', 45, 99, true, true),
('dermaplaning', 'DermaPlaning', 'Professional dermaplaning treatment', 'facials', 'FACE TREATMENTS', 45, 99, true, true),
('glassy_skin', 'Glassy Skin', 'Korean glassy skin treatment', 'facials', 'FACE TREATMENTS', 45, 99, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  allows_addons = EXCLUDED.allows_addons,
  updated_at = NOW();

-- FACE TREATMENT #4 (All $120, 55 mins) - Allow premium facial add-ons
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('microneedling', 'Microneedling', 'Professional microneedling treatment', 'facials', 'FACE TREATMENTS', 55, 120, true, true),
('vampire_facial', 'Vampire', 'Vampire facial treatment', 'facials', 'FACE TREATMENTS', 55, 120, true, true),
('radio_frequency', 'Radio Frequency', 'RF skin tightening treatment', 'facials', 'FACE TREATMENTS', 55, 120, true, true),
('nano_treatment', 'Nano', 'Nano infusion treatment', 'facials', 'FACE TREATMENTS', 55, 120, true, true),
('hydrafacial', 'HydraFacial', 'HydraFacial deep cleansing treatment', 'facials', 'FACE TREATMENTS', 55, 120, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  allows_addons = EXCLUDED.allows_addons,
  updated_at = NOW();

-- DERMAL SIGNATURE TREATMENTS 1
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('hydrafacial_sig', 'HydraFacial Signature', 'Signature HydraFacial treatment', 'facials', 'FACE TREATMENTS', 90, 199, true, false),
('nano_face_sig', 'Nano Face Treatment Signature', 'Signature nano infusion treatment', 'facials', 'FACE TREATMENTS', 90, 250, true, false),
('dermaplaning_sig', 'Derma Planning Signature', 'Signature dermaplaning treatment', 'facials', 'FACE TREATMENTS', 90, 230, true, false),
('rf_package', 'Radio Frequency Package', 'Complete RF treatment package', 'packages', 'FACE & BODY PACKAGES', 90, 280, true, false),
('glassy_skin_sig', 'Glassy Skin Signature', 'Signature glassy skin treatment', 'facials', 'FACE TREATMENTS', 90, 190, true, false),
('underarm_white_products', 'Underarm Whitening (With Products)', 'Underarm whitening with take-home products', 'treatments', 'BODY TREATMENTS & BOOSTERS', 60, 150, true, false),
('underarm_white_no_products', 'Underarm Whitening (Without Products)', 'Underarm whitening treatment only', 'treatments', 'BODY TREATMENTS & BOOSTERS', 45, 99, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- DERMAL SIGNATURE TREATMENTS 2
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('hollywood_facial_sig', 'Hollywood Facial', 'Celebrity-style facial treatment', 'facials', 'FACE TREATMENTS', 75, 150, true, false),
('led_photo_sig', 'LED Photo Aging Treatment Signature', 'Advanced LED anti-aging treatment', 'facials', 'FACE TREATMENTS', 75, 175, true, false),
('obaji_whitening_sig', 'Obaji Infusion Whitening Facial Signature', 'Premium Obaji whitening treatment', 'facials', 'FACE TREATMENTS', 75, 180, true, false),
('acne_vulgaris_sig', 'ACNE Vulgaris Facial Signature', 'Intensive acne treatment', 'facials', 'FACE TREATMENTS', 75, 150, true, false),
('vampire_lift_sig', 'Vampire Facelift Facial', 'Premium vampire facelift treatment', 'facials', 'FACE TREATMENTS', 90, 200, true, false),
('microneedling_sig', 'Microneedling Treatment Signature', 'Advanced microneedling treatment', 'facials', 'FACE TREATMENTS', 90, 290, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- MISCELLANEOUS SERVICES
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('vip_membership', 'VIP Card Membership (Annual)', 'Annual VIP membership with benefits', 'packages', 'FACE & BODY PACKAGES', 15, 50, true, false),
('soothing_facial', 'Soothing Facial', 'Calming and soothing facial treatment', 'facials', 'FACE TREATMENTS', 60, 120, true, false),
('deep_blackheads', 'Deep Blackheads Extraction', 'Professional blackhead extraction', 'facials', 'FACE TREATMENTS', 15, 10, true, false),
('whiteheads', 'Whiteheads Extraction', 'Professional whitehead extraction', 'facials', 'FACE TREATMENTS', 15, 10, true, false),
('milia_removal', 'Milia Removal', 'Professional milia removal treatment', 'facials', 'FACE TREATMENTS', 15, 10, true, false),
('eye_area', 'Eye Area Treatment', 'Specialized eye area treatment', 'facials', 'FACE TREATMENTS', 20, 20, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- Update existing massage services to allow add-ons
UPDATE public.services 
SET allows_addons = true, updated_at = NOW()
WHERE category = 'massages' AND id IN (
  'balinese_massage', 
  'deep_tissue_massage', 
  'hot_stone_massage', 
  'maternity_massage', 
  'stretching_massage',
  'hot_stone_90'
);

-- ============================================
-- SECTION 3: SERVICE ADD-ONS
-- ============================================

-- Body Massage Add-ons
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity) VALUES
('addon_hot_stone_back', 'Hot Stone Back', 'Add hot stone therapy to back massage', 15, 30, 'massage_addon', ARRAY['massages']::service_category[], 1),
('addon_deep_moisturizing', 'Deep Moisturizing', 'Add deep moisturizing treatment', 25, 30, 'massage_addon', ARRAY['massages', 'treatments']::service_category[], 1),
('addon_30min_massage', '30 Minutes Extra Massage', 'Extend massage by 30 minutes', 40, 30, 'massage_addon', ARRAY['massages']::service_category[], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- Face Treatment Level 1 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_1', 'Face Treatment #1 Add-on', 'Add a Face Treatment #1 service to your facial', 50, 30, 'facial_addon_1', 
  ARRAY['vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion', 'hydrating_glow', 'lightening_treatment', 
        'sunburn_treatment', 'acne_pimple_treatment', 'extreme_softness', 'oily_skin_treatment'], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- Face Treatment Level 2 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_2', 'Face Treatment #2 Add-on', 'Add a Face Treatment #2 service to your facial', 60, 30, 'facial_addon_2',
  ARRAY['lactic_peel', 'salicylic_peel', 'glycolic_led', 'led_photo_aging', 'obaji_whitening', 'oxygen_face'], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- Face Treatment Level 3 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_3', 'Face Treatment #3 Add-on', 'Add a Face Treatment #3 service to your facial', 85, 45, 'facial_addon_3',
  ARRAY['derma_roller', 'dermaplaning', 'glassy_skin'], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- Face Treatment Level 4 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_4', 'Face Treatment #4 Add-on', 'Add a Face Treatment #4 service to your facial', 99, 55, 'facial_addon_4',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- Premium Face Treatment #4 Add-ons (each $120)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_hollywood', 'Hollywood Facial Add-on', 'Add Hollywood Facial to your treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_led_aging', 'LED Photo Aging Add-on', 'Add LED Photo Aging treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_acne_vulgaris', 'Acne Vulgaris Treatment Add-on', 'Add intensive acne treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_vampire', 'Vampire Facial Add-on (Fruit Based)', 'Add vampire facial with fruit extracts', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_glassy', 'Glassy Skin Add-on', 'Add glassy skin treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_hydra', 'Hydra Facial Add-on', 'Add HydraFacial treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_obaji', 'Obaji Infusion Whitening Add-on', 'Add Obaji whitening treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_nano', 'Nano Face Treatment Add-on', 'Add nano infusion treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_dermaplan', 'Derma Planning Add-on', 'Add dermaplaning treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_microneed', 'Microneedling Add-on', 'Add microneedling treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1),
('addon_dark_spot', 'Dark Spot Treatment Add-on', 'Add dark spot treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial'], 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  updated_at = NOW();

-- ============================================
-- SECTION 4: RLS POLICIES FOR ADDON TABLES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- Policies for service_addons (public read, admin write)
CREATE POLICY "service_addons_read_all" ON public.service_addons
  FOR SELECT USING (true);

CREATE POLICY "service_addons_admin_all" ON public.service_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Policies for booking_addons (users can see their own, admin sees all)
CREATE POLICY "booking_addons_read_own" ON public.booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.customers c ON b.customer_id = c.id
      WHERE b.id = booking_addons.booking_id
      AND (c.auth_user_id = auth.uid() OR c.email = auth.jwt()->>'email')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "booking_addons_admin_all" ON public.booking_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- ============================================
-- SECTION 5: ADDON HELPER FUNCTIONS
-- ============================================

-- Function to get available add-ons for a service
CREATE OR REPLACE FUNCTION get_available_addons(service_id_param TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  price NUMERIC,
  duration INTEGER,
  category TEXT,
  max_quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.name,
    sa.description,
    sa.price,
    sa.duration,
    sa.category,
    sa.max_quantity
  FROM public.service_addons sa
  WHERE sa.is_active = true
  AND (
    -- Check if this add-on applies to this specific service
    service_id_param = ANY(sa.applies_to_services)
    OR
    -- Check if this add-on applies to the service's category
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id_param
      AND s.category::text = ANY(sa.applies_to_categories::text[])
    )
  )
  ORDER BY sa.category, sa.price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate total booking price including add-ons
CREATE OR REPLACE FUNCTION calculate_booking_total_with_addons(booking_id_param UUID)
RETURNS TABLE (
  base_price NUMERIC,
  addons_price NUMERIC,
  total_price NUMERIC,
  base_duration INTEGER,
  addons_duration INTEGER,
  total_duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_base AS (
    SELECT 
      b.total_price as base_price,
      b.duration as base_duration
    FROM public.bookings b
    WHERE b.id = booking_id_param
  ),
  addons_totals AS (
    SELECT 
      COALESCE(SUM(ba.price_at_booking * ba.quantity), 0) as addons_price,
      COALESCE(SUM(ba.duration_at_booking * ba.quantity), 0) as addons_duration
    FROM public.booking_addons ba
    WHERE ba.booking_id = booking_id_param
  )
  SELECT 
    bb.base_price,
    at.addons_price,
    bb.base_price + at.addons_price as total_price,
    bb.base_duration,
    at.addons_duration::INTEGER,
    bb.base_duration + at.addons_duration::INTEGER as total_duration
  FROM booking_base bb
  CROSS JOIN addons_totals at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add addon to booking
CREATE OR REPLACE FUNCTION add_booking_addon(
  p_booking_id UUID,
  p_addon_id TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  addon_booking_id UUID
) AS $$
DECLARE
  v_addon_record service_addons%ROWTYPE;
  v_booking_record bookings%ROWTYPE;
  v_existing_quantity INTEGER := 0;
  v_addon_booking_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking_record
  FROM bookings
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if booking allows addons
  IF NOT EXISTS (
    SELECT 1 FROM services s
    WHERE s.id = v_booking_record.service_id
    AND s.allows_addons = TRUE
  ) THEN
    RETURN QUERY SELECT FALSE, 'This service does not allow add-ons', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get addon details
  SELECT * INTO v_addon_record
  FROM service_addons
  WHERE id = p_addon_id AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Add-on not found or inactive', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if addon applies to this service
  IF NOT EXISTS (
    SELECT 1 FROM get_available_addons(v_booking_record.service_id)
    WHERE id = p_addon_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'This add-on cannot be applied to the selected service', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check existing quantity
  SELECT COALESCE(SUM(quantity), 0) INTO v_existing_quantity
  FROM booking_addons
  WHERE booking_id = p_booking_id AND addon_id = p_addon_id;
  
  -- Check max quantity constraint
  IF (v_existing_quantity + p_quantity) > v_addon_record.max_quantity THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Maximum quantity (' || v_addon_record.max_quantity || ') would be exceeded',
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Add the addon
  INSERT INTO booking_addons (
    booking_id,
    addon_id,
    quantity,
    price_at_booking,
    duration_at_booking
  ) VALUES (
    p_booking_id,
    p_addon_id,
    p_quantity,
    v_addon_record.price,
    v_addon_record.duration
  ) RETURNING id INTO v_addon_booking_id;
  
  RETURN QUERY SELECT 
    TRUE,
    'Add-on successfully added to booking',
    v_addon_booking_id;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE,
      'Error adding add-on: ' || SQLERRM,
      NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 6: TRIGGER FUNCTIONS FOR ADDONS
-- ============================================

-- Trigger to update service_addons updated_at
CREATE OR REPLACE FUNCTION handle_service_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_addons_updated_at ON service_addons;
CREATE TRIGGER service_addons_updated_at
    BEFORE UPDATE ON service_addons
    FOR EACH ROW
    EXECUTE FUNCTION handle_service_addons_updated_at();

-- ============================================
-- SECTION 7: PERMISSIONS AND GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_available_addons(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_total_with_addons(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_booking_addon(UUID, TEXT, INTEGER) TO authenticated;

-- Grant permissions on addon tables
GRANT ALL ON public.service_addons TO authenticated;
GRANT SELECT ON public.service_addons TO anon;
GRANT ALL ON public.booking_addons TO authenticated;
GRANT SELECT ON public.booking_addons TO anon;

-- ============================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON TABLE public.service_addons IS 'Stores add-on services that can be applied to main services';
COMMENT ON TABLE public.booking_addons IS 'Junction table linking bookings with selected add-ons and their pricing at booking time';
COMMENT ON COLUMN public.services.allows_addons IS 'Indicates if this service allows add-ons to be selected';

COMMENT ON FUNCTION get_available_addons IS 'Returns all active add-ons that can be applied to a specific service';
COMMENT ON FUNCTION calculate_booking_total_with_addons IS 'Calculates total price and duration for a booking including all selected add-ons';
COMMENT ON FUNCTION add_booking_addon IS 'Safely adds an add-on to a booking with validation and quantity constraints';

-- Final verification message
DO $$
DECLARE
  service_count INTEGER;
  addon_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count FROM public.services;
  SELECT COUNT(*) INTO addon_count FROM public.service_addons;
  
  RAISE NOTICE 'Services and Add-ons Migration Complete - Total Services: %, Total Add-ons: %', service_count, addon_count;
END $$;