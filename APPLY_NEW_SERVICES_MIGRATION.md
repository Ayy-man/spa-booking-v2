# Instructions to Apply New Services and Add-ons Migration

## Quick Steps

### 1. Apply the Database Migration

Go to your Supabase SQL Editor and run the migration:

```sql
-- Copy and paste the entire contents of:
-- /supabase/migrations/053_add_services_and_addons.sql
```

This migration will:
- Create add-on system tables
- Insert ~110 new services
- Insert 25 add-on options
- Set up helper functions
- Configure security policies

### 2. Verify Migration Success

Run these queries to verify:

```sql
-- Check new services were added
SELECT COUNT(*) as new_services_count 
FROM public.services 
WHERE id IN ('consultation', '3face_basic_micro', 'sideburns_wax');

-- Should return: 3

-- Check add-ons were created
SELECT COUNT(*) as addon_count 
FROM public.service_addons;

-- Should return: 25

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('service_addons', 'booking_addons');

-- Should return: 2 rows
```

### 3. Test Add-on System

```sql
-- Test getting add-ons for a massage service
SELECT * FROM get_available_addons('balinese_massage');

-- Should return massage add-ons

-- Test getting add-ons for a facial service
SELECT * FROM get_available_addons('vitamin_c_treatment');

-- Should return facial add-ons
```

## What's Been Added

### New Services Summary:
- **Consultation**: Professional consultation service
- **8 Face Packages**: Comprehensive 90-minute packages
- **10 Additional Waxing Services**: Extended waxing menu
- **18 Body Treatments**: 30/60 minute treatment options
- **23 Face Treatments**: Levels 1-4 with various prices
- **13 Signature Treatments**: Premium spa services
- **6 Miscellaneous**: VIP membership, extractions, etc.

### Add-on Categories:
- **Massage Add-ons**: Hot stone, moisturizing, time extensions
- **Facial Add-ons**: Treatment upgrades by level
- **Premium Add-ons**: High-end facial enhancements

## TypeScript Types Already Updated

The following files have been updated with add-on support:
- ✅ `/src/types/database.ts` - Added add-on table types
- ✅ `/src/types/booking.ts` - Added add-on interfaces
- ✅ `/src/lib/waiver-content.ts` - Enhanced waxing detection

## Next Steps for UI

The backend is ready. Next steps for frontend:

1. **Create Add-on Selection UI**
   - Build `/src/app/booking/addons/page.tsx`
   - Display compatible add-ons for selected service
   - Calculate price updates

2. **Update Booking Flow**
   - Insert add-on step after service selection
   - Update progress indicator
   - Pass add-ons to confirmation

3. **Update Admin Panel**
   - Display add-ons in booking details
   - Show extended duration
   - Include in reports

## Important Notes

- **All existing services remain unchanged**
- **Couples booking functionality preserved**
- **Staff assignments work as before**
- **Add-ons are optional** - bookings work without them
- **Waivers automatically triggered** for all waxing services

## Support

If you encounter any issues:
1. Check the migration output for errors
2. Verify all services appear in the database
3. Test with a simple booking first (no add-ons)
4. Then test with add-ons

The system is backward compatible - existing bookings and functionality will continue to work normally.