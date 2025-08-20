-- Fix RLS policies for schedule_blocks table to allow admin operations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Schedule blocks are viewable by all authenticated users" ON public.schedule_blocks;

-- Create more permissive policies for admin operations

-- Policy 1: Allow anyone to view schedule blocks (needed for booking system)
CREATE POLICY "Schedule blocks are viewable by everyone" 
ON public.schedule_blocks
FOR SELECT
USING (true);

-- Policy 2: Allow insert without authentication (for admin panel)
CREATE POLICY "Anyone can create schedule blocks" 
ON public.schedule_blocks
FOR INSERT
WITH CHECK (true);

-- Policy 3: Allow update without authentication (for admin panel)
CREATE POLICY "Anyone can update schedule blocks" 
ON public.schedule_blocks
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy 4: Allow delete without authentication (for admin panel)
CREATE POLICY "Anyone can delete schedule blocks" 
ON public.schedule_blocks
FOR DELETE
USING (true);

-- Alternative: If you want to completely disable RLS for this table (simplest solution)
-- ALTER TABLE public.schedule_blocks DISABLE ROW LEVEL SECURITY;

-- Grant permissions to ensure access
GRANT ALL ON public.schedule_blocks TO anon;
GRANT ALL ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;