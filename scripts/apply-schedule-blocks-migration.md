# Schedule Blocks Migration Script

## Overview
This migration adds the `schedule_blocks` table to enable staff schedule management functionality.

## Files Added/Modified
- `supabase/migrations/043_add_schedule_blocks.sql` - Database migration
- `src/types/database.ts` - Added schedule_blocks types
- `src/types/booking.ts` - Added ScheduleBlock types
- `src/lib/booking-logic.ts` - Added schedule block checking functions
- `src/components/admin/ScheduleManagement.tsx` - New admin component
- `src/app/admin/page.tsx` - Added Schedule Management tab

## To Apply the Migration

### Option 1: Using Supabase CLI
```bash
# Run the specific migration
supabase db push

# Or if you want to run just this migration
supabase migration up --target-version 043
```

### Option 2: Manual SQL Execution
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/043_add_schedule_blocks.sql`
4. Execute the SQL

## Verification
After applying the migration, verify it worked by:

1. **Check the table exists:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'schedule_blocks';
   ```

2. **Check the table structure:**
   ```sql
   \d schedule_blocks;
   ```

3. **Test inserting a sample record:**
   ```sql
   INSERT INTO schedule_blocks (staff_id, block_type, start_date, reason)
   VALUES ('existing_staff_id', 'full_day', '2025-01-01', 'New Year Holiday');
   ```

## Features Enabled
Once the migration is applied, the admin panel will have a new "Schedule Management" tab that allows:

- ✅ View all staff schedule blocks
- ✅ Filter by individual staff members
- ✅ Add full-day blocks (staff unavailable entire day)
- ✅ Add time-range blocks (staff unavailable for specific hours)
- ✅ Edit existing blocks
- ✅ Delete blocks
- ✅ Conflict detection with existing bookings
- ✅ Integration with booking availability system

## Integration with Booking System
The schedule blocks automatically integrate with the booking flow:

- Blocked times won't appear as available in the booking system
- Staff availability checks include schedule blocks
- Booking validation prevents conflicts with schedule blocks

## Next Steps
1. Apply the database migration
2. Restart your application
3. Login to the admin panel
4. Navigate to the "Schedule Management" tab
5. Test creating schedule blocks for staff members

## Rollback (if needed)
To rollback this migration:
```sql
DROP TABLE IF EXISTS public.schedule_blocks;
```

Note: This will permanently delete all schedule block data.