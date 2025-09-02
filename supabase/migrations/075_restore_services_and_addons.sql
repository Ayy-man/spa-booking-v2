-- ============================================
-- Migration: Restore Complete Services Catalog and Add-on System
-- Description: Restores ~150 services and 25+ add-ons that were accidentally removed
-- Date: 2025-09-02
-- Note: This migration was recovered from git history after accidental deletion
-- ============================================

-- ============================================
-- PART 1: CREATE ADD-ON SYSTEM TABLES
-- ============================================

-- Create service_addons table for storing add-on services
CREATE TABLE IF NOT EXISTS public.service_addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  duration INTEGER NOT NULL CHECK (duration >= 0), -- in minutes
  category TEXT NOT NULL, -- 'massage_addon', 'facial_addon_1', 'facial_addon_2', etc.
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

-- ============================================
-- PART 2: INSERT NEW SERVICES
-- ============================================

-- Note: Using ON CONFLICT DO NOTHING to prevent duplicate key errors if services already exist

-- CONSULTATION SERVICE
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('consultation', 'Consultation', 'Professional skin consultation and treatment planning', 'facials', 'FACE TREATMENTS', 30, 25, true, false)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (id) DO NOTHING;

-- ADDITIONAL WAXING SERVICES (beyond what exists)
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
ON CONFLICT (id) DO NOTHING;

-- OTHER BODY TREATMENTS (30/60 minute options)
-- These services allow add-ons for massage enhancements
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('hair_scalp_30', 'Hair and Scalp Treatment (30 min)', 'Relaxing hair and scalp treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('hair_scalp_60', 'Hair and Scalp Treatment (60 min)', 'Extended hair and scalp treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('headspa_30', 'Headspa (30 min)', 'Rejuvenating head spa treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('headspa_60', 'Headspa (60 min)', 'Extended head spa treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('face_massage_30', 'Face Massage (30 min)', 'Relaxing facial massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('face_massage_60', 'Face Massage (60 min)', 'Extended facial massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('shoulder_face_arms_30', 'Shoulder, Face, Arms and Head Massage (30 min)', 'Multi-area massage treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('shoulder_face_arms_60', 'Shoulder, Face, Arms and Head Massage (60 min)', 'Extended multi-area massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('foot_massage_30', 'Foot Massage (30 min)', 'Relaxing foot massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('foot_massage_60', 'Foot Massage (60 min)', 'Extended foot massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('back_massage_30', 'Back Massage (30 min)', 'Targeted back massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('back_massage_60', 'Back Massage (60 min)', 'Extended back massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('dry_head_massage_30', 'Dry Head Massage (30 min)', 'Dry technique head massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('dry_head_massage_60', 'Dry Head Massage (60 min)', 'Extended dry head massage', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true),
('deep_moisturizing_body_30', 'Deep Moisturizing Body (30 min)', 'Intensive body moisturizing treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 30, 40, true, true),
('deep_moisturizing_body_60', 'Deep Moisturizing Body (60 min)', 'Extended deep moisturizing treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 75, true, true)
ON CONFLICT (id) DO NOTHING;

-- FACE TREATMENTS (Special categories with pricing to be determined)
-- These are premium services that require on-site pricing evaluation
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons, requires_on_site_pricing) VALUES
('vitamin_c_treatment', 'Vitamin C Treatment', 'Advanced vitamin C facial treatment', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('acne_vulgaris_treatment', 'Acne Vulgaris Treatment', 'Specialized acne treatment', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('intense_brightening', 'Intense Brightening', 'Intensive skin brightening treatment', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('sensitive_recovery', 'Sensitive Recovery', 'Treatment for sensitive skin recovery', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('anti_aging_intense', 'Anti-Aging Intense', 'Intensive anti-aging facial treatment', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('moisture_surge', 'Moisture Surge', 'Deep hydration facial treatment', 'facials', 'FACE TREATMENTS #1', 60, 0, true, true, true),
('pore_minimizer', 'Pore Minimizer', 'Treatment to minimize pore appearance', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('collagen_boost', 'Collagen Boost', 'Collagen stimulating facial treatment', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('firming_treatment', 'Firming Treatment', 'Skin firming and tightening treatment', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('radiance_renewal', 'Radiance Renewal', 'Skin radiance and renewal treatment', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('detox_facial', 'Detox Facial', 'Deep detoxifying facial treatment', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('calming_therapy', 'Calming Therapy', 'Soothing and calming facial therapy', 'facials', 'FACE TREATMENTS #2', 60, 0, true, true, true),
('hydra_peel', 'Hydra Peel', 'Hydrating chemical peel treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('diamond_glow', 'Diamond Glow', 'Diamond tip exfoliation treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('oxygen_infusion', 'Oxygen Infusion', 'Oxygen therapy facial treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('led_therapy', 'LED Light Therapy', 'LED light therapy treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('stem_cell_facial', 'Stem Cell Facial', 'Advanced stem cell facial treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('peptide_infusion', 'Peptide Infusion', 'Peptide infusion facial treatment', 'facials', 'FACE TREATMENTS #3', 75, 0, true, true, true),
('gold_facial', 'Gold Facial', 'Luxurious gold facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true),
('platinum_facial', 'Platinum Facial', 'Premium platinum facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true),
('caviar_facial', 'Caviar Facial', 'Luxury caviar facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true),
('pearl_facial', 'Pearl Facial', 'Pearl powder facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true),
('diamond_facial', 'Diamond Facial', 'Diamond dust facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true),
('silk_facial', 'Silk Facial', 'Silk protein facial treatment', 'facials', 'FACE TREATMENTS #4', 90, 0, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- SIGNATURE TREATMENTS (Premium exclusive services)
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('dermal_signature_facial', 'Dermal Signature Facial', 'Our exclusive signature facial treatment', 'facials', 'SIGNATURE TREATMENTS', 90, 180, true, true),
('royal_spa_experience', 'Royal Spa Experience', 'Ultimate luxury spa experience', 'packages', 'SIGNATURE TREATMENTS', 150, 320, true, false),
('volcanic_mud_therapy', 'Volcanic Mud Therapy', 'Therapeutic volcanic mud treatment', 'body_treatments', 'SIGNATURE TREATMENTS', 90, 160, true, true),
('himalayan_salt_therapy', 'Himalayan Salt Therapy', 'Himalayan salt treatment', 'body_treatments', 'SIGNATURE TREATMENTS', 75, 140, true, true),
('bamboo_fusion_massage', 'Bamboo Fusion Massage', 'Bamboo fusion massage technique', 'massages', 'SIGNATURE TREATMENTS', 90, 165, true, true),
('four_hands_massage', 'Four Hands Massage', 'Synchronized massage by two therapists', 'massages', 'SIGNATURE TREATMENTS', 60, 200, true, false)
ON CONFLICT (id) DO NOTHING;

-- BODY TREATMENTS (Additional specialized treatments)
INSERT INTO public.services (id, name, description, category, ghl_category, duration, price, is_active, allows_addons) VALUES
('seaweed_wrap', 'Seaweed Body Wrap', 'Detoxifying seaweed body wrap', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 75, 130, true, true),
('coffee_scrub', 'Coffee Body Scrub', 'Exfoliating coffee body scrub', 'body_scrubs', 'BODY TREATMENTS & BOOSTERS', 60, 110, true, true),
('green_tea_wrap', 'Green Tea Body Wrap', 'Antioxidant green tea body wrap', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 75, 125, true, true),
('chocolate_therapy', 'Chocolate Therapy', 'Indulgent chocolate body treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 90, 150, true, true),
('honey_glow_treatment', 'Honey Glow Treatment', 'Hydrating honey body treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 120, true, true),
('aloe_vera_therapy', 'Aloe Vera Therapy', 'Soothing aloe vera body treatment', 'body_treatments', 'BODY TREATMENTS & BOOSTERS', 60, 110, true, true)
ON CONFLICT (id) DO NOTHING;

-- Update existing services to allow add-ons where appropriate
UPDATE public.services SET allows_addons = true 
WHERE category IN ('facials', 'massages', 'body_treatments') 
AND allows_addons = false
AND id NOT IN ('consultation', 'dermalinfusion_keravive');

-- ============================================
-- PART 3: INSERT ADD-ONS
-- ============================================

-- BODY MASSAGE ADD-ONS (can be added to massage and body treatment services)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity, is_active) VALUES
('addon_hot_stones', 'Hot Stones', 'Add hot stones to your massage', 20, 10, 'massage_addon', ARRAY['massages'::service_category, 'body_treatments'::service_category], 1, true),
('addon_aromatherapy', 'Aromatherapy', 'Essential oil aromatherapy enhancement', 15, 5, 'massage_addon', ARRAY['massages'::service_category, 'body_treatments'::service_category, 'facials'::service_category], 1, true),
('addon_scalp_massage', 'Scalp Massage', 'Add scalp massage to your treatment', 25, 15, 'massage_addon', ARRAY['massages'::service_category, 'facials'::service_category], 1, true),
('addon_foot_reflexology', 'Foot Reflexology', 'Add foot reflexology', 30, 20, 'massage_addon', ARRAY['massages'::service_category, 'body_treatments'::service_category], 1, true),
('addon_cupping', 'Cupping Therapy', 'Traditional cupping therapy', 35, 20, 'massage_addon', ARRAY['massages'::service_category], 1, true),
('addon_cbd_oil', 'CBD Oil Enhancement', 'CBD oil massage enhancement', 40, 0, 'massage_addon', ARRAY['massages'::service_category], 1, true),
('addon_deep_tissue_focus', 'Deep Tissue Focus Area', 'Extra focus on problem areas', 30, 15, 'massage_addon', ARRAY['massages'::service_category], 2, true),
('addon_stretching', 'Assisted Stretching', 'Professional assisted stretching', 25, 15, 'massage_addon', ARRAY['massages'::service_category], 1, true)
ON CONFLICT (id) DO NOTHING;

-- FACIAL ADD-ONS LEVEL 1 (Basic enhancements)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity, is_active) VALUES
('addon_eye_treatment', 'Eye Treatment', 'Specialized eye area treatment', 30, 15, 'facial_addon_1', ARRAY['facials'::service_category], 1, true),
('addon_lip_treatment', 'Lip Treatment', 'Hydrating lip treatment', 20, 10, 'facial_addon_1', ARRAY['facials'::service_category], 1, true),
('addon_neck_treatment', 'Neck & Décolleté Treatment', 'Extend treatment to neck and chest', 35, 15, 'facial_addon_1', ARRAY['facials'::service_category], 1, true),
('addon_hand_treatment', 'Hand Treatment', 'Rejuvenating hand treatment', 25, 10, 'facial_addon_1', ARRAY['facials'::service_category], 1, true),
('addon_enzyme_peel', 'Enzyme Peel', 'Gentle enzyme exfoliation', 40, 15, 'facial_addon_1', ARRAY['facials'::service_category], 1, true),
('addon_high_frequency', 'High Frequency', 'High frequency treatment for acne', 30, 10, 'facial_addon_1', ARRAY['facials'::service_category], 1, true)
ON CONFLICT (id) DO NOTHING;

-- FACIAL ADD-ONS LEVEL 2 (Advanced enhancements)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity, is_active) VALUES
('addon_microcurrent', 'Microcurrent Lift', 'Non-invasive facial lifting', 50, 20, 'facial_addon_2', ARRAY['facials'::service_category], 1, true),
('addon_dermaplaning', 'Dermaplaning', 'Professional dermaplaning treatment', 45, 15, 'facial_addon_2', ARRAY['facials'::service_category], 1, true),
('addon_glycolic_peel', 'Glycolic Peel', 'Professional glycolic acid peel', 50, 15, 'facial_addon_2', ARRAY['facials'::service_category], 1, true),
('addon_vitamin_infusion', 'Vitamin C Infusion', 'Intensive vitamin C treatment', 45, 15, 'facial_addon_2', ARRAY['facials'::service_category], 1, true),
('addon_collagen_mask', 'Collagen Mask', 'Hydrating collagen mask', 35, 15, 'facial_addon_2', ARRAY['facials'::service_category], 1, true),
('addon_led_therapy_addon', 'LED Light Therapy Add-on', 'Add LED therapy to facial', 40, 15, 'facial_addon_2', ARRAY['facials'::service_category], 1, true)
ON CONFLICT (id) DO NOTHING;

-- PREMIUM ADD-ONS (Luxury enhancements)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity, is_active) VALUES
('addon_24k_gold_mask', '24K Gold Mask', 'Luxurious 24-karat gold mask', 75, 20, 'premium_addon', ARRAY['facials'::service_category], 1, true),
('addon_caviar_treatment', 'Caviar Extract Treatment', 'Premium caviar extract treatment', 85, 20, 'premium_addon', ARRAY['facials'::service_category], 1, true),
('addon_oxygen_boost', 'Oxygen Infusion Boost', 'Pressurized oxygen treatment', 60, 15, 'premium_addon', ARRAY['facials'::service_category], 1, true),
('addon_stem_cell_serum', 'Stem Cell Serum', 'Advanced stem cell serum application', 90, 10, 'premium_addon', ARRAY['facials'::service_category], 1, true),
('addon_plasma_treatment', 'Plasma Skin Treatment', 'Advanced plasma skin treatment', 120, 30, 'premium_addon', ARRAY['facials'::service_category], 1, true)
ON CONFLICT (id) DO NOTHING;

-- BODY TREATMENT ADD-ONS
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_categories, max_quantity, is_active) VALUES
('addon_dry_brushing', 'Dry Brushing', 'Full body dry brushing', 20, 10, 'body_addon', ARRAY['body_treatments'::service_category, 'body_scrubs'::service_category], 1, true),
('addon_body_mask', 'Hydrating Body Mask', 'Nourishing body mask application', 40, 20, 'body_addon', ARRAY['body_treatments'::service_category], 1, true),
('addon_cellulite_treatment', 'Cellulite Treatment', 'Targeted cellulite treatment', 45, 20, 'body_addon', ARRAY['body_treatments'::service_category], 1, true),
('addon_firming_wrap', 'Firming Wrap', 'Body firming wrap treatment', 50, 20, 'body_addon', ARRAY['body_treatments'::service_category], 1, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: CREATE HELPER FUNCTIONS
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
)
LANGUAGE plpgsql
AS $$
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
  FROM service_addons sa
  JOIN services s ON s.id = service_id_param
  WHERE 
    sa.is_active = true
    AND (
      -- Add-on applies to specific services
      service_id_param = ANY(sa.applies_to_services)
      OR 
      -- Add-on applies to service categories
      s.category = ANY(sa.applies_to_categories)
      OR
      -- Add-on has no restrictions (applies to all)
      (sa.applies_to_services IS NULL OR array_length(sa.applies_to_services, 1) IS NULL)
      AND (sa.applies_to_categories IS NULL OR array_length(sa.applies_to_categories, 1) IS NULL)
    )
  ORDER BY sa.category, sa.price;
END;
$$;

-- Function to calculate total booking price including add-ons
CREATE OR REPLACE FUNCTION calculate_booking_total(booking_id_param UUID)
RETURNS TABLE (
  base_price NUMERIC,
  addons_price NUMERIC,
  total_price NUMERIC,
  base_duration INTEGER,
  addons_duration INTEGER,
  total_duration INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.price as base_price,
    COALESCE(SUM(ba.price_at_booking * ba.quantity), 0) as addons_price,
    b.price + COALESCE(SUM(ba.price_at_booking * ba.quantity), 0) as total_price,
    s.duration as base_duration,
    COALESCE(SUM(ba.duration_at_booking * ba.quantity), 0)::INTEGER as addons_duration,
    s.duration + COALESCE(SUM(ba.duration_at_booking * ba.quantity), 0)::INTEGER as total_duration
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  LEFT JOIN booking_addons ba ON ba.booking_id = b.id
  WHERE b.id = booking_id_param
  GROUP BY b.id, b.price, s.duration;
END;
$$;

-- ============================================
-- PART 5: ADD RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

-- Service add-ons are publicly readable
CREATE POLICY "Service add-ons are viewable by everyone" ON service_addons
  FOR SELECT USING (true);

-- Booking add-ons follow booking permissions
CREATE POLICY "Booking add-ons follow booking permissions" ON booking_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_addons.booking_id
    )
  );

-- ============================================
-- PART 6: FINAL UPDATES AND VERIFICATION
-- ============================================

-- Update service count
DO $$
DECLARE
  service_count INTEGER;
  addon_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count FROM services WHERE is_active = true;
  SELECT COUNT(*) INTO addon_count FROM service_addons WHERE is_active = true;
  
  RAISE NOTICE 'Services restored: %', service_count;
  RAISE NOTICE 'Add-ons created: %', addon_count;
  
  IF service_count < 100 THEN
    RAISE WARNING 'Expected 150+ services but found only %. Please check migration.', service_count;
  END IF;
  
  IF addon_count < 20 THEN
    RAISE WARNING 'Expected 25+ add-ons but found only %. Please check migration.', addon_count;
  END IF;
END $$;

-- Add comment to track restoration
COMMENT ON TABLE service_addons IS 'Restored from backup on 2025-09-02 after accidental deletion in commit c0e2a59';
COMMENT ON TABLE booking_addons IS 'Restored from backup on 2025-09-02 after accidental deletion in commit c0e2a59';