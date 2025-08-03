# Database Cleanup Scripts

This directory contains scripts to safely manage your medical spa booking database.

## 🧹 Clear All Bookings

### JavaScript Script (Recommended)

```bash
# Run the JavaScript script
node scripts/clear-bookings.js
```

**Features:**
- ✅ Safe deletion with verification
- ✅ Preserves all customers, staff, services, rooms
- ✅ Shows before/after counts
- ✅ Error handling and rollback protection
- ✅ Requires service role key for security

**Requirements:**
- Node.js environment
- `.env.local` file with required variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

### SQL Script (Direct Database)

```sql
-- Run in Supabase SQL editor or psql
\i scripts/clear-all-bookings.sql
```

**Features:**
- ✅ Transaction-safe with BEGIN/COMMIT
- ✅ Shows deletion counts
- ✅ Verifies completion
- ✅ Can be run directly in Supabase dashboard

## 🔒 What Gets Deleted

### Deleted Data:
- ❌ All bookings (appointments)
- ❌ All payments associated with bookings  
- ❌ Staff availability blocks (breaks/blocked time)

### Preserved Data:
- ✅ Customers (contact information, preferences)
- ✅ Staff (team members, capabilities, schedules)
- ✅ Services (treatments, pricing, categories)
- ✅ Rooms (treatment rooms, equipment)
- ✅ Admin users (login accounts)
- ✅ All configuration and settings

## ⚠️ Important Notes

1. **Backup First**: Consider taking a database backup before running
2. **Irreversible**: Deleted bookings cannot be recovered
3. **Production Use**: Test on staging environment first
4. **Service Role**: JavaScript script requires admin-level database access

## 🎯 When to Use

- **Fresh Start**: Beginning operations with clean slate
- **Testing**: Clearing test data before going live
- **Maintenance**: Periodic cleanup of old bookings
- **Migration**: Preparing for data migration

## 🚀 After Cleanup

Your booking system will be ready to accept new appointments immediately:

- 📅 All booking slots will be available
- 👥 Customer information remains for returning clients  
- 🏢 Staff schedules and capabilities preserved
- 💰 Service pricing and configurations intact
- 🔐 Admin panel access unchanged

The system is designed to handle this cleanup gracefully and continue operating normally.