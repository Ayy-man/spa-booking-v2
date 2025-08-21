# Testing Staff Reassignment Feature

## How to Access the Feature

The "Reassign Staff" button appears in **TWO locations** in the booking details modal:

### Location 1: Next to Staff Member Field
- Look for a small "Reassign" button with pencil icon next to the "Staff Member" label
- This appears inline with the staff name

### Location 2: In the Footer Actions
- Look for a blue "Reassign Staff" button at the bottom of the modal
- This appears alongside other action buttons like "Reschedule" and "Cancel Booking"

## Prerequisites for the Button to Appear

The reassignment button will **ONLY** show when:
1. ✅ The booking status is **NOT** 'cancelled'
2. ✅ The booking status is **NOT** 'completed' 
3. ✅ The booking status is **NOT** 'no_show'
4. ✅ You are logged in as an admin

## Steps to Test

1. **Open Admin Panel**
   - Go to `/admin`
   - Login with admin credentials

2. **Find a Booking**
   - Go to "All Bookings" or "Today's Schedule"
   - Click on any booking with status "pending" or "confirmed"
   - The booking details modal will open

3. **Look for Reassign Button**
   - Check next to "Staff Member" label (small button)
   - OR check at the bottom of the modal (blue button)
   - Click either "Reassign Staff" button

4. **Select New Staff**
   - A dropdown will show all available staff
   - Green checkmark = available
   - Orange X = not available at that time
   - Red X = cannot perform this service
   - Select a staff member and click in the dropdown

5. **Confirm Reassignment**
   - Add an optional reason
   - Click "Confirm Reassignment"

## Troubleshooting

### If you don't see the button:

1. **Check the browser console** (F12) for debug messages:
   ```
   [BookingDetailsModal] Debug: {
     bookingStatus: "...",
     canReassignStaff: true/false,
     ...
   }
   ```

2. **Verify the booking status** - it must be 'pending' or 'confirmed'

3. **Make sure you're logged in** as admin

4. **Try refreshing the page** after opening the booking modal

### Database Migration Required

Before testing, make sure you've run the database migration:

1. Go to Supabase SQL Editor
2. Run the migration from: `/supabase/migrations/052_add_staff_reassignment_tracking.sql`
3. This creates the necessary tables and functions

## What Should Happen

When successful:
- The booking will be updated with the new staff member
- A success message will appear
- The modal will refresh showing the new staff assignment
- A "Reassigned 1x" badge will appear next to the staff name
- The change is logged in the staff_assignment_history table

## Visual Guide

The button appears in these styles:
- **Inline button**: Small outlined button with "Reassign" text
- **Footer button**: Blue outlined button with "Reassign Staff" text

Both buttons open the same reassignment interface.