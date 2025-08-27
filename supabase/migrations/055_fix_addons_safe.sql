-- Migration: Safely add add-ons tables and function (handles existing objects)
-- Description: Creates add-on tables and function only if they don't exist
-- Date: 2025-01-27

-- ============================================
-- PART 1: CREATE TABLES IF NOT EXISTS
-- ============================================

-- Create service_addons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0, -- in minutes
  category TEXT,
  applies_to_services TEXT[], -- array of service IDs this addon applies to
  max_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_addons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES public.service_addons(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_booking NUMERIC(10,2) NOT NULL,
  duration_at_booking INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking_id ON public.booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_addon_id ON public.booking_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_category ON public.service_addons(category);
CREATE INDEX IF NOT EXISTS idx_service_addons_active ON public.service_addons(is_active);

-- ============================================
-- PART 2: CREATE OR REPLACE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "service_addons_read_all" ON public.service_addons;
DROP POLICY IF EXISTS "service_addons_admin_all" ON public.service_addons;
DROP POLICY IF EXISTS "booking_addons_read_own" ON public.booking_addons;
DROP POLICY IF EXISTS "booking_addons_admin_all" ON public.booking_addons;

-- Enable RLS on tables
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- Service addons policies
CREATE POLICY "service_addons_read_all" ON public.service_addons
  FOR SELECT USING (true);

CREATE POLICY "service_addons_admin_all" ON public.service_addons
  FOR ALL USING (true);

-- Booking addons policies  
CREATE POLICY "booking_addons_read_own" ON public.booking_addons
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.customers c ON b.customer_id = c.id 
      WHERE c.email = current_setting('app.current_user_email', true)
    )
  );

CREATE POLICY "booking_addons_admin_all" ON public.booking_addons
  FOR ALL USING (true);

-- ============================================
-- PART 3: CREATE OR REPLACE FUNCTION
-- ============================================

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
  WHERE 
    sa.is_active = true
    AND (
      sa.applies_to_services IS NULL 
      OR service_id_param = ANY(sa.applies_to_services)
    )
  ORDER BY sa.category, sa.price;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: INSERT ADD-ONS DATA (IF NOT EXISTS)
-- ============================================

-- Massage Add-ons (for 60-minute massages)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_hot_stone', 'Hot Stone Add-on', 'Add hot stones to your massage', 30, 20, 'massage_addon', 
  ARRAY['balinese_massage', 'deep_tissue_massage', 'prenatal_massage', 'couples_balinese', 'couples_deep_tissue', 'couples_prenatal']::text[], 1),
('addon_aromatherapy', 'Aromatherapy Add-on', 'Essential oil aromatherapy enhancement', 25, 15, 'massage_addon',
  ARRAY['balinese_massage', 'deep_tissue_massage', 'prenatal_massage', 'couples_balinese', 'couples_deep_tissue', 'couples_prenatal']::text[], 1),
('addon_deep_focus', 'Deep Tissue Focus Add-on', 'Extra focus on problem areas', 20, 15, 'massage_addon',
  ARRAY['balinese_massage', 'deep_tissue_massage', 'prenatal_massage', 'couples_balinese', 'couples_deep_tissue', 'couples_prenatal']::text[], 1),
('addon_scalp_massage', 'Scalp Massage Add-on', 'Relaxing scalp massage', 15, 10, 'massage_addon',
  ARRAY['balinese_massage', 'deep_tissue_massage', 'prenatal_massage', 'couples_balinese', 'couples_deep_tissue', 'couples_prenatal']::text[], 1),
('addon_foot_reflexology', 'Foot Reflexology Add-on', 'Therapeutic foot massage', 20, 15, 'massage_addon',
  ARRAY['balinese_massage', 'deep_tissue_massage', 'prenatal_massage', 'couples_balinese', 'couples_deep_tissue', 'couples_prenatal']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Body Treatment Add-ons (30/60 minute treatments)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_body_aromatherapy', 'Aromatherapy Enhancement', 'Add aromatherapy to your treatment', 25, 15, 'body_addon',
  ARRAY['hair_scalp_30', 'hair_scalp_60', 'headspa_30', 'headspa_60', 'body_scrub_30', 'body_scrub_60', 
        'moisturizing_30', 'moisturizing_60']::text[], 1),
('addon_extra_exfoliation', 'Extra Exfoliation', 'Additional exfoliation treatment', 35, 20, 'body_addon',
  ARRAY['body_scrub_30', 'body_scrub_60']::text[], 1),
('addon_hydrating_mask', 'Hydrating Mask', 'Deep hydration mask treatment', 40, 20, 'body_addon',
  ARRAY['moisturizing_30', 'moisturizing_60', 'body_scrub_30', 'body_scrub_60']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Face Treatment Level 1 Add-on (for specific services)
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_1', 'Face Treatment #1 Add-on', 'Add a Face Treatment #1 service to your facial', 50, 30, 'facial_addon_1', 
  ARRAY['vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion', 'hydrating_glow', 'lightening_treatment', 
        'sunburn_treatment', 'acne_pimple_treatment', 'extreme_softness', 'oily_skin_treatment']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Face Treatment Level 2 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_2', 'Face Treatment #2 Add-on', 'Add a Face Treatment #2 service to your facial', 60, 30, 'facial_addon_2',
  ARRAY['lactic_peel', 'salicylic_peel', 'glycolic_led', 'led_photo_aging', 'obaji_whitening', 'oxygen_face']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Face Treatment Level 3 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
('addon_face_treatment_3', 'Face Treatment #3 Add-on', 'Add a Face Treatment #3 service to your facial', 85, 45, 'facial_addon_3',
  ARRAY['derma_roller', 'dermaplaning', 'glassy_skin']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- Face Treatment Level 4 Add-on
INSERT INTO public.service_addons (id, name, description, price, duration, category, applies_to_services, max_quantity) VALUES
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
('addon_dermaplan', 'Derma Planning Add-on', 'Add dermaplanning treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_microneed', 'Microneedling Add-on', 'Add microneedling treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1),
('addon_dark_spot', 'Dark Spot Treatment Add-on', 'Add dark spot treatment', 120, 60, 'facial_addon_premium',
  ARRAY['microneedling', 'vampire_facial', 'radio_frequency', 'nano_treatment', 'hydrafacial']::text[], 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 5: VERIFY AND REPORT
-- ============================================

DO $$
DECLARE
  v_addon_count INTEGER;
  v_table_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_addons'
  ) INTO v_table_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_available_addons'
  ) INTO v_function_exists;
  
  -- Count add-ons
  SELECT COUNT(*) INTO v_addon_count FROM public.service_addons;
  
  RAISE NOTICE 'Add-ons migration complete:';
  RAISE NOTICE '  service_addons table exists: %', v_table_exists;
  RAISE NOTICE '  get_available_addons function exists: %', v_function_exists;
  RAISE NOTICE '  Total add-ons in database: %', v_addon_count;
END $$;