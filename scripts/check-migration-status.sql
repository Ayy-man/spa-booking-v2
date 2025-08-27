-- Check Migration Status

-- 1. Count total services
SELECT 'Total Services' as metric, COUNT(*) as count FROM services;

-- 2. Check for specific new services that should have been added
SELECT 'New Services Found' as check_type, COUNT(*) as found FROM services 
WHERE id IN (
  'consultation', '3face_basic_micro', '3face_deep_cleansing',
  'vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion',
  'lactic_peel', 'derma_roller', 'microneedling', 
  'hydrafacial_sig', 'hollywood_facial_sig', 'soothing_facial'
);

-- 3. List all service categories and counts
SELECT category, COUNT(*) as count 
FROM services 
GROUP BY category 
ORDER BY category;

-- 4. Check which new services are missing
WITH expected_services AS (
  SELECT id FROM (VALUES 
    ('consultation'),
    ('3face_basic_micro'),
    ('3face_deep_cleansing'),
    ('3face_placenta'),
    ('3face_treatment1'),
    ('3face_treatment2'),
    ('3face_vitaminc'),
    ('3face_peel'),
    ('3face_deep_tissue'),
    ('sideburns_wax'),
    ('upper_leg_wax'),
    ('inner_thighs_wax'),
    ('nostrils_wax'),
    ('french_bikini_wax'),
    ('back_wax'),
    ('buttocks_wax'),
    ('ears_wax'),
    ('feet_toes_wax'),
    ('hands_fingers_wax'),
    ('hair_scalp_30'),
    ('hair_scalp_60'),
    ('headspa_30'),
    ('headspa_60'),
    ('vitamin_c_treatment'),
    ('collagen_treatment'),
    ('microderm_abrasion'),
    ('hydrating_glow'),
    ('lightening_treatment')
  ) AS t(id)
)
SELECT 'Missing Services' as check_type, 
       e.id as service_id
FROM expected_services e
LEFT JOIN services s ON e.id = s.id
WHERE s.id IS NULL
LIMIT 10;

-- 5. Count add-ons
SELECT 'Total Add-ons' as metric, COUNT(*) as count FROM service_addons;

-- 6. List add-ons by category
SELECT category, COUNT(*) as count 
FROM service_addons 
GROUP BY category;

-- 7. Check if allows_addons column exists and which services have it
SELECT 'Services Allowing Add-ons' as metric, COUNT(*) as count 
FROM services 
WHERE allows_addons = true;

-- 8. Check existing services to understand what's already there
SELECT id, name, category, duration, price 
FROM services 
WHERE category IN ('facials', 'massages')
ORDER BY category, name
LIMIT 20;