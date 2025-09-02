-- Archive old walk-ins and add the missing archived_at column
-- Run this in your Supabase SQL editor RIGHT NOW

-- STEP 1: Add the archived_at column if it doesn't exist
ALTER TABLE public.walk_ins 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- STEP 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_walk_ins_archived_at ON public.walk_ins(archived_at);
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_archived ON public.walk_ins(created_at, archived_at);
CREATE INDEX IF NOT EXISTS idx_walk_ins_status_archived ON public.walk_ins(status, archived_at);

-- STEP 3: Archive all old walk-ins (older than today)
UPDATE public.walk_ins
SET archived_at = NOW()
WHERE archived_at IS NULL
  AND DATE(created_at AT TIME ZONE 'Pacific/Guam') < DATE(NOW() AT TIME ZONE 'Pacific/Guam');

-- STEP 4: Show what was archived
SELECT 
  COUNT(*) as archived_count,
  MIN(created_at) as oldest_archived,
  MAX(created_at) as newest_archived
FROM public.walk_ins
WHERE archived_at IS NOT NULL;

-- STEP 5: Show remaining non-archived walk-ins (should only be today's)
SELECT 
  customer_name,
  service_name,
  status,
  created_at
FROM public.walk_ins
WHERE archived_at IS NULL
ORDER BY created_at DESC;