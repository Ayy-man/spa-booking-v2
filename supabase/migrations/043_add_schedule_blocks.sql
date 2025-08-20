-- Migration: Add schedule_blocks table for staff scheduling management
-- Purpose: Allow staff to block time ranges or full days from their availability

-- Create schedule_blocks table
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id text NOT NULL,
  block_type text NOT NULL CHECK (block_type IN ('full_day', 'time_range')),
  start_date date NOT NULL,
  end_date date, -- NULL for single day blocks
  start_time time without time zone, -- NULL for full day blocks
  end_time time without time zone, -- NULL for full day blocks
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT schedule_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_blocks_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT schedule_blocks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  -- Ensure end_date is after or equal to start_date
  CONSTRAINT schedule_blocks_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  -- Ensure time fields are both provided or both null
  CONSTRAINT schedule_blocks_time_check CHECK (
    (block_type = 'full_day' AND start_time IS NULL AND end_time IS NULL) OR
    (block_type = 'time_range' AND start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  -- Ensure end_time is after start_time for time ranges
  CONSTRAINT schedule_blocks_time_order_check CHECK (
    block_type = 'full_day' OR end_time > start_time
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_schedule_blocks_staff_id ON public.schedule_blocks(staff_id);
CREATE INDEX idx_schedule_blocks_dates ON public.schedule_blocks(start_date, end_date);
CREATE INDEX idx_schedule_blocks_staff_date ON public.schedule_blocks(staff_id, start_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read all schedule blocks
CREATE POLICY "Schedule blocks are viewable by all authenticated users" ON public.schedule_blocks
  FOR SELECT
  USING (true);

-- Allow authenticated users to create, update, and delete schedule blocks
CREATE POLICY "Authenticated users can manage schedule blocks" ON public.schedule_blocks
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_blocks_updated_at
  BEFORE UPDATE ON public.schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.schedule_blocks TO authenticated;
GRANT SELECT ON public.schedule_blocks TO anon;

-- Add helpful comments
COMMENT ON TABLE public.schedule_blocks IS 'Stores staff schedule blocks for time off, breaks, and unavailability';
COMMENT ON COLUMN public.schedule_blocks.block_type IS 'Type of block: full_day for entire days off, time_range for specific hours';
COMMENT ON COLUMN public.schedule_blocks.start_date IS 'Start date of the block period';
COMMENT ON COLUMN public.schedule_blocks.end_date IS 'End date for multi-day blocks, NULL for single day';
COMMENT ON COLUMN public.schedule_blocks.start_time IS 'Start time for time_range blocks, NULL for full_day';
COMMENT ON COLUMN public.schedule_blocks.end_time IS 'End time for time_range blocks, NULL for full_day';
COMMENT ON COLUMN public.schedule_blocks.reason IS 'Optional reason for the schedule block';