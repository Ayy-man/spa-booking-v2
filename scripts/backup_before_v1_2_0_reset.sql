-- ============================================
-- BACKUP SCRIPT BEFORE V1.2.0 RESET
-- ============================================
-- Run this BEFORE running the RESET_TO_V1_2_0.sql migration
-- This will backup any data that might be lost during the reset
-- ============================================

-- Create backup tables for any newer data
CREATE TABLE IF NOT EXISTS public._backup_webhook_failures AS 
SELECT * FROM public.webhook_failures;

CREATE TABLE IF NOT EXISTS public._backup_bookings_newer_columns AS 
SELECT 
    id,
    booking_group_id,
    booking_type,
    waiver_signed,
    waiver_data,
    waiver_signed_at,
    payment_option
FROM public.bookings 
WHERE booking_group_id IS NOT NULL 
   OR booking_type IS NOT NULL 
   OR waiver_signed = true 
   OR payment_option IS NOT NULL;

CREATE TABLE IF NOT EXISTS public._backup_staff_newer_columns AS 
SELECT 
    id,
    service_exclusions,
    default_start_time,
    default_end_time
FROM public.staff 
WHERE service_exclusions IS NOT NULL 
   OR default_start_time IS NOT NULL 
   OR default_end_time IS NOT NULL;

CREATE TABLE IF NOT EXISTS public._backup_services_newer_columns AS 
SELECT 
    id,
    popularity_score,
    is_recommended,
    is_popular,
    is_couples_service,
    requires_couples_room
FROM public.services 
WHERE popularity_score IS NOT NULL 
   OR is_recommended = true 
   OR is_popular = true 
   OR is_couples_service = true 
   OR requires_couples_room = true;

-- Backup any newer data that might be important
CREATE TABLE IF NOT EXISTS public._backup_customers_phone_formatted AS 
SELECT 
    id,
    phone_formatted,
    emergency_contact_phone_formatted
FROM public.customers 
WHERE phone_formatted IS NOT NULL 
   OR emergency_contact_phone_formatted IS NOT NULL;

-- Log the backup
INSERT INTO public._backup_log (backup_type, created_at, notes) VALUES 
('v1_2_0_reset_backup', NOW(), 'Backup created before resetting database to v1.2.0 schema');

-- ============================================
-- BACKUP COMPLETE
-- ============================================
-- The following tables have been backed up:
-- 1. _backup_webhook_failures - Any webhook failure data
-- 2. _backup_bookings_newer_columns - Newer booking data
-- 3. _backup_staff_newer_columns - Newer staff data  
-- 4. _backup_services_newer_columns - Newer service data
-- 5. _backup_customers_phone_formatted - Phone formatting data
-- 6. _backup_log - Backup tracking
-- ============================================
-- Now you can safely run RESET_TO_V1_2_0.sql
-- ============================================
