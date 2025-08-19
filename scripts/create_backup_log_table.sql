-- ============================================
-- CREATE BACKUP LOG TABLE
-- ============================================
-- Run this first to create the backup logging table
-- ============================================

CREATE TABLE IF NOT EXISTS public._backup_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    notes text,
    CONSTRAINT _backup_log_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLE CREATED
-- ============================================
-- Now you can run the backup script
-- ============================================
