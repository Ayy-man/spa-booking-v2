# Database Schema Documentation

## Current Supabase Database Schema

This document contains the current database schema for the medical spa booking system.

### Core Tables

#### bookings
- **id**: uuid (PK, auto-generated)
- **customer_id**: uuid (FK to customers.id)
- **service_id**: text (FK to services.id)
- **staff_id**: text (FK to staff.id)
- **room_id**: integer (FK to rooms.id)
- **appointment_date**: date
- **start_time**: time without time zone
- **end_time**: time without time zone
- **duration**: integer
- **total_price**: numeric
- **discount**: numeric (default 0)
- **final_price**: numeric
- **status**: booking_status enum (default 'pending')
- **payment_status**: payment_status enum (default 'pending')
- **notes**: text
- **internal_notes**: text
- **created_by**: text
- **checked_in_at**: timestamp with time zone
- **completed_at**: timestamp with time zone
- **cancelled_at**: timestamp with time zone
- **cancellation_reason**: text
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())
- **booking_group_id**: uuid
- **booking_type**: varchar (default 'single', check: single|couple|group)
- **waiver_signed**: boolean (default false)
- **waiver_data**: jsonb
- **waiver_signed_at**: timestamp with time zone
- **payment_option**: text (default 'deposit')

#### customers
- **id**: uuid (PK, auto-generated)
- **first_name**: text (required)
- **last_name**: text (required)
- **email**: text (unique)
- **phone**: text (required)
- **date_of_birth**: date
- **address**: text
- **city**: text
- **postal_code**: text
- **emergency_contact_name**: text
- **emergency_contact_phone**: text
- **emergency_contact_relationship**: text
- **medical_conditions**: text
- **allergies**: text
- **skin_type**: text
- **preferences**: jsonb (default '{}')
- **notes**: text
- **total_visits**: integer (default 0)
- **total_spent**: numeric (default 0)
- **last_visit_date**: timestamp with time zone
- **marketing_consent**: boolean (default false)
- **is_active**: boolean (default true)
- **auth_user_id**: uuid
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### staff
- **id**: text (PK)
- **name**: text (required)
- **email**: text (unique)
- **phone**: text
- **specialties**: text
- **capabilities**: service_category[] (array, default '{}')
- **work_days**: integer[] (array, default '{}', 0=Sunday, 1=Monday, etc.)
- **default_room_id**: integer (FK to rooms.id)
- **role**: staff_role enum (default 'therapist')
- **initials**: text
- **hourly_rate**: numeric
- **is_active**: boolean (default true)
- **auth_user_id**: uuid
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### services
- **id**: text (PK)
- **name**: text (required)
- **description**: text
- **category**: service_category enum (required)
- **duration**: integer (required, > 0)
- **price**: numeric (required, >= 0)
- **requires_room_3**: boolean (default false)
- **is_couples_service**: boolean (default false)
- **is_active**: boolean (default true)
- **service_capabilities**: text[] (array, default '{}')
- **ghl_category**: varchar (required, check constraint for valid values)
- **popularity_score**: integer (default 0)
- **is_recommended**: boolean (default false)
- **is_popular**: boolean (default false)
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### rooms
- **id**: integer (PK)
- **name**: text (required)
- **capacity**: integer (required, > 0)
- **capabilities**: service_category[] (array, default '{}')
- **equipment**: text[] (array, default '{}')
- **features**: text[] (array, default '{}')
- **is_active**: boolean (default true)
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### staff_schedules
- **id**: uuid (PK, auto-generated)
- **staff_id**: text (FK to staff.id)
- **date**: date (required)
- **start_time**: time without time zone (required)
- **end_time**: time without time zone (required)
- **is_available**: boolean (default true)
- **break_start**: time without time zone
- **break_end**: time without time zone
- **notes**: text
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

### Supporting Tables

#### payments
- **id**: uuid (PK, auto-generated)
- **booking_id**: uuid (FK to bookings.id)
- **amount**: numeric (required, > 0)
- **payment_method**: text (required)
- **transaction_id**: text
- **status**: payment_status enum (default 'pending')
- **processed_at**: timestamp with time zone
- **notes**: text
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### waivers
- **id**: uuid (PK, auto-generated)
- **customer_id**: uuid (FK to customers.id)
- **booking_id**: uuid (FK to bookings.id)
- **service_category**: text (required)
- **service_name**: text (required)
- **signature**: text (required)
- **agreed_to_terms**: boolean (required, default false)
- **medical_conditions**: text
- **allergies**: text
- **skin_conditions**: text
- **medications**: text
- **pregnancy_status**: boolean
- **previous_waxing**: boolean
- **recent_sun_exposure**: boolean
- **emergency_contact_name**: text (required)
- **emergency_contact_phone**: text (required)
- **waiver_content**: jsonb
- **ip_address**: inet
- **user_agent**: text
- **signed_at**: timestamp with time zone (default now())
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### admin_users
- **id**: uuid (PK, auto-generated)
- **user_id**: uuid (FK to auth.users.id, unique)
- **email**: text (required)
- **role**: text (required, check: admin|staff)
- **is_active**: boolean (default true)
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())
- **created_by**: uuid (FK to auth.users.id)
- **notes**: text

#### service_packages
- **id**: uuid (PK, auto-generated)
- **name**: text (required)
- **description**: text
- **service_ids**: text[] (array, required)
- **total_duration**: integer (required)
- **individual_price**: numeric (required)
- **package_price**: numeric (required)
- **savings**: numeric (default: individual_price - package_price)
- **is_couples**: boolean (default false)
- **is_active**: boolean (default true)
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

#### walk_ins
- **id**: uuid (PK, auto-generated)
- **customer_id**: uuid (FK to customers.id)
- **booking_id**: uuid (FK to bookings.id)
- **customer_name**: text (required)
- **customer_email**: text
- **customer_phone**: text (required)
- **service_name**: text (required)
- **service_category**: text (required)
- **scheduling_type**: text (default 'immediate')
- **scheduled_date**: date
- **scheduled_time**: time without time zone
- **notes**: text
- **status**: text (default 'pending')
- **checked_in_at**: timestamp with time zone
- **completed_at**: timestamp with time zone
- **ghl_webhook_sent**: boolean (default false)
- **ghl_webhook_sent_at**: timestamp with time zone
- **created_by**: uuid
- **created_at**: timestamp with time zone (default now())
- **updated_at**: timestamp with time zone (default now())

### Custom Types/Enums

- **booking_status**: Enum for booking statuses
- **payment_status**: Enum for payment statuses  
- **service_category**: Enum for service categories
- **staff_role**: Enum for staff roles

### Key Business Rules

1. **Staff Work Days**: Array of integers where 0=Sunday, 1=Monday, etc.
2. **Room 3 Requirement**: Body scrub services require Room 3 (`requires_room_3` flag)
3. **Couples Services**: Services that require rooms with capacity >= 2
4. **Staff Capabilities**: Must match service categories for booking validation
5. **Time Validation**: Business hours 9 AM - 7 PM with validation functions

### Validation Functions

- `check_staff_availability()`: Validates staff work days and schedules
- `check_booking_conflicts()`: Prevents double-booking of staff/rooms
- `smart_booking_validation()`: Main validation trigger function