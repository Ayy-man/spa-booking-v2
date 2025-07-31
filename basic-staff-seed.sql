-- Basic Staff Seed Data
-- Add essential staff members to make the booking system work

-- First, ensure we have rooms (these should already exist)
INSERT INTO rooms (id, name, capacity, capabilities, is_active) VALUES
(1, 'Room 1', 1, ARRAY['facials', 'massages', 'waxing', 'treatments']::service_category[], true),
(2, 'Room 2', 2, ARRAY['facials', 'massages', 'waxing', 'treatments']::service_category[], true),
(3, 'Room 3', 2, ARRAY['facials', 'massages', 'waxing', 'treatments']::service_category[], true)
ON CONFLICT (id) DO NOTHING;

-- Add basic staff members
INSERT INTO staff (id, name, email, phone, specialties, capabilities, work_days, default_room_id, role, initials, is_active) VALUES
(
    'selma_villaver',
    'Selma Villaver',
    'selma@dermalspa.com',
    '(671) 647-7546',
    'Facial specialist and skin care expert',
    ARRAY['facials', 'treatments']::service_category[],
    ARRAY[1, 3, 5, 6, 0], -- Monday, Wednesday, Friday, Saturday, Sunday
    1,
    'therapist',
    'SV',
    true
),
(
    'maria_santos',
    'Maria Santos',
    'maria@dermalspa.com',
    '(671) 647-7547',
    'Massage therapist and body treatment specialist',
    ARRAY['massages', 'treatments', 'waxing']::service_category[],
    ARRAY[1, 2, 3, 4, 5], -- Monday through Friday
    2,
    'therapist',
    'MS',
    true
),
(
    'ana_rodriguez',
    'Ana Rodriguez',
    'ana@dermalspa.com',
    '(671) 647-7548',
    'Full service therapist specializing in waxing and treatments',
    ARRAY['waxing', 'treatments', 'facials']::service_category[],
    ARRAY[0, 2, 4, 6], -- Sunday, Tuesday, Thursday, Saturday
    3,
    'therapist',
    'AR',
    true
),
(
    'any',
    'Any Available Staff',
    'admin@dermalspa.com',
    '(671) 647-7546',
    'System placeholder for any available staff member',
    ARRAY['facials', 'massages', 'waxing', 'treatments']::service_category[],
    ARRAY[0, 1, 2, 3, 4, 5, 6], -- All days
    null,
    'therapist',
    'AA',
    true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  specialties = EXCLUDED.specialties,
  capabilities = EXCLUDED.capabilities,
  work_days = EXCLUDED.work_days,
  default_room_id = EXCLUDED.default_room_id,
  role = EXCLUDED.role,
  initials = EXCLUDED.initials,
  is_active = EXCLUDED.is_active;

-- Verify the data
SELECT 
  id, 
  name, 
  capabilities, 
  work_days, 
  is_active 
FROM staff 
WHERE is_active = true
ORDER BY name;