# Medical Spa Booking System - Testing Guide

## Prerequisites

Before testing, ensure you have:

1. **Installed the database functions** by running `fix-database-complete.sql` in Supabase SQL editor
2. **Verified the installation** by running the verification queries at the end of the script
3. **Started the development server** with `npm run dev`

## Quick Test URLs

### API Test Endpoints
- Test Supabase Connection: http://localhost:3000/api/test-supabase
- Check Services Data: http://localhost:3000/api/check-data
- Check Existing Bookings: http://localhost:3000/api/check-bookings
- Create Test Booking: http://localhost:3000/api/test-booking (POST)

### Frontend Flow
1. Start Booking: http://localhost:3000/booking
2. Select Service → Date/Time → Staff → Customer Info → Confirmation

## Manual Testing Steps

### 1. Test Database Connection
```bash
# In your browser console or use curl:
curl http://localhost:3000/api/test-supabase
```

Expected: Should return connection success and list of tables

### 2. Test Service Data
```bash
curl http://localhost:3000/api/check-data
```

Expected: Should return services, staff, and rooms data

### 3. Test Booking Creation via API
```bash
curl -X POST http://localhost:3000/api/test-booking \
  -H "Content-Type: application/json"
```

Expected: Should create a test booking or show specific error

### 4. Test Complete Booking Flow

#### Step 1: Service Selection
1. Go to http://localhost:3000/booking
2. Select any service (e.g., "Classic Facial")
3. Click "Select This Service"

#### Step 2: Date & Time Selection
1. Select a date (avoid Tuesdays/Thursdays if testing with Selma/Tanisha)
2. Wait for available times to load
3. Select a time slot
4. Click "Continue to Staff Selection"

#### Step 3: Staff Selection
1. Available staff should be filtered by:
   - Service capabilities
   - Day availability
   - Time slot conflicts
2. Select a staff member
3. Click "Continue to Customer Info"

#### Step 4: Customer Information
1. Fill in test customer details:
   - Name: Test Customer
   - Email: test@example.com
   - Phone: 555-1234
   - New Customer: Yes
2. Click "Continue to Confirmation"

#### Step 5: Booking Confirmation
1. Review booking details
2. Click "Confirm Booking"
3. Should see success message with booking ID

## Common Issues & Solutions

### Issue 1: "RPC function not found" error
**Solution**: Run the `fix-database-complete.sql` script in Supabase SQL editor

### Issue 2: "Permission denied" errors
**Solution**: Ensure RLS policies are created by running the script

### Issue 3: No available time slots showing
**Solution**: 
1. Check if the RPC function `get_available_time_slots` exists
2. Verify there are no existing bookings blocking all slots
3. Check browser console for specific errors

### Issue 4: Staff not showing up
**Solution**:
1. Verify staff work on the selected day
2. Check if staff have the required service capabilities
3. Ensure staff are marked as active in the database

### Issue 5: Booking creation fails
**Solution**:
1. Check browser console for specific error
2. Verify all required fields are filled
3. Ensure no time conflicts exist
4. Check if customer can be created (RLS policy)

## Database Verification Queries

Run these in Supabase SQL editor to verify setup:

```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'get_available_time_slots',
  'process_booking',
  'assign_optimal_room',
  'check_staff_capability',
  'get_staff_schedule'
);

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings')
ORDER BY tablename, policyname;

-- Test available slots function
SELECT * FROM get_available_time_slots(CURRENT_DATE, NULL, NULL) LIMIT 5;

-- Check existing bookings
SELECT 
  b.id,
  b.appointment_date,
  b.start_time,
  b.end_time,
  s.name as service,
  st.name as staff,
  r.name as room
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN staff st ON b.staff_id = st.id
JOIN rooms r ON b.room_id = r.id
ORDER BY b.appointment_date DESC, b.start_time DESC
LIMIT 10;
```

## Testing Specific Scenarios

### 1. Test Room Assignment Rules
- **Body Scrub Service**: Should only assign Room 3
- **Couples Service**: Should prefer Room 3, then Room 2, never Room 1
- **Regular Service**: Should use staff's default room if available

### 2. Test Staff Availability
- **Leonel**: Should only be available on Sundays
- **Selma/Tanisha**: Should not be available on Tuesdays/Thursdays
- **Service Filtering**: Staff should only show for services they can perform

### 3. Test Booking Conflicts
- Create a booking for a specific time
- Try to book the same staff/room at the same time
- Should show no available slots or prevent booking

### 4. Test Buffer Time
- Book a 60-minute service at 2:00 PM
- Next available slot should be at least 2:15 PM (15-minute buffer)

## Success Indicators

✅ Database functions installed and accessible
✅ RLS policies allow anonymous booking creation
✅ Services load from database
✅ Available time slots reflect actual availability
✅ Staff are filtered by service and availability
✅ Room assignments follow business rules
✅ Bookings are saved to database
✅ Conflicts are properly detected
✅ Error messages are clear and helpful

## Next Steps After Testing

1. If all tests pass: System is ready for production use
2. If tests fail: Check error messages and refer to solutions above
3. For persistent issues: Review the error logs in Supabase dashboard