# Instructions to Add Phuong Bosque to Your System

## Why Phuong Isn't Showing Up
1. She's been added to the local code (staff-data.ts) but NOT to your Supabase database
2. Both the booking app and admin panel pull staff from Supabase, not local files
3. The migration file was created but hasn't been run in your database yet

## How to Fix This - Run These Steps:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query" button

### Step 2: Copy and Run This Script
Copy the ENTIRE contents of the file `supabase/add-phuong-staff.sql` and paste it into the SQL editor, then click "Run".

The script will:
- Add Phuong to the staff table with massage capabilities
- Set her to work all 7 days a week (9 AM - 7 PM)
- Create her schedule for the next 90 days
- Verify she was added successfully

### Step 3: Verify It Worked
After running the script, you should see:
- A success message saying "Successfully added Phuong Bosque as staff member for massage services"
- A result showing Phuong's details

### Step 4: Test in Your App
1. **Booking Flow**: Go to /booking and select any massage service
   - When you get to staff selection, Phuong should appear as an option
   
2. **Admin Panel**: Go to /admin
   - Check the staff schedule dropdown - Phuong should be listed
   - She should appear in walk-in assignment options for massage services

## What Was Fixed
- Changed `'massage'` to `'massages'` (plural) to match the system's capability naming
- Created a ready-to-run SQL script that handles all the database setup
- Verified that both frontend and admin load staff from Supabase (not local files)

## Files Involved
- `/src/lib/staff-data.ts` - Local configuration (already has Phuong)
- `/supabase/migrations/051_add_staff_phuong_bosque.sql` - Migration file (fixed)
- `/supabase/add-phuong-staff.sql` - Ready-to-run script for you to execute

Once you run the SQL script in Supabase, Phuong will appear everywhere in your system!