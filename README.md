# Dermal Skin Clinic Booking System

A production-ready medical spa booking system serving Dermal Skin Clinic and Spa Guam. This comprehensive single-tenant application provides complete online booking, staff management, room assignment, admin panel operations, and GoHighLevel integration.

## 🎉 **PRODUCTION v2.0.0 - LIVE & OPERATIONAL**

**Status**: 🟢 **LIVE IN PRODUCTION**  
**Version**: v2.0.0  
**Last Updated**: August 2, 2025  
**Deployment Status**: Successfully deployed and serving customers  
**Platform**: Vercel (production environment)  
**Database**: Supabase PostgreSQL (production instance)

## 🎯 Production System Overview

This live medical spa booking system successfully serves Dermal Skin Clinic and Spa Guam with:

### Current Live Features
- **44 Active Services**: Complete service catalog across 7 categories (facials, massages, body treatments, waxing, packages, body scrubs, membership)
- **3 Treatment Rooms**: Intelligent room assignment (Room 1: singles, Room 2: couples, Room 3: couples + body scrubs)
- **4 Active Staff Members**: Selma, Robyn, Tanisha, Leonel - each with specialized capabilities and schedules
- **Automated Room Assignment**: Real-time room allocation based on service requirements and availability
- **Mobile-Optimized Interface**: Responsive design with WCAG AA accessibility compliance
- **Couples Booking Functionality**: Synchronized appointments for two customers with shared room assignment
- **Complete Admin Panel**: Role-based authentication, real-time dashboard, drag-and-drop scheduling
- **GoHighLevel Integration**: Active webhooks for customer management and communication
- **24-Hour Reminder System**: Automated SMS/email reminders with delivery tracking
- **Production Database**: Live PostgreSQL with comprehensive business logic and security policies

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Installation
```bash
# Clone the repository
git clone https://github.com/Ayy-man/spa-booking-v2.git
cd medspav2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run the development server
npm run dev
```

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLINIC_NAME="Dermal Skin Clinic and Spa Guam"
NEXT_PUBLIC_CLINIC_PHONE="(671) 647-7546"
NEXT_PUBLIC_CLINIC_ADDRESS="123 Marine Corps Dr, Tamuning, GU 96913"

# Business Configuration
NEXT_PUBLIC_BUSINESS_HOURS_START=09:00
NEXT_PUBLIC_BUSINESS_HOURS_END=19:00
NEXT_PUBLIC_MAX_ADVANCE_BOOKING_DAYS=30
NEXT_PUBLIC_BUFFER_TIME_MINUTES=15
```

## 📁 Project Structure

```
medspav2/
├── docs/                          # Documentation
│   ├── context/                   # Context files and documentation
│   ├── rules/                     # AI workflow rules
│   └── design/                    # Design assets
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── admin/                 # Admin panel routes
│   │   ├── api/                   # API endpoints
│   │   └── booking/               # Booking flow pages
│   ├── components/                # React components
│   │   ├── admin/                 # Admin-specific components
│   │   ├── booking/               # Booking components
│   │   └── ui/                    # Shared UI components
│   ├── lib/                       # Utility libraries
│   ├── types/                     # TypeScript definitions
│   └── styles/                    # Additional styles
├── supabase/                      # Database migrations
└── public/                        # Static assets
```

## 🔧 Enhanced Admin Panel

The system includes a comprehensive admin panel with authentication:

### Features
- **🔐 Secure Authentication**: Login system with role-based access
- **📊 Booking Management**: View, filter, and manage all bookings
- **👥 Staff Management**: Monitor staff schedules and availability
- **🏠 Room Management**: Track room utilization and assignments
- **📈 Real-time Monitoring**: Live dashboard with booking analytics
- **⚡ Quick Actions**: Bulk operations and status updates
- **📅 Schedule View**: Today's schedule and upcoming appointments

### Admin Routes
- `/admin/login` - Secure authentication
- `/admin/bookings` - Booking management interface
- `/admin/monitor` - Real-time monitoring dashboard

### Security
- **Middleware Protection**: All admin routes protected
- **Role-based Access**: Admin and staff roles
- **Session Management**: Secure token-based authentication
- **CSRF Protection**: Built-in security measures

## 🎨 Design System

### Color Palette (WCAG AA Compliant)
- **Primary**: #A64D5F (WCAG AA compliant spa rose)
- **Primary Dark**: #8B3A4A (Deep rose for contrast)
- **Background**: #F8F8F8 (Light gray)
- **Accent**: #F6C7CF (Soft pink)
- **Text**: #000000 (Black for optimal readability)
- **Buttons**: Consistent hierarchy with proper contrast ratios

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)

### UI Components
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Mobile-first approach
- **Loading States**: Smooth user experience

## 🏗️ Business Logic

### Room Assignment Rules
1. **Body Scrub Services**: Only Room 3
2. **Couples Bookings**: Room 3 preferred, then Room 2
3. **Single Services**: Any available room
4. **Staff Default Rooms**: Selma (Room 1), Tanisha (Room 2), Robyn (Room 3)

### Couples Booking Feature
- Toggle between single and couples booking modes
- Select same or different services for each person
- Choose same or different staff members
- Automatic assignment to couples-capable rooms
- Synchronized booking management with group tracking

### Staff Capabilities
- **Selma**: All facials except dermaplaning
- **Robyn**: Most services except RF/nano/microneedling/derma roller/dermaplaning
- **Tanisha**: Facials and waxing (off Tue/Thu)
- **Leonel**: Massage only (Sundays only)

### Booking Constraints
- Operating hours: 9 AM - 7 PM
- Buffer time: 15 minutes between appointments
- Maximum advance booking: 30 days
- Last booking: 1 hour before closing

## 🔧 Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Development Features
- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Jest Testing**: Unit and integration tests

## 🗄️ Database Schema

### Core Tables
- **services**: Service definitions and pricing
- **staff**: Staff members and capabilities (uses `can_perform_services` field)
- **rooms**: Room configurations with equipment flags (`has_body_scrub_equipment`, `is_couples_room`)
- **bookings**: Booking records with customer info (uses `booking_date` field)
- **admin_users**: Admin authentication and role management
- **staff_schedules**: Staff availability and schedules

### Schema Characteristics
- **UUID Primary Keys**: All IDs are UUID strings, not integers
- **Snake Case Fields**: Database uses snake_case naming convention
- **Integrated Customer Data**: Customer information stored directly in bookings table
- **Equipment Tracking**: Rooms have specific equipment and capability flags
- **Service Requirements**: Services properly linked to room requirements

### Key Features
- **Row Level Security (RLS)**: Data protection
- **Real-time subscriptions**: Live updates
- **Optimized queries**: Fast performance with proper field mapping
- **Data validation**: Input sanitization
- **Schema Synchronization**: TypeScript types fully aligned with database structure

## 🧪 Testing

### Test Suite Overview
- **Jest Testing Framework**: Comprehensive unit and integration testing
- **React Testing Library**: Component testing utilities
- **Coverage Threshold**: 70% minimum across all metrics
- **CI/CD Integration**: Automated testing on deployment

### Available Test Commands
```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:ci           # Run tests for CI/CD pipeline
```

### Test Coverage Areas
- **Booking Logic**: Core business logic validation
- **Environment Validation**: Configuration and security checks
- **Webhook Integration**: GoHighLevel integration testing
- **Database Utilities**: Data access layer testing
- **Health Checks**: System monitoring and status validation

### Manual Testing Checklist
- [x] All 44 services can be booked
- [x] Room assignment works correctly
- [x] Staff availability is enforced
- [x] No double bookings possible
- [x] Mobile responsive design
- [x] Fast loading times (<3s)
- [x] Error handling works
- [x] Data persists correctly
- [x] Admin authentication works
- [x] Couples booking flow complete
- [x] Environment validation working
- [x] Health check endpoint operational
- [x] Production build successful
- [x] Security measures implemented

## 🚀 Production Status - DEPLOYED & OPERATIONAL

### Current Deployment
- **Platform**: Vercel (production environment)
- **Database**: Supabase PostgreSQL (live production instance)
- **Domain**: Custom domain configured for Dermal Skin Clinic
- **SSL**: HTTPS encryption enabled
- **Monitoring**: Health check endpoints operational
- **Status**: 🟢 LIVE and processing customer bookings

### System Health
```bash
# Check system status
curl https://your-production-domain.com/api/health
# Response: {"status":"healthy","database":"connected","timestamp":"2025-08-02T..."}
```

### Detailed Deployment Process

#### 1. Environment Setup
Set these variables in your production environment:
```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Required - Application Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production

# Optional - Business Configuration
NEXT_PUBLIC_CLINIC_NAME="Dermal Skin Clinic and Spa Guam"
NEXT_PUBLIC_CLINIC_PHONE="(671) 647-7546"
NEXT_PUBLIC_CLINIC_ADDRESS="123 Marine Corps Dr, Tamuning, GU 96913"
NEXT_PUBLIC_BUSINESS_HOURS_START=09:00
NEXT_PUBLIC_BUSINESS_HOURS_END=19:00
NEXT_PUBLIC_MAX_ADVANCE_BOOKING_DAYS=30
NEXT_PUBLIC_BUFFER_TIME_MINUTES=15
```

#### 2. Database Migration
Run migrations in order from `/supabase/migrations/`:
```sql
-- 1. Initial schema (001_initial_schema.sql)
-- 2. RLS policies (002_rls_policies.sql)
-- 3. Booking functions (003_booking_functions.sql)
-- 4. Seed data (004_seed_data.sql)
-- 5. Missing services (005_add_missing_services.sql)
-- 6. Couples booking (006_couples_booking_support.sql)
-- 7. Fix couples function (007_fix_couples_booking_function.sql)
-- 8. Admin users table (008_admin_users_table.sql)
```

#### 3. Security Configuration
- Ensure RLS policies are enabled
- Verify admin_users table is properly secured
- Configure middleware protection for admin routes
- Set up proper CORS policies

#### 4. Health Check Validation
Verify deployment health:
```bash
curl https://your-domain.com/api/health
```

### Monitoring & Maintenance
- **Health Endpoint**: `/api/health` for system status
- **Error Tracking**: Built-in error boundaries and logging
- **Performance Monitoring**: Vercel Analytics integration
- **Database Monitoring**: Supabase dashboard for queries and performance

For detailed deployment instructions, see [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md)

## 📡 24-Hour Reminder Webhook

The system includes an automated 24-hour appointment reminder webhook that integrates with GoHighLevel:

- **Automatic Reminders**: Sends booking details 24 hours before appointments
- **Comprehensive Data**: Includes customer, service, staff, and room information
- **Duplicate Prevention**: Tracks sent reminders to avoid multiple notifications
- **Hourly Execution**: Cron job runs every hour for precise timing
- **Error Handling**: Robust retry logic and detailed logging

For complete implementation details, see [`24hr-reminder-implementation-log.md`](./docs/24hr-reminder-implementation-log.md)

## 📱 User Flow

### Customer Booking Flow
1. **Service Selection**: Choose from 44 available services
2. **Date & Time**: Select from available slots (next 30 days)
3. **Staff Selection**: Choose preferred staff or "Any Available"
4. **Customer Info**: Enter contact details
5. **Confirmation**: Review and confirm booking

### Admin Management Flow
1. **Authentication**: Secure login with role verification
2. **Dashboard**: Overview of all bookings and metrics
3. **Booking Management**: View, filter, and manage bookings
4. **Staff Monitoring**: Track staff schedules and availability
5. **Room Management**: Monitor room utilization

## 🔒 Security Features

- **Authentication**: Secure admin login system
- **Authorization**: Role-based access control
- **Input Validation**: Client and server-side validation
- **Row Level Security**: Database-level protection
- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Prevention**: Cross-site scripting protection
- **SQL Injection Protection**: Parameterized queries

## 📊 Performance

### Target Metrics
- **Page Load Time**: < 3 seconds
- **Booking Success Rate**: > 95%
- **Error Rate**: < 1%
- **Mobile Performance**: < 4 seconds
- **Admin Panel Response**: < 2 seconds

### Optimizations
- **Image Optimization**: Next.js built-in optimization
- **Code Splitting**: Automatic bundle optimization
- **Database Query Optimization**: Efficient Supabase queries
- **Caching Strategies**: Browser and server-side caching

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use ESLint for code quality
3. Write tests for new features
4. Update documentation as needed
5. Follow the established business logic rules

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent formatting
- **Git Hooks**: Pre-commit validation

## 📞 Support

For technical support or questions about the booking system:
- **Clinic Phone**: (671) 647-7546
- **Documentation**: Check the `/docs` folder
- **Issues**: Use GitHub issues for bug reports

## 📄 License

This project is proprietary software for medical spa services.

---

**Built with ❤️ for Dermal Skin Clinic and Spa Guam - Now serving customers in production!** 🌺

## Production Deployment Timeline

### v2.0.0 - PRODUCTION LAUNCH (August 2, 2025)

#### 🎉 PRODUCTION DEPLOYMENT COMPLETED
- **Status**: ✅ LIVE IN PRODUCTION
- **Deployment Date**: August 2, 2025
- **Platform**: Vercel production environment
- **Database**: Supabase PostgreSQL (production instance)
- **Domain**: Custom domain with SSL certificate
- **Monitoring**: Health checks and error tracking active

#### Production Features Operational
1. **Customer Booking System**: All 44 services available for live bookings
2. **Admin Panel**: Complete admin interface with authentication
3. **GoHighLevel Integration**: All 4 webhook types active and processing
4. **24-Hour Reminders**: Automated reminder system operational
5. **Real-time Updates**: Live dashboard and booking management
6. **Database**: Production PostgreSQL with all business logic functions
7. **Security**: Row-level security policies and encrypted data storage
8. **Testing**: 70%+ code coverage with comprehensive test suite

### v1.2.0 - Database Schema Synchronization (August 1, 2025)

#### Critical Issues Resolved
1. **Database Schema Synchronization**
   - **Issue**: TypeScript type definitions did not match actual database schema
   - **Resolution**: Updated `/src/types/database.ts` to perfectly align with Supabase schema
   - **Impact**: Eliminated all type-related runtime errors

2. **Admin Panel Column Error**
   - **Issue**: "column rooms.has_body_scrub_equipment does not exist" error
   - **Resolution**: Added missing room equipment fields to database types
   - **Impact**: Admin panel now functions without errors

3. **Field Name Inconsistencies**
   - **Issues Fixed**:
     - `appointment_date` → `booking_date` (bookings table)
     - `capabilities` → `can_perform_services` (staff table)
     - `requires_room_3` → `requires_body_scrub_room` (services)
   - **Resolution**: Updated all references throughout codebase
   - **Impact**: Consistent field naming eliminates query failures

4. **UUID vs Integer Type Mismatch**
   - **Issue**: Database uses UUID strings, code expected integers
   - **Resolution**: Changed all ID types from `number` to `string` throughout
   - **Impact**: Eliminated type coercion errors and database constraint violations

#### Technical Changes Made
- **Core Files Updated**:
  - `/src/types/database.ts` - Primary type definitions
  - `/src/lib/supabase.ts` - Database query functions
  - `/src/components/admin/room-timeline.tsx` - Admin components
  - `/src/lib/booking-logic.ts` - Business logic
  - `/src/lib/admin-booking-logic.ts` - Admin operations
  - Multiple booking and staff selection components

- **Database Schema Clarifications**:
  - All primary keys are UUID strings (not integers)
  - Field names follow snake_case convention
  - Customer data integrated directly in bookings table
  - Room capabilities properly defined with equipment flags
  - Staff capabilities correctly referenced

#### Build and Deployment Status
- ✅ **TypeScript Compilation**: All errors resolved
- ✅ **Admin Panel**: Fully functional without schema errors
- ✅ **Booking System**: All workflows operational
- ✅ **Database Queries**: All queries use correct field names and types
- ✅ **Production Ready**: Application builds and deploys successfully

### Recent Updates - v1.2.0 (August 1, 2025)
- ✅ **SCHEMA SYNC**: Complete database schema synchronization with TypeScript types
- ✅ **ADMIN PANEL**: Resolved all column reference errors and functionality restored
- ✅ **FIELD MAPPING**: Standardized all database field names and references
- ✅ **TYPE SAFETY**: UUID string types consistently applied throughout codebase
- ✅ **COMPILATION**: All TypeScript errors resolved for successful builds
- ✅ **TESTING**: Comprehensive test suite implemented with 70%+ coverage
- ✅ **VALIDATION**: Production-ready with health monitoring and error tracking

### Previous Updates
- ✅ Enhanced admin panel with authentication
- ✅ Real-time booking monitoring
- ✅ Improved staff management system
- ✅ Better error handling and validation
- ✅ Mobile-optimized admin interface
- ✅ Comprehensive testing suite
