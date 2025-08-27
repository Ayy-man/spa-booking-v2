# Dermal Skin Clinic Booking System - Project Structure

**Last Updated**: August 27, 2025  
**Current Version**: v2.1.0 (Staff Reassignment & Modal Management)

## Root Directory Structure
```
dermal-booking-app/
├── docs/                          # Documentation
│   ├── PRD.md                     # Project Requirements Document
│   ├── payment-links.md           # Master payment links documentation 
│   ├── payment-system-implementation.md # Payment system implementation summary
│   ├── RESCHEDULE_FEATURE.md      # Reschedule functionality documentation
│   ├── FEATURES.md                # Complete feature documentation
│   ├── context/                   # Context files for AI
│   │   ├── business-logic.md      # Business rules and algorithms
│   │   ├── staff-room-matrix.md   # Staff capabilities and room assignments
│   │   ├── implementation-plan.md # Development stages and tasks
│   │   ├── project-structure.md   # This file
│   │   ├── ui-ux-documentation.md # UI/UX specifications
│   │   └── bug-tracking.md        # Bug tracking template
│   ├── rules/                     # AI workflow rules
│   │   ├── generate-rule.md       # How to generate implementation files
│   │   └── work-rule.md           # How to work on the project
│   └── design/                    # Design assets
│       └── design-system.md       # Color palette and component styles
├── src/                           # Source code
│   ├── app/                       # Next.js App Router
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   ├── admin/                 # Admin panel pages
│   │   │   ├── layout.tsx         # Admin layout with navigation
│   │   │   ├── page.tsx           # Admin dashboard
│   │   │   ├── login/             # Admin authentication
│   │   │   ├── bookings/          # Booking management
│   │   │   ├── payment-links/     # Payment links dashboard (NEW)
│   │   │   └── monitor/           # System monitoring
│   │   ├── booking/               # Booking flow pages
│   │   │   ├── page.tsx           # Service selection
│   │   │   ├── date-time/         # Date/time selection
│   │   │   ├── staff/             # Staff selection
│   │   │   ├── staff-couples/     # Couples staff selection
│   │   │   ├── customer-info/     # Customer form
│   │   │   ├── payment-selection/ # Payment method selection (NEW)
│   │   │   ├── confirmation/      # Booking confirmation
│   │   │   └── confirmation-couples/ # Couples booking confirmation
│   │   └── api/                   # API routes
│   │       ├── admin/             # Admin API endpoints
│   │       │   └── bookings/      # Admin booking management
│   │       │       └── [id]/      # Individual booking operations
│   │       │           ├── reschedule/ # Reschedule functionality
│   │       │           └── reassign-staff/ # Staff reassignment
│   │       ├── bookings/          # Booking API endpoints
│   │       ├── services/          # Services API
│   │       ├── staff/             # Staff API
│   │       ├── rooms/             # Rooms API
│   │       ├── check-bookings/    # Booking verification
│   │       ├── check-data/        # Data validation
│   │       ├── test-booking/      # Testing endpoints
│   │       └── test-supabase/     # Database testing
│   ├── components/                # React components
│   │   ├── ui/                    # Shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx         # Modal dialogs
│   │   │   ├── status-badge.tsx   # Status indicators
│   │   │   ├── tabs.tsx           # Tab navigation
│   │   │   ├── tooltip.tsx        # Hover tooltips
│   │   │   └── ...
│   │   ├── admin/                 # Admin panel components
│   │   │   ├── BookingDetailsModal.tsx # Comprehensive booking management modal
│   │   │   ├── RescheduleModal.tsx # Appointment rescheduling interface
│   │   │   ├── StaffReassignmentDropdown.tsx # Staff reassignment dropdown
│   │   │   ├── booking-card.tsx   # Booking display cards
│   │   │   ├── filter-bar.tsx     # Filtering controls
│   │   │   ├── room-timeline.tsx  # Room utilization timeline
│   │   │   ├── service-tracking.tsx # Service analytics
│   │   │   ├── staff-schedule.tsx # Staff schedule view
│   │   │   └── todays-schedule.tsx # Daily schedule dashboard
│   │   ├── booking/               # Booking-specific components
│   │   │   ├── BookingValidator.tsx # Booking validation
│   │   │   ├── CustomerForm.tsx   # Customer information form
│   │   │   ├── StaffSelector.tsx  # Staff selection
│   │   │   └── CouplesBooking.tsx # Couples booking flow
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   └── common/                # Common components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Toast.tsx
│   ├── lib/                       # Utility libraries
│   │   ├── supabase.ts            # Supabase client configuration
│   │   ├── booking-logic.ts       # Business logic functions
│   │   ├── admin-booking-logic.ts # Admin-specific booking logic
│   │   ├── reschedule-logic.ts    # Reschedule validation and processing
│   │   ├── payment-config.ts      # Payment configuration system
│   │   ├── analytics.ts           # Analytics and reporting
│   │   ├── auth.ts                # Authentication utilities
│   │   ├── staff-data.ts          # Staff data management
│   │   ├── utils.ts               # General utility functions
│   │   └── __tests__/             # Test files
│   │       └── booking-logic.test.ts # Booking logic tests
│   ├── types/                     # TypeScript type definitions
│   │   ├── booking.ts             # Booking-related types
│   │   ├── service.ts             # Service types
│   │   ├── staff.ts               # Staff types
│   │   ├── room.ts                # Room types
│   │   └── api.ts                 # API response types
│   ├── hooks/                     # Custom React hooks
│   │   ├── useBooking.ts          # Booking state management
│   │   ├── useServices.ts         # Services data fetching
│   │   ├── useStaff.ts            # Staff data fetching
│   │   └── useRooms.ts            # Room availability
│   └── styles/                    # Additional styles
│       ├── components.css         # Component-specific styles
│       └── animations.css         # Custom animations
├── public/                        # Static assets
│   ├── images/                    # Images and icons
│   ├── fonts/                     # Custom fonts
│   └── favicon.ico
├── middleware.ts                  # Next.js middleware for auth
├── .env.local                     # Environment variables
├── .env.example                   # Environment variables template
├── tailwind.config.js             # Tailwind CSS configuration
├── next.config.js                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Jest testing configuration
├── jest.setup.js                  # Jest setup file
├── package.json                   # Dependencies and scripts
├── README.md                      # Project documentation
├── supabase/                      # Supabase migrations
│   └── migrations/                # Database migration files
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_booking_functions.sql
│       ├── 004_seed_data.sql
│       ├── 005_add_missing_services.sql
│       └── 006_couples_booking_support.sql
└── .gitignore                     # Git ignore rules
```

## Key Files and Their Purposes

### Core Application Files
- **`src/app/page.tsx`**: Landing page with service showcase
- **`src/app/booking/page.tsx`**: Main booking flow entry point
- **`src/app/layout.tsx`**: Root layout with navigation and styling
- **`src/app/admin/page.tsx`**: Admin dashboard with schedule overview
- **`src/app/admin/layout.tsx`**: Admin layout with navigation and auth
- **`src/app/admin/payment-links/page.tsx`**: Payment links management dashboard (NEW)
- **`src/app/booking/payment-selection/page.tsx`**: Customer payment method selection (NEW)
- **`middleware.ts`**: Authentication and route protection middleware

### Business Logic Files
- **`src/lib/booking-logic.ts`**: Core booking validation and processing
- **`src/lib/admin-booking-logic.ts`**: Admin-specific booking operations
- **`src/lib/payment-config.ts`**: Payment configuration and service mapping (NEW)
- **`src/lib/analytics.ts`**: Business analytics and reporting
- **`src/lib/auth.ts`**: Authentication and session management
- **`src/lib/staff-data.ts`**: Staff data management and scheduling

### Component Organization
- **`src/components/ui/`**: Reusable UI components (Shadcn/ui)
- **`src/components/admin/`**: Admin panel components (schedules, timelines, analytics)
- **`src/components/booking/`**: Booking-specific components
- **`src/components/layout/`**: Layout and navigation components

### Type Definitions
- **`src/types/booking.ts`**: Booking, appointment, and customer types
- **`src/types/service.ts`**: Service categories and pricing types
- **`src/types/staff.ts`**: Staff member and availability types

### API Routes
- **`src/app/api/bookings/`**: Booking creation, retrieval, and management
- **`src/app/api/services/`**: Service catalog and pricing
- **`src/app/api/staff/`**: Staff availability and capabilities
- **`src/app/api/rooms/`**: Room availability and assignment
- **`src/app/api/check-bookings/`**: Booking verification endpoints
- **`src/app/api/check-data/`**: Data validation endpoints
- **`src/app/api/test-booking/`**: Testing and development endpoints
- **`src/app/api/test-supabase/`**: Database connectivity testing

## Database Schema (Supabase)

### Tables
```sql
-- Services table
services (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR NOT NULL,
  requires_couples_room BOOLEAN DEFAULT FALSE,
  requires_body_scrub_room BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Staff table
staff (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  can_perform_services TEXT[], -- Array of service IDs
  default_room INTEGER,
  schedule JSONB, -- Weekly schedule
  created_at TIMESTAMP DEFAULT NOW()
)

-- Rooms table
rooms (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  capacity INTEGER NOT NULL,
  capabilities TEXT[], -- Array of service categories
  created_at TIMESTAMP DEFAULT NOW()
)

-- Bookings table
bookings (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  room_id UUID REFERENCES rooms(id),
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR NOT NULL,
  customer_phone VARCHAR,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR DEFAULT 'confirmed',
  special_requests TEXT,
  booking_type VARCHAR DEFAULT 'single', -- 'single' or 'couples'
  booking_group_id UUID, -- Links couples bookings together
  created_at TIMESTAMP DEFAULT NOW()
)
```

## Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLINIC_NAME="Dermal Skin Clinic and Spa Guam"
NEXT_PUBLIC_CLINIC_PHONE="(671) 647-7546"

# External Services (Future)
RESEND_API_KEY=your_resend_key
STRIPE_SECRET_KEY=your_stripe_key
```

## Development Workflow
1. **Feature Development**: Create components in `src/components/`
2. **Business Logic**: Implement in `src/lib/`
3. **API Development**: Add routes in `src/app/api/`
4. **Type Safety**: Define types in `src/types/`
5. **Styling**: Use Tailwind classes and custom CSS in `src/styles/`

## Recent File Updates (August 27, 2025) - Staff Reassignment & Modal Management Phase

### Current System Features ✅
- Modal-based booking management through BookingDetailsModal
- Staff reassignment functionality with availability validation
- Reschedule system with 15-minute timing intervals
- Confirmation emails for admin-created appointments
- Green availability indicators removed from "Any Available Staff" column (now shows dots)
- All management functions accessed through booking details modal interface

## Previous File Updates (August 4, 2025) - Payment System Implementation Phase

### New Payment System Files Created ✅
- `/docs/payment-links.md` - Master documentation of all 46 payment links with service coverage
- `/docs/payment-system-implementation.md` - Comprehensive implementation summary and usage guide
- `/src/lib/payment-config.ts` - Centralized payment configuration system with TypeScript integration
- `/src/app/booking/payment-selection/page.tsx` - Customer payment method selection interface
- `/src/app/admin/payment-links/page.tsx` - Staff payment links management dashboard

### Payment System Files Enhanced ✅
- `/src/app/booking/customer-info/page.tsx` - Enhanced with existing customer routing to payment selection
- `/src/app/booking/confirmation/page.tsx` - Enhanced to handle full payment vs deposit display
- `/src/app/admin/page.tsx` - Added Payment Links navigation button

## Previous File Updates (July 31, 2025) - UI/UX Enhancement Phase

### UI/UX Components Created ✅
- `/src/components/booking/BookingProgressIndicator.tsx` - 5-step progress navigation system
- `/src/components/booking/BookingSummary.tsx` - Persistent booking summary with edit capabilities
- `/src/components/ui/skeleton-loader.tsx` - Comprehensive skeleton loading components
- `/src/components/ui/loading-spinner.tsx` - Various loading spinner implementations

### Enhanced Existing Files ✅
- `/src/app/globals.css` - Complete design system overhaul with WCAG AA colors
- `/tailwind.config.js` - Enhanced color palette with accessibility compliance
- `/src/app/booking/page.tsx` - Integrated progress indicator and improved service selection
- `/src/app/booking/date-time/page.tsx` - Added sidebar layout and weekend styling fix
- `/src/app/booking/staff/page.tsx` - Enhanced with prominent "Any Available Staff" option
- `/src/app/booking/customer-info/page.tsx` - Progress indicator and sidebar integration
- `/src/components/booking/CustomerForm.tsx` - Real-time validation with success/error states

### Design System Files Updated ✅
- Color palette updated from #C36678 to #A64D5F for WCAG AA compliance
- Button system standardized with consistent hierarchy
- Loading states implemented across all components
- Mobile-first responsive design applied throughout
- Touch target optimization (48px minimum) for accessibility

## File Naming Conventions
- **Components**: PascalCase (e.g., `ServiceSelector.tsx`, `BookingProgressIndicator.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useBooking.ts`)
- **Utilities**: camelCase (e.g., `booking-logic.ts`)
- **Types**: camelCase (e.g., `booking.ts`)
- **Pages**: lowercase with hyphens (e.g., `customer-info/page.tsx`)
- **UI Components**: kebab-case (e.g., `skeleton-loader.tsx`, `loading-spinner.tsx`)
- **Feature Components**: PascalCase with feature prefix (e.g., `BookingSummary.tsx`)

## Component Organization Strategy

### UI Components (`/src/components/ui/`)
- Reusable, generic components
- No business logic
- Highly customizable with props
- Design system foundation

### Feature Components (`/src/components/booking/`)
- Business logic integrated
- Booking flow specific
- State management included
- Context-aware functionality

### Layout Components (`/src/components/layout/`)
- Page structure components
- Navigation and common UI elements
- Responsive layout management
- Cross-page consistency 