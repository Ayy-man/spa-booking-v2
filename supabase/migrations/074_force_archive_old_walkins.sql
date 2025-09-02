-- Force archive ALL walk-ins older than today
-- This will definitely hide them from the main view

-- Show current state
SELECT 
  'Before' as stage,
  COUNT(*) as total,
  COUNT(CASE WHEN archived_at IS NULL THEN 1 END) as not_archived,
  COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived
FROM walk_ins;

-- Force archive everything older than today
UPDATE walk_ins
SET archived_at = COALESCE(archived_at, NOW())
WHERE DATE(created_at AT TIME ZONE 'Pacific/Guam') < DATE(NOW() AT TIME ZONE 'Pacific/Guam');

-- Show after state  
SELECT 
  'After' as stage,
  COUNT(*) as total,
  COUNT(CASE WHEN archived_at IS NULL THEN 1 END) as not_archived,
  COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived
FROM walk_ins;

-- Show what's left (should be empty or only today's walk-ins)
SELECT 
  customer_name,
  service_name,
  status,
  created_at,
  archived_at
FROM walk_ins
WHERE archived_at IS NULL
ORDER BY created_at DESC;