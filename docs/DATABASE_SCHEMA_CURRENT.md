# Current Database Schema Documentation - Dermal Spa Booking System

**Last Updated**: January 2025  
**Database**: Supabase (PostgreSQL)  
**Schema Version**: Current Production Schema  

## Executive Summary

This document reflects the **actual current production database schema** for the Dermal Skin Clinic and Spa Guam booking system. This schema supports comprehensive spa operations including customer management, service booking, staff scheduling, room management, payments, waivers, and walk-in services.

## Database Architecture Overview

The system uses a normalized PostgreSQL database with comprehensive relationships, UUID primary keys, and robust data integrity constraints. All tables include proper foreign key relationships and include both user-facing and administrative functionality.

## Complete Table Definitions

### 0. Backup Table (Development Artifact)
**Purpose**: Backup of services couples configuration (likely from migration)

```sql
CREATE TABLE public._backup_services_is_couples (
  id text,
  name text,
  is_couples_service boolean,
  category USER-DEFINED
);
```

**Note**: This appears to be a backup table from a database migration and should be considered for removal in production cleanup.

### 1. Admin Users Table
**Purpose**: Role-based access control for admin panel authentication

```sql
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'staff'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by uuid,
  notes text,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
```

**Key Features**:
- Integrates with Supabase Auth system
- Two role levels: admin and staff
- Tracks creation and updates with audit trail
- Self-referencing for admin user management

### 2. Booking Errors Table
**Purpose**: Error tracking and resolution for failed bookings

```sql
CREATE TABLE public.booking_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  booking_data jsonb NOT NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_phone_formatted text,  -- Display format: (671) XXX-XXXX
  service_name text,
  service_id text,
  appointment_date date,
  appointment_time time without time zone,
  staff_name text,
  staff_id text,
  room_id integer,
  secondary_service_name text,
  secondary_service_id text,
  secondary_staff_name text,
  secondary_staff_id text,
  user_agent text,
  ip_address inet,
  session_id text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  last_retry_at timestamp with time zone,
  is_couples_booking boolean DEFAULT false,
  resolved boolean DEFAULT false,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_errors_pkey PRIMARY KEY (id)
);
```

**Key Features**:
- Comprehensive error tracking for failed booking attempts
- Stores complete booking data for retry attempts
- Resolution tracking with timestamps and notes
- Couples booking error handling
- Retry mechanism with count tracking
- Session and IP tracking for debugging
- Staff assignment error tracking

### 3. Customers Table
**Purpose**: Comprehensive customer profiles and contact management

```sql
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text,  -- OPTIONAL: Supports single-name customers
  email text UNIQUE,
  phone text NOT NULL,  -- Normalized format: 671XXXXXXX
  phone_formatted text,  -- Display format: (671) XXX-XXXX
  date_of_birth date,
  address text,
  city text,
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_phone_formatted text,  -- Display format: (671) XXX-XXXX
  medical_conditions text,
  allergies text,
  skin_type text,
  preferences jsonb DEFAULT '{}'::jsonb,
  notes text,
  total_visits integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_visit_date timestamp with time zone,
  marketing_consent boolean DEFAULT false,
  is_active boolean DEFAULT true,
  auth_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  emergency_contact_relationship text,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
```

**Key Features**:
- Comprehensive customer profile including medical information
- **Optional last_name field** - Supports single-name customers (v1.1.1)
- Marketing consent tracking for GDPR compliance
- Visit and spending analytics
- Emergency contact information for safety
- Flexible preferences stored as JSONB
- Integration with authentication system

### 4. Services Table
**Purpose**: Complete spa service catalog with categorization

```sql
CREATE TABLE public.services (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  category service_category NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  price numeric NOT NULL CHECK (price >= 0::numeric),
  requires_room_3 boolean DEFAULT false,
  is_couples_service boolean DEFAULT false,
  requires_couples_room boolean DEFAULT false,
  is_active boolean DEFAULT true,
  service_capabilities ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ghl_category character varying NOT NULL CHECK (ghl_category::text = ANY (ARRAY['BODY MASSAGES'::character varying, 'BODY TREATMENTS & BOOSTERS'::character varying, 'FACE TREATMENTS'::character varying, 'FACE & BODY PACKAGES'::character varying, 'Waxing Services'::character varying]::text[])),
  popularity_score integer DEFAULT 0,
  is_recommended boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
```

**Key Features**:
- Text-based IDs for human-readable service references
- Duration and pricing management
- Room requirement specifications (Room 3 for body scrubs)
- Couples service designation with room requirements
- GoHighLevel integration categories
- Marketing flags (popular, recommended)
- Service capabilities array for advanced matching

### 5. Rooms Table
**Purpose**: Treatment room management with equipment and capacity tracking

```sql
CREATE TABLE public.rooms (
  id integer NOT NULL,
  name text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  capabilities ARRAY NOT NULL DEFAULT '{}'::service_category[],
  equipment ARRAY DEFAULT '{}'::text[],
  features ARRAY DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id)
);
```

**Key Features**:
- Integer IDs for room identification (1, 2, 3)
- Capacity management for couples/group services
- Capabilities array for service category matching
- Equipment tracking for specialized services
- Features array for room amenities
- Active/inactive status management

### 6. Staff Table
**Purpose**: Staff member profiles, capabilities, and scheduling

```sql
CREATE TABLE public.staff (
  id text NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  specialties text,
  capabilities ARRAY NOT NULL DEFAULT '{}'::service_category[],
  work_days ARRAY NOT NULL DEFAULT '{}'::integer[],
  service_exclusions ARRAY DEFAULT '{}'::text[],
  default_room_id integer,
  role USER-DEFINED DEFAULT 'therapist'::staff_role,
  initials text,
  hourly_rate numeric,
  is_active boolean DEFAULT true,
  auth_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_default_room_id_fkey FOREIGN KEY (default_room_id) REFERENCES public.rooms(id)
);
```

**Key Features**:
- Text-based IDs for staff identification
- Capabilities array matching service categories
- Work days as integer array (0-6 for Sunday-Saturday)
- Service exclusions array for specific services staff cannot perform
- Default room assignment for efficiency
- Role-based system for different staff types
- Hourly rate tracking for payroll
- Integration with authentication system

### 7. Staff Schedules Table
**Purpose**: Daily staff schedule and availability management

```sql
CREATE TABLE public.staff_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id text NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  break_start time without time zone,
  break_end time without time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
```

**Key Features**:
- Daily schedule override capability
- Break time management
- Availability toggling
- Notes for special scheduling needs
- Date-specific scheduling

### 8. Bookings Table (Core Entity)
**Purpose**: Central booking management with comprehensive tracking

```sql
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL,
  service_id text NOT NULL,
  staff_id text NOT NULL,
  room_id integer NOT NULL,
  appointment_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  duration integer NOT NULL,
  total_price numeric NOT NULL,
  discount numeric DEFAULT 0,
  final_price numeric NOT NULL CHECK (final_price >= 0::numeric),
  status USER-DEFINED DEFAULT 'pending'::booking_status,
  payment_status USER-DEFINED DEFAULT 'pending'::payment_status,
  notes text,
  internal_notes text,
  created_by text,
  checked_in_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  booking_group_id uuid,
  booking_type character varying DEFAULT 'single'::character varying CHECK (booking_type::text = ANY (ARRAY['single'::character varying, 'couple'::character varying, 'group'::character varying]::text[])),
  waiver_signed boolean DEFAULT false,
  waiver_data jsonb,
  waiver_signed_at timestamp with time zone,
  payment_option text NOT NULL DEFAULT 'deposit'::text CHECK (payment_option = ANY (ARRAY['deposit'::text, 'pay_on_location'::text])),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT bookings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
```

**Key Features**:
- Comprehensive booking lifecycle tracking
- Pricing with discount and final price calculation
- Status management (booking and payment status)
- Group booking support with booking_group_id
- Waiver integration with signature tracking
- Timestamped status changes (check-in, completion, cancellation)
- Internal notes separate from customer-visible notes
- Flexible payment options

### 9. Payments Table
**Purpose**: Payment transaction tracking and management

```sql
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_method text NOT NULL,
  transaction_id text,
  status USER-DEFINED DEFAULT 'pending'::payment_status,
  processed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
```

**Key Features**:
- Links payments to specific bookings
- Multiple payment methods support
- Transaction ID tracking for external payment processors
- Payment status lifecycle management
- Processing timestamp for reconciliation

### 10. Service Packages Table
**Purpose**: Service bundling and package deal management

```sql
CREATE TABLE public.service_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  service_ids ARRAY NOT NULL,
  total_duration integer NOT NULL,
  individual_price numeric NOT NULL,
  package_price numeric NOT NULL,
  savings numeric DEFAULT (individual_price - package_price),
  is_couples boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_packages_pkey PRIMARY KEY (id)
);
```

**Key Features**:
- Multiple service bundling
- Automatic savings calculation
- Couples package designation
- Total duration calculation for scheduling
- Package pricing vs individual pricing

### 11. Waivers Table
**Purpose**: Digital waiver management and liability protection

```sql
CREATE TABLE public.waivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  booking_id uuid,
  service_category text NOT NULL,
  service_name text NOT NULL,
  signature text NOT NULL,
  agreed_to_terms boolean NOT NULL DEFAULT false,
  medical_conditions text,
  allergies text,
  skin_conditions text,
  medications text,
  pregnancy_status boolean,
  previous_waxing boolean,
  recent_sun_exposure boolean,
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  waiver_content jsonb,
  ip_address inet,
  user_agent text,
  signed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT waivers_pkey PRIMARY KEY (id),
  CONSTRAINT waivers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT waivers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
```

**Key Features**:
- Digital signature capture
- Comprehensive medical and health questionnaire
- Service-specific waiver content
- IP address and user agent tracking for legal validity
- Emergency contact information
- Pregnancy and medical condition tracking
- Previous treatment history

### 12. Walk-ins Table
**Purpose**: Walk-in customer management and immediate booking

```sql
CREATE TABLE public.walk_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  booking_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,  -- Normalized format: 671XXXXXXX
  customer_phone_formatted text,  -- Display format: (671) XXX-XXXX
  service_name text NOT NULL,
  service_category text NOT NULL,
  scheduling_type text NOT NULL DEFAULT 'immediate'::text,
  scheduled_date date,
  scheduled_time time without time zone,
  notes text,
  status text DEFAULT 'pending'::text,
  checked_in_at timestamp with time zone,
  completed_at timestamp with time zone,
  ghl_webhook_sent boolean DEFAULT false,
  ghl_webhook_sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT walk_ins_pkey PRIMARY KEY (id),
  CONSTRAINT walk_ins_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT walk_ins_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
```

**Key Features**:
- Immediate and scheduled walk-in support
- Customer information capture
- Service selection and categorization
- Status tracking from arrival to completion
- GoHighLevel webhook integration
- Conversion to regular booking capability
- Staff member tracking for creation

## Custom Data Types (Enums)

### Booking Status
```sql
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed', 
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);
```

### Payment Status
```sql
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'partial',
  'refunded',
  'failed',
  'not_applicable'
);
```

### Service Category
```sql
CREATE TYPE service_category AS ENUM (
  'facial',
  'massage',
  'body_treatment',
  'body_scrub',
  'waxing',
  'package',
  'membership'
);
```

### Staff Role
```sql
CREATE TYPE staff_role AS ENUM (
  'therapist',
  'specialist',
  'manager',
  'receptionist'
);
```

## Business Logic and Constraints

### Room Assignment Rules
1. **Body Scrub Services**: Must use Room 3 (requires special equipment)
2. **Couples Services**: Prefer Room 3, fallback to Room 2
3. **Single Services**: Any available room based on staff preference

### Staff Scheduling Rules
1. **Work Days**: Array of integers (0=Sunday, 6=Saturday)
2. **Capabilities**: Must match service category requirements
3. **Default Rooms**: Staff preference for room assignment

### Booking Validation
1. **Time Conflicts**: No overlapping bookings for same staff/room
2. **Business Hours**: Operating hours validation
3. **Advance Booking**: 30-day maximum advance booking
4. **Buffer Time**: 15-minute buffer between appointments

## Key Relationships

### Primary Relationships
- `bookings.customer_id` → `customers.id`
- `bookings.service_id` → `services.id`
- `bookings.staff_id` → `staff.id`
- `bookings.room_id` → `rooms.id`
- `payments.booking_id` → `bookings.id`
- `waivers.booking_id` → `bookings.id`
- `staff_schedules.staff_id` → `staff.id`

### Admin System Integration
- `admin_users.user_id` → `auth.users.id` (Supabase Auth)
- `customers.auth_user_id` → `auth.users.id` (Optional customer accounts)
- `staff.auth_user_id` → `auth.users.id` (Staff login capability)

## Data Integrity Features

### Constraints
- Check constraints ensure positive values for prices, durations, and capacities
- Foreign key constraints maintain referential integrity
- Unique constraints prevent duplicate emails and conflicting bookings
- Enum constraints ensure valid status values

### Indexes (Recommended)
```sql
-- Booking performance indexes
CREATE INDEX idx_bookings_date_staff ON bookings(appointment_date, staff_id);
CREATE INDEX idx_bookings_date_room ON bookings(appointment_date, room_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Customer lookup indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Staff schedule indexes
CREATE INDEX idx_staff_schedules_date_staff ON staff_schedules(date, staff_id);
```

## Security Considerations

### Row Level Security (RLS)
- Customer data protection: Customers can only access their own records
- Admin access control: Role-based access through admin_users table
- Public data: Services and staff information available for booking flow

### Data Privacy
- Customer medical information stored securely
- Waiver data includes digital signatures and legal compliance
- IP address tracking for waiver validity
- Marketing consent tracking for GDPR compliance

## Integration Points

### GoHighLevel CRM
- Service categorization mapping via `ghl_category`
- Walk-in webhook integration tracking
- Customer data synchronization

### Supabase Auth
- Admin user authentication
- Optional customer account integration
- Staff member login capability

### Payment Processing
- Transaction ID tracking for external processors
- Payment method flexibility
- Status tracking for reconciliation

## Maintenance and Monitoring

### Automated Fields
- `created_at` and `updated_at` timestamps on all tables
- UUID generation for primary keys
- Default values for status fields

### Audit Trail
- Creation tracking with `created_by` fields
- Status change timestamps (checked_in_at, completed_at, etc.)
- Internal notes for staff communications

## Database Functions

### process_couples_booking_single_slot
**Purpose**: Creates a single booking record for couples services to prevent room double-booking

```sql
CREATE OR REPLACE FUNCTION process_couples_booking_single_slot(
  p_customer1_id uuid,
  p_customer2_id uuid,
  p_primary_service_id text,
  p_secondary_service_id text,
  p_staff1_id text,
  p_staff2_id text,
  p_room_id integer,
  p_appointment_date date,
  p_start_time time,
  p_end_time time,
  p_booking_group_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb AS $$
```

**Key Features**:
- Creates ONE booking record instead of two to prevent constraint violations
- Stores both services in `internal_notes` as JSON
- Maintains couples booking tracking via `booking_type` and `booking_group_id`
- Prevents "Room already booked" errors for couples bookings

**Migration**: Added in `038_couples_single_slot_fix.sql`

## Production Readiness

This schema represents the current production database structure and includes:
- ✅ Complete referential integrity
- ✅ Comprehensive business logic constraints
- ✅ Security and privacy considerations
- ✅ Performance optimization support
- ✅ Integration with external systems
- ✅ Audit and compliance features
- ✅ Couples booking single-slot implementation (v1.1.0)

**Last Schema Verification**: August 19, 2025
**Production Status**: Active and Deployed
**Latest Migration**: 042_add_phone_formatted_column.sql (Enhanced phone formatting for Guam)

## Recent Migrations

- **039_make_last_name_optional.sql**: Makes the last_name field optional throughout the system
- **040_add_booking_status_triggers.sql**: Automatic timestamp management for cancelled_at, completed_at, checked_in_at
- **041_add_cancel_booking_function.sql**: RPC functions for proper booking cancellation with all fields
- **042_add_phone_formatted_column.sql**: Phone formatting for Guam (671) with auto-format triggers