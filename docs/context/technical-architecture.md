# Dermal Skin Clinic Booking System - Technical Architecture

## System Overview

**Version**: 2.3.0  
**Status**: Production Ready  
**Architecture**: Next.js Full-Stack Application with Supabase Backend  
**Deployment**: Vercel Platform  
**Last Updated**: August 28, 2025

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Web    │    │   Next.js API    │    │   Supabase      │
│   Application   │◄──►│     Routes       │◄──►│   Database      │
│                 │    │                  │    │                 │
│  - React UI     │    │  - Booking APIs  │    │  - PostgreSQL   │
│  - Booking Flow │    │  - Admin APIs    │    │  - RLS Policies │
│  - Admin Panel  │    │  - Webhook APIs  │    │  - Auth System  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  External APIs  │    │   File Storage   │
│                 │    │                  │
│  - GoHighLevel  │    │  - Static Assets │
│  - Webhooks     │    │  - Documents     │
│  - Email/SMS    │    │  - Images        │
└─────────────────┘    └──────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 13+ with App Router
- **UI Library**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API + Local State
- **Form Handling**: React Hook Form with validation
- **Icons**: Lucide React icons
- **Dates**: date-fns library
- **Responsive**: Mobile-first design approach

### Component Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── booking/             # Customer booking flow
│   │   ├── page.tsx         # Service selection
│   │   ├── addons/          # Add-ons selection (NEW)
│   │   ├── date-time/       # Date and time picker
│   │   ├── staff/           # Staff selection
│   │   ├── customer-info/   # Customer information
│   │   ├── waiver/          # Waiver form
│   │   └── confirmation/    # Booking confirmation
│   ├── admin/               # Admin panel
│   │   ├── bookings/        # Booking management
│   │   ├── payment-links/   # Payment links dashboard
│   │   └── monitor/         # System monitoring
│   └── api/                 # API routes
│       ├── addons/          # Add-ons API (NEW)
│       ├── admin/           # Admin APIs
│       │   └── bookings/    # Staff reassignment API (NEW)
│       └── webhooks/        # Webhook handlers
├── components/              # Reusable components
│   ├── ui/                 # Base UI components
│   ├── booking/            # Booking-specific components
│   ├── admin/              # Admin-specific components
│   └── providers/          # Context providers
├── lib/                    # Business logic and utilities
├── types/                  # TypeScript type definitions
└── globals.css            # Global styles with theme support
```

### Key Frontend Features

#### Dark Mode System
- **Implementation**: Class-based Tailwind CSS dark mode
- **Storage**: localStorage with 'spa-theme' key
- **Components**: ThemeProvider context + ThemeToggle component
- **Accessibility**: WCAG AA compliant color schemes
- **Scope**: Customer pages only (admin intentionally light-mode)

#### Add-ons System Integration
- **Selection Page**: Dynamic add-ons loading at `/booking/addons`
- **Real-time Calculations**: Price and duration updates with add-ons
- **Compatibility**: Service-specific add-on filtering
- **UI Integration**: Seamless flow between service selection and booking

#### Advanced Admin Features
- **Staff Reassignment**: Dropdown-based staff reassignment with validation
- **Booking Management**: Enhanced BookingDetailsModal with full CRUD operations
- **Schedule Views**: Improved staff schedule with 9 AM start and clean UI
- **Add-ons Reporting**: Separate add-ons revenue tracking and display

## Backend Architecture

### Database Schema (Supabase PostgreSQL)

#### Core Tables
```sql
-- Customers
customers (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  phone_formatted TEXT, -- E164 format
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Services (Enhanced with add-ons support)
services (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  description TEXT,
  allows_addons BOOLEAN DEFAULT false, -- NEW
  requires_waiver BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)

-- NEW: Service Add-ons System
service_addons (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  duration INTEGER NOT NULL, -- Additional time in minutes
  category TEXT NOT NULL,
  applies_to_services UUID[], -- Array of service IDs
  applies_to_categories TEXT[], -- Array of service categories
  max_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Bookings (Enhanced with add-ons support)
bookings (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  staff_id TEXT NOT NULL,
  room_id INTEGER NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed',
  total_price DECIMAL NOT NULL,
  total_duration INTEGER NOT NULL, -- Includes add-ons duration
  booking_type TEXT DEFAULT 'single', -- 'single', 'couple'
  booking_group_id UUID, -- For couples bookings
  payment_status TEXT DEFAULT 'pending',
  special_requests TEXT,
  staff_change_count INTEGER DEFAULT 0, -- NEW
  last_staff_change_at TIMESTAMP, -- NEW
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- NEW: Booking Add-ons Junction Table
booking_addons (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES service_addons(id),
  quantity INTEGER DEFAULT 1,
  price_at_booking DECIMAL NOT NULL, -- Historical pricing
  duration_at_booking INTEGER NOT NULL, -- Historical duration
  created_at TIMESTAMP DEFAULT NOW()
)

-- Staff (Enhanced with better scheduling)
staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capabilities TEXT[], -- ['facials', 'massages', 'treatments', 'waxing']
  service_exclusions TEXT[],
  work_days INTEGER[], -- [0,1,2,3,4,5,6] (Sunday=0)
  default_room_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Rooms
rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 1,
  equipment TEXT[],
  is_active BOOLEAN DEFAULT true
)

-- NEW: Optional Staff Assignment History
staff_assignment_history (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  old_staff_id TEXT,
  new_staff_id TEXT,
  changed_by TEXT DEFAULT 'admin',
  reason TEXT,
  service_id UUID REFERENCES services(id),
  appointment_date DATE,
  appointment_time TIME,
  changed_at TIMESTAMP DEFAULT NOW()
)
```

#### Row Level Security (RLS) Policies
```sql
-- Anonymous users can create customers and bookings
CREATE POLICY "Allow anonymous customer creation" ON customers
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous booking creation" ON bookings
  FOR INSERT TO anon WITH CHECK (true);

-- Add-ons tables accessible to anonymous for booking flow
CREATE POLICY "Allow anonymous service_addons read" ON service_addons
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow anonymous booking_addons insert" ON booking_addons
  FOR INSERT TO anon WITH CHECK (true);

-- Admin users can manage all data
CREATE POLICY "Allow admin full access" ON ALL TABLES
  FOR ALL TO authenticated USING (auth.role() = 'admin');
```

### API Architecture

#### RESTful API Endpoints

**Customer Booking APIs:**
```
GET  /api/services              # Get all active services
GET  /api/services/grouped      # Get services grouped by category
GET  /api/addons/[serviceId]    # Get available add-ons for service (NEW)
POST /api/bookings              # Create new booking
GET  /api/bookings/[id]         # Get booking details
```

**Admin Management APIs:**
```
GET  /api/admin/bookings        # Get all bookings with filters
POST /api/admin/bookings/[id]/reassign-staff  # Reassign staff (NEW)
GET  /api/admin/bookings/[id]/reassign-staff   # Get available staff (NEW)
POST /api/admin/bookings/[id]/reschedule       # Reschedule booking
DELETE /api/admin/bookings/[id] # Cancel booking
GET  /api/admin/daily-summary   # Daily reports with add-ons revenue
```

**Webhook APIs:**
```
POST /api/webhooks/payment      # Payment confirmation webhooks
POST /api/webhooks/ghl          # GoHighLevel integration
```

#### Database Functions (Stored Procedures)

```sql
-- Core booking processing with add-ons support
process_booking(
  p_customer_data JSONB,
  p_booking_data JSONB,
  p_addons_data JSONB DEFAULT '[]'::jsonb -- NEW parameter
) RETURNS UUID

-- Add-ons helper functions (NEW)
get_available_addons(service_id UUID) 
  RETURNS TABLE(addon_id UUID, name TEXT, price DECIMAL, duration INTEGER)

calculate_booking_total_with_addons(booking_id UUID) 
  RETURNS DECIMAL

-- Staff availability checking
check_staff_availability(
  p_staff_id TEXT,
  p_date DATE,
  p_start_time TIME,
  p_duration INTEGER
) RETURNS BOOLEAN

-- Room assignment logic
assign_optimal_room(
  p_service_category TEXT,
  p_booking_type TEXT DEFAULT 'single',
  p_preferred_staff_id TEXT DEFAULT NULL,
  p_date DATE,
  p_start_time TIME,
  p_duration INTEGER
) RETURNS INTEGER
```

## Integration Architecture

### GoHighLevel Integration

#### Webhook Data Format (Enhanced with Add-ons)
```json
{
  "booking_id": "uuid",
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1671234567",
    "marketing_consent": true
  },
  "service": {
    "name": "Deep Cleansing Facial",
    "category": "facial",
    "duration": 60,
    "price": 79.00
  },
  "addons": [ // NEW: Add-ons data included
    {
      "name": "Face Treatment #2 Add-on",
      "quantity": 1,
      "price": 60.00,
      "duration": 30
    }
  ],
  "appointment": {
    "date": "2025-08-28",
    "start_time": "14:00",
    "end_time": "15:30", // Includes add-ons time
    "staff_name": "Robyn",
    "room": "Room 1"
  },
  "totals": {
    "base_price": 79.00,
    "addons_total": 60.00, // NEW
    "final_total": 139.00,  // NEW: Base + add-ons
    "total_duration": 90    // NEW: Base + add-ons duration
  },
  "payment": {
    "status": "completed",
    "method": "full_payment",
    "amount": 139.00
  }
}
```

#### Category Mappings
```typescript
const GHL_CATEGORY_MAPPING = {
  'facial': 'FACE TREATMENTS',
  'massage': 'BODY MASSAGES', 
  'body_treatment': 'BODY TREATMENTS & BOOSTERS',
  'body_scrub': 'BODY TREATMENTS & BOOSTERS',
  'waxing': 'Waxing Services',
  'package': 'FACE & BODY PACKAGES',
  'consultation': 'FACE TREATMENTS' // NEW
}
```

### External Service Integrations

#### Payment Processing
- **Primary**: GoHighLevel payment links
- **Fallback**: $30 deposit system via FastPayDirect
- **Webhook Verification**: HMAC signature validation
- **Reconciliation**: Automatic booking-payment matching

#### Communication Systems
- **SMS**: GoHighLevel SMS campaigns
- **Email**: Automated booking confirmations
- **Reminders**: 24-hour advance reminders

## Security Architecture

### Authentication & Authorization

#### Admin Authentication
```typescript
// Simple authentication for admin panel
interface AdminSession {
  isAuthenticated: boolean
  role: 'admin' | 'staff' | 'manager'
  permissions: string[]
  sessionExpiry: Date
}

// Middleware protection for admin routes
export function adminAuthMiddleware(request: NextRequest) {
  const session = getAdminSession(request)
  if (!session || !session.isAuthenticated) {
    return redirect('/admin/login')
  }
  return NextResponse.next()
}
```

#### API Security
- **Rate Limiting**: Implemented via Vercel edge functions
- **CORS**: Configured for booking domain only  
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection**: Protected via Supabase client parameterization
- **XSS Protection**: React built-in escaping + CSP headers

### Data Protection
- **PII Encryption**: Customer data encrypted at rest (Supabase)
- **Phone Number Formatting**: E164 standard with validation
- **Email Validation**: RFC-compliant email validation
- **GDPR Compliance**: Marketing consent tracking
- **Data Retention**: Configurable retention policies

## Performance Architecture

### Optimization Strategies

#### Frontend Performance
- **Code Splitting**: Automatic via Next.js App Router
- **Image Optimization**: Next.js Image component with WebP
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Browser caching for static assets
- **Lazy Loading**: React.lazy for non-critical components

#### Database Performance
```sql
-- Key indexes for performance
CREATE INDEX idx_bookings_date_staff ON bookings(appointment_date, staff_id);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status != 'cancelled';
CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX idx_service_addons_category ON service_addons(category) WHERE is_active = true;
```

#### API Performance
- **Response Caching**: 5-minute cache for service listings
- **Connection Pooling**: Supabase connection pooling
- **Query Optimization**: Selective field fetching
- **Batch Operations**: Bulk insert for add-ons

### Monitoring & Observability

#### Health Checks
```typescript
// System health monitoring
GET /api/health
Response: {
  status: 'healthy',
  database: 'connected',
  external_apis: {
    supabase: 'up',
    ghl_webhook: 'up'
  },
  version: '2.3.0',
  uptime: '99.9%',
  last_backup: '2025-08-28T10:00:00Z'
}
```

#### Error Tracking
- **Client Errors**: React error boundaries with fallbacks
- **API Errors**: Structured error responses with codes
- **Database Errors**: Graceful degradation with fallbacks
- **Integration Errors**: Retry logic with exponential backoff

## Deployment Architecture

### Production Infrastructure
- **Platform**: Vercel (recommended for Next.js)
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **SSL**: Automatic via Vercel
- **Custom Domain**: Configured via Vercel dashboard

### Environment Configuration
```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Server-side only
NEXT_PUBLIC_APP_URL=https://booking.dermalskincare.com
GHL_WEBHOOK_SECRET=webhook_secret_key
ADMIN_AUTH_SECRET=admin_secret_key
```

### Deployment Pipeline
1. **Code Commit**: Git push to main branch
2. **Automatic Build**: Vercel builds Next.js application
3. **Database Migrations**: Applied via Supabase CLI
4. **Health Checks**: Automated system health verification
5. **Go Live**: Traffic routed to new deployment

## Recent Technical Improvements (August 2025)

### Add-ons System Architecture
- **Database Design**: Flexible add-ons system with service compatibility
- **API Design**: RESTful endpoints for add-ons management
- **Frontend Integration**: Seamless booking flow integration
- **Admin Capabilities**: Full add-ons reporting and management

### Staff Management Enhancements
- **Reassignment API**: Advanced staff reassignment with business rule validation
- **Availability Engine**: Real-time staff availability checking
- **Conflict Detection**: Automatic scheduling conflict prevention
- **History Tracking**: Complete audit trail for staff changes

### UI/UX Technical Improvements
- **Theme System**: Production-ready dark mode implementation
- **Component Architecture**: Reusable component design system
- **Accessibility**: WCAG AA compliance across all interfaces
- **Mobile Optimization**: Touch-friendly responsive design

### System Reliability
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Data Validation**: Client and server-side validation consistency
- **Performance**: Optimized queries and reduced bundle sizes
- **Monitoring**: Enhanced health checks and system monitoring

## Future Technical Considerations

### Scalability Roadmap
- **Microservices**: Potential split of admin and booking services
- **Caching Layer**: Redis for high-traffic scenarios
- **Load Balancing**: Multiple instance deployment
- **Database Sharding**: Horizontal scaling for large datasets

### Feature Extensions
- **Real-time Updates**: WebSocket integration for live booking updates
- **Mobile Apps**: React Native applications
- **Advanced Analytics**: Business intelligence dashboard
- **Multi-location**: Support for multiple spa locations

### Security Enhancements
- **2FA**: Two-factor authentication for admin users
- **Audit Logging**: Comprehensive action logging
- **Data Encryption**: End-to-end encryption for sensitive data
- **Compliance**: SOC 2 and HIPAA compliance measures

---

**Document Version**: 1.0  
**Last Updated**: August 28, 2025  
**Next Review**: September 28, 2025  
**Maintained By**: Development Team