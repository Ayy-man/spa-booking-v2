# Supabase Database Setup Guide

This guide will help you set up the complete Supabase database infrastructure for the Dermal Booking System.

## Prerequisites

1. A Supabase account ([sign up here](https://supabase.com))
2. Node.js 18+ installed
3. This project cloned and dependencies installed

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `dermal-booking-system`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for the project to be fully set up (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGc...`)
   - **service_role key** (starts with `eyJhbGc...` - different from anon key)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 4: Run Database Migrations

1. In your Supabase project dashboard, go to **SQL Editor**

2. Run each migration file in order:

### Migration 1: Initial Schema
- Copy the contents of `supabase/migrations/001_initial_schema.sql`
- Paste into SQL Editor and click "Run"
- This creates all the core tables (services, staff, rooms, bookings, staff_availability)

### Migration 2: Row Level Security
- Copy the contents of `supabase/migrations/002_rls_policies.sql`
- Paste into SQL Editor and click "Run"
- This sets up RLS policies and validation triggers

### Migration 3: Booking Functions
- Copy the contents of `supabase/migrations/003_booking_functions.sql`
- Paste into SQL Editor and click "Run"
- This creates all the business logic functions

### Migration 4: Seed Data
- Copy the contents of `supabase/migrations/004_seed_data.sql`
- Paste into SQL Editor and click "Run"
- This populates the database with initial rooms, staff, and services data

## Step 5: Verify Database Setup

1. Go to **Database** → **Tables** in your Supabase dashboard
2. You should see these tables:
   - `services` (with ~45 services)
   - `staff` (with 4 staff members)
   - `rooms` (with 3 rooms)
   - `bookings` (empty initially)
   - `staff_availability` (empty initially)

3. Go to **Database** → **Functions** and verify these functions exist:
   - `assign_optimal_room`
   - `check_staff_capability`
   - `get_available_time_slots`
   - `get_staff_schedule`
   - `process_booking`

## Step 6: Test the Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` and verify the app loads without errors

4. Check the browser console - there should be no Supabase connection errors

## Database Structure Overview

### Core Tables

- **services**: All spa services with pricing, duration, and requirements
- **staff**: Staff members with capabilities and schedules
- **rooms**: Treatment rooms with capacity and equipment capabilities
- **bookings**: Customer appointments linking services, staff, and rooms
- **staff_availability**: For blocking out staff unavailable times

### Key Business Rules Implemented

1. **Body Scrub Services**: Must use Room 3 (only room with equipment)
2. **Couples Services**: Prefer Room 3, fallback to Room 2
3. **Staff Capabilities**: Each staff member can only perform certain service types
4. **Time Validation**: Bookings within business hours (9 AM - 7 PM)
5. **Conflict Prevention**: No double-booking of staff or rooms
6. **Advance Booking**: Maximum 30 days in advance

### Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Public Access**: Services, staff, and rooms are publicly readable
- **Booking Protection**: Customers can create bookings, staff can manage them
- **Data Validation**: Triggers prevent invalid bookings and conflicts

## Troubleshooting

### Connection Issues
- Verify environment variables are correct
- Check that your IP is not blocked by Supabase
- Ensure you're using the correct project URL and keys

### Migration Errors
- Run migrations in the exact order specified
- If a migration fails, check the error message and fix before proceeding
- You may need to drop and recreate tables if you encounter conflicts

### Function Issues
- Make sure all dependencies (tables) are created before functions
- Check that the functions appear in the Supabase dashboard under Database → Functions
- Test functions using the SQL editor before using them in the app

## Next Steps

After successful setup:

1. **Test Booking Flow**: Try creating bookings through the app
2. **Customize Services**: Add/modify services in the `services` table
3. **Adjust Staff Schedules**: Update staff availability in the `staff` table
4. **Configure Business Hours**: Modify the business logic constants as needed

## Support

If you encounter issues:
1. Check the Supabase project logs
2. Verify all environment variables are set correctly
3. Ensure all migrations ran successfully
4. Test database functions in the SQL editor

The database is now fully configured with all the complex spa booking logic and ready for production use!