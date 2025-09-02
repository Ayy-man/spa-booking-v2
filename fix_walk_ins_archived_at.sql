-- URGENT FIX: Add missing archived_at column to walk_ins table
-- Run this directly in your Supabase SQL editor

-- 1. Add the archived_at column if it doesn't exist
ALTER TABLE public.walk_ins 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- 2. Create necessary indexes for performance
CREATE INDEX IF NOT EXISTS idx_walk_ins_archived_at 
ON public.walk_ins(archived_at);

CREATE INDEX IF NOT EXISTS idx_walk_ins_created_archived 
ON public.walk_ins(created_at, archived_at);

CREATE INDEX IF NOT EXISTS idx_walk_ins_status_archived 
ON public.walk_ins(status, archived_at);

-- 3. Add comment to document the column
COMMENT ON COLUMN public.walk_ins.archived_at IS 'Timestamp when the walk-in record was archived. NULL means not archived.';

-- 4. Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'walk_ins' 
AND column_name = 'archived_at';

-- This should return one row showing the archived_at column exists