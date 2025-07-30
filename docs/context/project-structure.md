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
│   │       └── rooms/             # Rooms API
│   ├── components/                # React components
│   │   ├── ui/                    # Shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── booking/               # Booking-specific components
│   │   │   ├── ServiceSelector.tsx
│   │   │   ├── DateTimePicker.tsx
│   │   │   ├── StaffSelector.tsx
│   │   │   ├── CustomerForm.tsx
│   │   │   ├── BookingConfirmation.tsx
│   │   │   ├── RoomAssignment.tsx
│   │   │   └── CouplesBooking.tsx
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
│   │   ├── room-assignment.ts     # Room assignment algorithm
│   │   ├── staff-availability.ts  # Staff availability checker
│   │   ├── validation.ts          # Form validation schemas
│   │   └── utils.ts               # General utility functions
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
├── .env.local                     # Environment variables
├── .env.example                   # Environment variables template
├── tailwind.config.js             # Tailwind CSS configuration
├── next.config.js                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies and scripts
├── README.md                      # Project documentation
└── .gitignore                     # Git ignore rules
```

## Key Files and Their Purposes

### Core Application Files
- **`src/app/page.tsx`**: Landing page with service showcase
- **`src/app/booking/page.tsx`**: Main booking flow entry point
- **`src/app/layout.tsx`**: Root layout with navigation and styling

### Business Logic Files
- **`src/lib/booking-logic.ts`**: Core booking validation and processing
- **`src/lib/room-assignment.ts`**: Room assignment algorithm
- **`src/lib/staff-availability.ts`**: Staff scheduling logic

### Component Organization
- **`src/components/ui/`**: Reusable UI components (Shadcn/ui)
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

## File Naming Conventions
- **Components**: PascalCase (e.g., `ServiceSelector.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useBooking.ts`)
- **Utilities**: camelCase (e.g., `booking-logic.ts`)
- **Types**: camelCase (e.g., `booking.ts`)
- **Pages**: lowercase with hyphens (e.g., `customer-info/page.tsx`) 