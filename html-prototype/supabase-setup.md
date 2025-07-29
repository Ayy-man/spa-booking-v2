# Dermal Skin Clinic - Supabase Database Setup

## Project Configuration

**Supabase URL:** `https://doradsvnphdwotkeiylv.supabase.co`
**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmFkc3ZucGhkd290a2VpeWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDA3MTYsImV4cCI6MjA2OTMxNjcxNn0.4DbNHxjhOshrrQGYxjH8QI4V2sqx2VLr7nH0stSEXZk`
**Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmFkc3ZucGhkd290a2VpeWx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0MDcxNiwiZXhwIjoyMDY5MzE2NzE2fQ.6u3eXNyXPDrZYE688Ha1Z7P1ABm4G-OQL8_YLUUVi-w`

## Database Schema Overview

The database schema includes the following key components:

### Core Tables
1. **services** - All spa services with pricing, duration, and requirements
2. **staff** - Staff members with capabilities and schedules
3. **rooms** - Room configurations and capabilities
4. **customers** - Customer information with CRM fields
5. **bookings** - Appointments with conflict prevention
6. **staff_schedules** - Staff availability management
7. **service_packages** - Bundled service offerings
8. **payments** - Payment transaction tracking

### Business Logic Implementation
- **50+ Services** across 6 categories (facials, massages, treatments, waxing, packages, special)
- **5 Staff Members** with specific capabilities and schedules
- **3 Rooms** with different service capabilities
- **Room Restrictions** - treatments require Room 3
- **Staff Scheduling** - Selma/Tanisha off Tue/Thu, Leonel Sunday only
- **Conflict Prevention** - automated booking validation
- **Security Policies** - Row Level Security for data protection

## Setup Instructions

### 1. Execute Main Schema
Run the contents of `supabase-schema.sql` in your Supabase SQL editor:
- Creates all tables with proper relationships
- Sets up indexes for performance
- Implements Row Level Security policies
- Populates initial data (services, staff, rooms)

### 2. Execute Additional Functions
Run the contents of `supabase-functions.sql` for advanced functionality:
- Availability checking functions
- Booking management operations
- Customer management utilities
- Reporting and analytics functions
- Business validation rules

### 3. Configure Authentication (Optional)
If you want staff authentication:
```sql
-- Create auth users for staff members (example)
-- This should be done through Supabase Auth UI or API
```

## Key Features Implemented

### Booking Validation
- **Staff Availability** - Checks work days and existing bookings
- **Room Availability** - Prevents double-booking rooms
- **Service Requirements** - Enforces room 3 requirement for treatments
- **Business Hours** - Validates appointments within operating hours
- **Staff Capabilities** - Ensures staff can perform the requested service

### Security Implementation
- **Row Level Security** on all tables
- **Role-based Access** for different user types
- **Customer Data Protection** - customers only see their own data
- **Staff Data Isolation** - staff see only relevant bookings

### Performance Optimization
- **Strategic Indexes** on frequently queried columns
- **Composite Indexes** for complex queries
- **GIN Indexes** for array operations (capabilities, work_days)
- **Optimized Views** for common data access patterns

## Database Functions Available

### Booking Operations
- `create_booking()` - Create new booking with validation
- `reschedule_booking()` - Move booking to new date/time
- `cancel_booking()` - Cancel booking with reason tracking
- `get_service_availability()` - Find available slots for service

### Customer Management
- `upsert_customer()` - Create or update customer information
- `get_customer_history()` - Retrieve booking history

### Reporting & Analytics
- `get_daily_revenue()` - Daily financial summary
- `get_staff_performance()` - Staff productivity metrics
- `get_popular_services()` - Service popularity analysis
- `get_dashboard_metrics()` - Business overview dashboard

### Utility Functions
- `check_staff_availability()` - Validate staff availability
- `check_room_availability()` - Validate room availability
- `validate_business_hours()` - Check appointment timing
- `get_reminder_appointments()` - Upcoming appointment notifications

## Initial Data Populated

### Services (50+ items)
- **Facials**: Basic ($65), Deep Cleansing ($79), Vitamin C ($120), etc.
- **Massages**: Balinese ($80), Hot Stone ($90), 90-min sessions ($120)
- **Treatments**: All require Room 3, prices $65-$150
- **Waxing**: From lip ($10) to full leg ($80)
- **Packages**: Multi-service combinations with savings
- **Special**: VIP cards and specialized treatments

### Staff Members
- **Selma Villaver** - Facials specialist (off Tue/Thu)
- **Robyn Camacho** - All services, Room 3 specialist
- **Tanisha Harris** - Facials & Waxing (off Tue/Thu)
- **Leonel Sidon** - Massages & Treatments (Sunday only)
- **Any Available** - Flexible booking option

### Rooms
- **Room 1** - Single capacity, facials/waxing
- **Room 2** - Double capacity, facials/waxing/massages/packages
- **Room 3** - Double capacity, all services including treatments

## Usage Examples

### Create a Booking
```sql
SELECT create_booking(
    customer_id := 'uuid-here',
    service_id := 'deep_cleansing_facial',
    staff_id := 'selma',
    room_id := 1,
    appointment_date := '2025-01-15',
    start_time := '10:00',
    notes := 'Customer prefers gentle products'
);
```

### Check Availability
```sql
SELECT * FROM get_service_availability(
    'hot_stone_massage',
    '2025-01-15'::DATE
);
```

### Get Daily Report
```sql
SELECT * FROM get_daily_revenue('2025-01-15'::DATE);
```

## Maintenance

### Regular Tasks
1. **Cleanup Old Data** - Use `cleanup_old_data()` function
2. **Monitor Performance** - Check slow queries in Supabase dashboard
3. **Backup Data** - Regular Supabase automated backups
4. **Update Prices** - Modify services table as needed

### Monitoring
- Use Supabase built-in monitoring for performance
- Set up alerts for booking conflicts
- Monitor RLS policy performance
- Track function execution times

## Troubleshooting

### Common Issues
1. **Booking Conflicts** - Check availability functions return correct results
2. **Permission Errors** - Verify RLS policies are properly configured
3. **Performance Issues** - Ensure indexes are being used effectively
4. **Data Integrity** - Foreign key constraints prevent orphaned records

### Support Queries
- Check booking conflicts: Query `booking_details` view
- Verify staff schedules: Query `staff_availability` view
- Monitor daily activity: Use `daily_schedule` view

This setup provides a robust, scalable foundation for the Dermal Skin Clinic booking system with proper security, performance optimization, and business logic enforcement.