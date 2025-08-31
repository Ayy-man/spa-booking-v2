-- Add archiving support to walk_ins table
-- This migration adds archived_at field and related indexes for efficient archiving and querying

-- Add archived_at column to track when a walk-in was archived
ALTER TABLE public.walk_ins 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create index on archived_at for fast filtering of archived vs non-archived records
CREATE INDEX IF NOT EXISTS idx_walk_ins_archived_at 
ON public.walk_ins(archived_at);

-- Create composite index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_walk_ins_created_archived 
ON public.walk_ins(created_at, archived_at);

-- Create index for status and archived_at combination (common filter pattern)
CREATE INDEX IF NOT EXISTS idx_walk_ins_status_archived 
ON public.walk_ins(status, archived_at);

-- Add comment to document the column
COMMENT ON COLUMN public.walk_ins.archived_at IS 'Timestamp when the walk-in record was archived. NULL means not archived.';

-- Create a function to archive old walk-ins
CREATE OR REPLACE FUNCTION archive_old_walk_ins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer := 0;
  guam_today date;
BEGIN
  -- Calculate Guam today (UTC+10)
  guam_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Pacific/Guam')::date;
  
  -- Archive served and cancelled walk-ins from previous days
  UPDATE public.walk_ins
  SET 
    archived_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    archived_at IS NULL
    AND status IN ('served', 'cancelled', 'no_show')
    AND DATE(created_at AT TIME ZONE 'Pacific/Guam') < guam_today;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Auto-cancel waiting walk-ins from previous days
  UPDATE public.walk_ins
  SET 
    status = 'cancelled',
    notes = COALESCE(notes || E'\n', '') || 'Auto-cancelled: No show - archived at ' || TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Pacific/Guam', 'MM/DD/YYYY HH12:MI AM'),
    archived_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    archived_at IS NULL
    AND status = 'waiting'
    AND DATE(created_at AT TIME ZONE 'Pacific/Guam') < guam_today;
  
  GET DIAGNOSTICS archived_count = archived_count + ROW_COUNT;
  
  RETURN archived_count;
END;
$$;

-- Create a function to get walk-ins with optional archive filter
CREATE OR REPLACE FUNCTION get_walk_ins_filtered(
  include_archived boolean DEFAULT false,
  filter_status text DEFAULT NULL,
  filter_date date DEFAULT NULL,
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  booking_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_phone_formatted text,
  service_name text,
  service_category text,
  scheduling_type text,
  scheduled_date date,
  scheduled_time time,
  notes text,
  status text,
  checked_in_at timestamp with time zone,
  completed_at timestamp with time zone,
  ghl_webhook_sent boolean,
  ghl_webhook_sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  archived_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.customer_id,
    w.booking_id,
    w.customer_name,
    w.customer_email,
    w.customer_phone,
    w.customer_phone_formatted,
    w.service_name,
    w.service_category,
    w.scheduling_type,
    w.scheduled_date,
    w.scheduled_time,
    w.notes,
    w.status,
    w.checked_in_at,
    w.completed_at,
    w.ghl_webhook_sent,
    w.ghl_webhook_sent_at,
    w.created_by,
    w.created_at,
    w.updated_at,
    w.archived_at
  FROM public.walk_ins w
  WHERE 
    -- Archive filter
    (include_archived = true OR w.archived_at IS NULL)
    -- Status filter
    AND (filter_status IS NULL OR w.status = filter_status)
    -- Single date filter
    AND (filter_date IS NULL OR DATE(w.created_at AT TIME ZONE 'Pacific/Guam') = filter_date)
    -- Date range filter
    AND (date_from IS NULL OR DATE(w.created_at AT TIME ZONE 'Pacific/Guam') >= date_from)
    AND (date_to IS NULL OR DATE(w.created_at AT TIME ZONE 'Pacific/Guam') <= date_to)
  ORDER BY w.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_old_walk_ins() TO authenticated;
GRANT EXECUTE ON FUNCTION get_walk_ins_filtered(boolean, text, date, date, date) TO authenticated;