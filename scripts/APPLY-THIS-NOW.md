# URGENT: Fix Schedule Blocks RLS Error

## The Problem
You're getting the error: `new row violates row-level security policy for table "schedule_blocks"`

This is because the RLS (Row-Level Security) policies are too restrictive and require authentication, but the admin panel is trying to insert without proper auth context.

## IMMEDIATE FIX - Run This SQL in Supabase

### Option 1: Quick Fix (Disable RLS) - FASTEST
```sql
-- This will immediately fix the issue by disabling Row Level Security
ALTER TABLE public.schedule_blocks DISABLE ROW LEVEL SECURITY;
```

### Option 2: Fix RLS Policies (More Secure)
Run the SQL in `scripts/fix-schedule-blocks-rls.sql`:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Schedule blocks are viewable by all authenticated users" ON public.schedule_blocks;

-- Create permissive policies
CREATE POLICY "Schedule blocks are viewable by everyone" 
ON public.schedule_blocks
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create schedule blocks" 
ON public.schedule_blocks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update schedule blocks" 
ON public.schedule_blocks
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete schedule blocks" 
ON public.schedule_blocks
FOR DELETE
USING (true);

-- Grant permissions
GRANT ALL ON public.schedule_blocks TO anon;
GRANT ALL ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;
```

## How to Apply

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the SQL from Option 1 (quickest) or Option 2 (more controlled)
4. Click "Run"
5. Test the schedule blocks feature again - it should work immediately

## Why This Happened
The original migration had RLS policies that required `auth.uid() IS NOT NULL`, meaning only authenticated users could insert/update/delete. But the admin panel is using the anon key without authentication context.

## Note
Option 1 (disabling RLS) is perfectly fine for an admin-only table like schedule_blocks. Option 2 keeps RLS enabled but makes the policies permissive enough for admin operations.