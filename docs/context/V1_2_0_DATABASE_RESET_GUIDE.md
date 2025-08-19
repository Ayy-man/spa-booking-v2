# Database Reset to v1.2.0 - Complete Guide

## Overview
This guide will help you reset your Supabase database to match the v1.2.0 release schema, removing all newer features that were added after that version.

## Current Situation
- ✅ **Local Code**: Rolled back to v1.2.0 (commit c3991c4)
- ❌ **Supabase Database**: Still contains newer features (post-v1.2.0)
- ⚠️ **Result**: Schema mismatch causing potential issues

## What v1.2.0 Includes
Based on the CHANGELOG, v1.2.0 contains:
- **Phone Number Input System** for Guam (671) with auto-formatting
- **Complete Booking Cancellation System** with timestamps and reasons
- **Standardized Booking Management Modal** for consistent admin interface
- **Fixed Quick Add Duration Constraint** errors
- **Migrations 039-042**: Phone formatting, booking cancellation, triggers

## What Will Be Removed (Post-v1.2.0 Features)
- ❌ **Selma Webhook Integration** (migration 045)
- ❌ **Advanced Break Times** (multiple break slots)
- ❌ **Enhanced Staff Scheduling** (default start/end times)
- ❌ **Service Popularity Features** (recommendations, popularity scores)
- ❌ **Advanced Couples Booking** (couples-specific room requirements)
- ❌ **Webhook Failure Tracking** (webhook_failures table)

## Step-by-Step Reset Process

### Step 1: Create Backup Log Table
```sql
-- Run this in Supabase SQL Editor
\i scripts/create_backup_log_table.sql
```

### Step 2: Backup Important Data
```sql
-- Run this in Supabase SQL Editor
\i scripts/backup_before_v1_2_0_reset.sql
```

### Step 3: Reset Database Schema
```sql
-- Run this in Supabase SQL Editor
\i supabase/migrations/RESET_TO_V1_2_0.sql
```

### Step 4: Verify Reset
Check that the following v1.2.0 features are working:
- ✅ Phone formatting for Guam numbers
- ✅ Booking cancellation system
- ✅ Couples booking (v1.1.0 features)
- ✅ Basic admin functionality

## Files Created for This Reset

### 1. `supabase/migrations/RESET_TO_V1_2_0.sql`
- **Purpose**: Main reset migration
- **Action**: Removes all post-v1.2.0 features
- **Safety**: Uses `DROP IF EXISTS` and `DROP COLUMN IF EXISTS`

### 2. `scripts/create_backup_log_table.sql`
- **Purpose**: Creates backup logging table
- **Action**: Simple table creation
- **Safety**: `CREATE IF NOT EXISTS`

### 3. `scripts/backup_before_v1_2_0_reset.sql`
- **Purpose**: Backs up newer data before reset
- **Action**: Creates backup tables with `_backup_` prefix
- **Safety**: Preserves all potentially important data

## Safety Measures

### ✅ **Data Preservation**
- All newer data is backed up before removal
- Backup tables use `_backup_` prefix for easy identification
- No data is permanently lost

### ✅ **Rollback Capability**
- If something goes wrong, you can restore from backups
- All operations are wrapped in a transaction
- Verification checks ensure schema integrity

### ✅ **Incremental Approach**
- Each step can be run independently
- Clear logging of what's being removed
- Verification after each major step

## Post-Reset Verification

### 1. **Schema Check**
```sql
-- Verify v1.2.0 tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE '_backup_%'
ORDER BY table_name;
```

### 2. **Feature Testing**
- Test phone input formatting for Guam numbers
- Test booking cancellation functionality
- Test couples booking system
- Verify admin panel works correctly

### 3. **Build Verification**
```bash
npm run build
```
Should complete without errors.

## Rollback Plan (If Needed)

If you need to restore the newer features:

### Option 1: Restore from Backups
```sql
-- Restore specific features from backup tables
-- (Custom restore scripts would be needed)
```

### Option 2: Revert Git Rollback
```bash
git pull origin main
# This will restore your code to the latest version
```

### Option 3: Re-apply Migrations
```bash
# Re-apply the newer migrations manually
# (Would need to recreate the migration files)
```

## Expected Outcome

After this reset:
- ✅ **Database Schema**: Matches v1.2.0 exactly
- ✅ **Local Code**: Already at v1.2.0
- ✅ **Schema Consistency**: No more mismatches
- ✅ **Build Success**: No more TypeScript errors
- ✅ **Feature Compatibility**: All v1.2.0 features work correctly

## Next Steps After Reset

1. **Test the Application**: Ensure all v1.2.0 features work
2. **Verify Build**: Run `npm run build` successfully
3. **Deploy**: Push the v1.2.0 code to production
4. **Monitor**: Watch for any unexpected issues
5. **Cleanup**: Remove backup tables after confirming stability

## Support

If you encounter any issues during this reset:
1. Check the backup tables for any lost data
2. Review the migration logs in Supabase
3. Consider reverting the git rollback instead
4. Contact for assistance with complex issues

---

**⚠️ IMPORTANT**: This reset will remove newer features permanently. Make sure this is what you want before proceeding!
