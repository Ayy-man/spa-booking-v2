# Supabase Database Changes Required

## Summary of Changes Needed

To support the new features implemented (service categories, waivers, walk-ins, payment options, etc.), the following database changes are required:

## 1. Apply Database Migration

Run the migration file that has already been created:

```bash
# Apply the new migration
supabase db push
```

The migration file `020_add_waiver_and_walkin_support.sql` contains:

### New Columns Added to Existing Tables:

**bookings table:**
- `waiver_signed` (boolean) - Whether customer signed waiver
- `waiver_data` (jsonb) - Simplified waiver data storage  
- `waiver_signed_at` (timestamp) - When waiver was signed
- `payment_option` (text) - 'deposit' or 'full' payment choice

**customers table:**
- `emergency_contact_relationship` (text) - Relationship to emergency contact

**services table:**
- `popularity_score` (integer) - Numeric popularity score
- `is_recommended` (boolean) - Mark services as recommended
- `is_popular` (boolean) - Mark services as popular
- `buffer_time` (integer) - Already exists from previous migration

### New Tables Created:

**waivers table:**
- Stores detailed waiver information
- Links to customers and bookings
- Includes medical information, signatures, terms
- Has proper RLS policies for staff access

**walk_ins table:**
- Tracks walk-in customer registrations
- Supports immediate and scheduled walk-ins
- Links to GHL webhook integration
- Includes status tracking and notes

## 2. Update Row Level Security (RLS)

The migration automatically sets up RLS policies for:
- Staff can view/insert/update waivers
- Staff can view/insert/update walk-ins

## 3. Database Functions & Triggers

The migration includes:
- Automatic timestamp updates (`updated_at` triggers)
- Proper indexing for performance
- Comments for documentation

## 4. Data Population

The migration will automatically:
- Set `buffer_time = 10` for all services except waxing (which gets 0)
- Mark popular services based on frontend configuration
- Mark recommended services for upselling

## 5. TypeScript Types

The `database.ts` types file has been updated to include:
- All new columns in existing tables
- Complete type definitions for new tables
- Proper Insert/Update type variants

## 6. Verification Steps

After applying the migration, verify:

1. **Check new columns exist:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('bookings', 'customers', 'services', 'waivers', 'walk_ins')
ORDER BY table_name, ordinal_position;
```

2. **Verify RLS policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('waivers', 'walk_ins');
```

3. **Check service data:**
```sql
SELECT name, buffer_time, is_popular, is_recommended 
FROM services 
ORDER BY name;
```

## 7. No Manual Data Changes Required

All data updates (buffer times, popularity flags) are handled automatically by the migration script.

## Notes

- The migration is designed to be safe and non-destructive
- All new columns have appropriate defaults
- Existing data will not be affected
- The migration can be rolled back if needed

## Files Modified

- ✅ `supabase/migrations/020_add_waiver_and_walkin_support.sql` - New migration
- ✅ `src/types/database.ts` - Updated TypeScript types
- ✅ Previous migration `019_update_service_buffer_times.sql` already exists

## Ready to Deploy

All necessary database changes are documented and ready to be applied to Supabase.