# Dermal Skin Clinic Booking System - Project Structure

## Root Directory Structure
```
dermal-booking-app/
├── docs/                          # Documentation
│   ├── PRD.md                     # Project Requirements Document
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
│   │   │   └── monitor/           # System monitoring
│   │   ├── booking/               # Booking flow pages
│   │   │   ├── page.tsx           # Service selection
│   │   │   ├── date-time/         # Date/time selection
│   │   │   ├── staff/             # Staff selection
│   │   │   ├── staff-couples/     # Couples staff selection
│   │   │   ├── customer-info/     # Customer form
│   │   │   ├── confirmation/      # Booking confirmation
│   │   │   └── confirmation-couples/ # Couples booking confirmation
│   │   └── api/                   # API routes
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
│   │   │   ├── booking-card.tsx   # Booking display cards
│   │   │   ├── filter-bar.tsx     # Filtering controls
│   │   │   ├── quick-actions.tsx  # Quick action buttons
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
- **`middleware.ts`**: Authentication and route protection middleware

### Business Logic Files
- **`src/lib/booking-logic.ts`**: Core booking validation and processing
- **`src/lib/admin-booking-logic.ts`**: Admin-specific booking operations
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

## Recent File Updates (July 31, 2025) - UI/UX Enhancement Phase

### New Components Created ✅
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

## Production System Architecture - August 2, 2025

### Current Production Structure
The project structure is optimized for a single-tenant medical spa booking system, providing robust functionality specifically tailored for Dermal Skin Clinic and Spa Guam's operations.

### Production System Components
1. **Complete Customer Interface**
   - Service selection with 44 active services across 7 categories
   - Real-time availability checking with staff and room constraints
   - Couples booking functionality for synchronized appointments
   - Complete booking flow with confirmation and customer data collection

2. **Comprehensive Admin Panel**
   - Secure authentication system with role-based access (admin, staff, manager roles)
   - Today's schedule dashboard with real-time booking updates
   - Interactive room timeline with drag-and-drop rescheduling capabilities
   - Staff schedule management and availability tracking
   - Quick actions for booking status updates and customer management

3. **Robust Database Infrastructure**
   - Production Supabase PostgreSQL with comprehensive business logic functions
   - Row-level security policies ensuring data protection and access control
   - 44 services, 4 staff members, 3 rooms with complete capability matrices
   - Automated booking functions preventing conflicts and optimizing room assignments

4. **External Integration Platform**
   - GoHighLevel webhook integration for customer relationship management
   - 24-hour reminder system with SMS/email capabilities
   - Show/no-show tracking for customer follow-up and analytics
   - Customizable webhook payloads for various business events

### Production File Structure Overview
```
medspav2/ (Production System)
├── src/
│   ├── app/                    # Next.js App Router (Production Pages)
│   │   ├── admin/              # Complete admin panel with authentication
│   │   ├── booking/            # Full customer booking flow (5 steps)
│   │   └── api/                # Production API endpoints with business logic
│   ├── components/
│   │   ├── admin/              # Admin panel components (timeline, scheduling)
│   │   ├── booking/            # Booking flow components (progress, summary)
│   │   └── ui/                 # Reusable UI components (shadcn/ui based)
│   ├── lib/                    # Production business logic and utilities
│   │   ├── booking-logic.ts    # Core booking validation and processing
│   │   ├── admin-booking-logic.ts # Admin-specific operations
│   │   ├── auth.ts             # Authentication and session management
│   │   └── supabase.ts         # Database client configuration
│   └── types/                  # TypeScript definitions for all data models
├── docs/                       # Comprehensive documentation suite
├── supabase/migrations/        # Database schema and migration files
├── jest.config.js              # Testing configuration (70%+ coverage)
└── vercel.json                 # Production deployment configuration
```

### Database Production Schema
Current production database includes:
- **Complete service catalog**: 44 services with pricing, duration, and category data
- **Staff management**: 4 staff members with schedules, capabilities, and room assignments
- **Room configuration**: 3 treatment rooms with capacity and capability definitions
- **Customer data**: Secure customer information with privacy-conscious design
- **Booking system**: Comprehensive booking management with status tracking and audit trails
- **Admin authentication**: Role-based access control for administrative functions

### Integration Capabilities
- **GoHighLevel webhooks**: 4 webhook types for comprehensive customer lifecycle management
- **24-hour reminders**: Automated SMS/email reminder system with delivery tracking
- **Real-time updates**: Supabase real-time subscriptions for live admin panel updates
- **Health monitoring**: Built-in health check endpoints for system monitoring and maintenance

### Performance & Reliability Features
- **Optimized queries**: Database indexes and functions ensuring sub-300ms response times
- **Error handling**: Comprehensive error tracking and logging throughout the system
- **Testing coverage**: 70%+ test coverage with Jest and React Testing Library
- **Security measures**: Row-level security policies, encrypted data storage, secure authentication 