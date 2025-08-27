# Migration Troubleshooting Guide

## Current Status
✅ Migration ran successfully but with limited insertions:
- Only 3 new services added (should be 100+)
- Only 18 add-ons added (should be 25)
- Add-on system is working (3 add-ons show for massage)

## Why Services Might Not Be Inserting

The migration uses `ON CONFLICT (id) DO NOTHING` which means:
1. If a service with that ID already exists, it won't be updated
2. Services are silently skipped if they exist

## Diagnostic Steps

### 1. Check What Services Already Exist
```sql
-- See all current services
SELECT id, name, category FROM services ORDER BY category, name;

-- Count by category
SELECT category, COUNT(*) FROM services GROUP BY category;
```

### 2. Find Conflicting IDs
```sql
-- Check if these IDs already exist
SELECT id FROM services WHERE id IN (
  'vitamin_c_treatment', 'collagen_treatment', 'microderm_abrasion',
  'hair_scalp_30', 'hair_scalp_60', 'headspa_30'
);
```

### 3. Force Update Approach
If you want to UPDATE existing services or force new ones:

```sql
-- Option A: Delete and re-insert (CAREFUL - this affects bookings!)
-- DELETE FROM services WHERE id LIKE '%treatment%' OR id LIKE '3face%';

-- Option B: Use UPSERT to update existing
-- Change ON CONFLICT (id) DO NOTHING to:
-- ON CONFLICT (id) DO UPDATE SET 
--   name = EXCLUDED.name,
--   price = EXCLUDED.price,
--   duration = EXCLUDED.duration,
--   allows_addons = EXCLUDED.allows_addons;
```

## Solutions

### Solution 1: Check for ID Conflicts
Many of your existing services might have IDs that conflict with the new ones. For example:
- You might already have 'vitamin_c_treatment' as 'vitamin_c_facial'
- Or 'microderm_abrasion' as 'microderm_facial'

### Solution 2: Create a Clean Insert Script
```sql
-- First, check what's missing
WITH new_service_ids AS (
  SELECT 'consultation' as id
  UNION SELECT '3face_basic_micro'
  UNION SELECT '3face_deep_cleansing'
  -- ... add all expected IDs
)
SELECT n.id 
FROM new_service_ids n
LEFT JOIN services s ON n.id = s.id
WHERE s.id IS NULL;
```

### Solution 3: Rename Service IDs
If there are conflicts, rename the new service IDs:
```sql
-- Instead of 'consultation', use 'consultation_service'
-- Instead of 'vitamin_c_treatment', use 'vitamin_c_treat_new'
```

## Quick Fix Script

Run this to see what's actually in your database vs what we're trying to add:

```sql
-- 1. Show existing services that might conflict
SELECT id, name, price, duration, category 
FROM services 
WHERE 
  id LIKE '%consult%' OR
  id LIKE '%3face%' OR
  id LIKE '%vitamin%' OR
  id LIKE '%collagen%' OR
  id LIKE '%micro%' OR
  id LIKE '%scalp%' OR
  id LIKE '%headspa%'
ORDER BY id;

-- 2. Count services by name pattern
SELECT 
  COUNT(CASE WHEN name ILIKE '%facial%' THEN 1 END) as facial_services,
  COUNT(CASE WHEN name ILIKE '%massage%' THEN 1 END) as massage_services,
  COUNT(CASE WHEN name ILIKE '%wax%' THEN 1 END) as wax_services,
  COUNT(CASE WHEN name ILIKE '%treatment%' THEN 1 END) as treatment_services
FROM services;
```

## Next Steps

1. **Run the diagnostic queries** above to understand what's in your database
2. **Identify conflicts** - which service IDs already exist
3. **Decide on approach**:
   - Rename new service IDs to avoid conflicts
   - Update existing services with new data
   - Create a separate migration for truly new services only
4. **Test add-on system** - it's working but needs more add-ons

## Add-ons Status

✅ Add-on system is functional
- 3 massage add-ons are working
- Need to add remaining 22 add-ons
- Helper function `get_available_addons` is working correctly

The issue is likely that facial and treatment add-ons reference services that weren't created due to ID conflicts.