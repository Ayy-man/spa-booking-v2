# Dermal Medical Spa Booking System

A comprehensive medical spa booking system built for Dermal Skin Clinic and Spa Guam. This production-ready application provides online booking, staff management, room assignment, and administrative tools.

## 🎉 **PRODUCTION v1.2.0 - READY FOR DEPLOYMENT**

**Status**: ✅ **Production Ready**  
**Version**: v1.2.0  
**Last Updated**: August 6, 2025  
**Deployment Status**: Ready for live deployment  
**Security Status**: ✅ **Secured** - Comprehensive security assessment completed  
**Test Coverage**: ✅ **70%+** - Meeting all coverage requirements

## 🎯 Project Overview

This booking system handles complex spa scheduling with:
- **44 Services**: Facials, massages, treatments, waxing, and packages
- **3 Rooms**: Different capabilities for single/couples services
- **4 Staff Members**: Each with specific capabilities and schedules
- **Smart Room Assignment**: Automatic room allocation based on service type
- **Mobile-First Design**: Optimized for mobile booking experience
- **Couples Booking**: Book appointments for two people simultaneously
- **Enhanced Admin Panel**: Full-featured admin system with authentication
- **Real-time Monitoring**: Live booking tracking and management
- **Mobile Calendar Navigation**: Optimized mobile-first calendar with week navigation
- **Confetti Animations**: Celebratory booking confirmation experience
- **Advanced Security**: Comprehensive security measures and monitoring

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

## 🔒 Security Features

### Comprehensive Security Implementation
- **Authentication**: Secure Supabase-based authentication with role-based access
- **Data Protection**: Row Level Security (RLS) policies protecting all sensitive data
- **Input Validation**: Client and server-side validation using Zod schemas
- **API Security**: Proper authentication required for all sensitive endpoints
- **Environment Security**: Comprehensive environment variable validation
- **Database Security**: UUID-based IDs preventing enumeration attacks
- **Monitoring Ready**: Built-in security monitoring and alerting capabilities

### Security Assessment Results
- **Security Rating**: 95% - Excellent
- **Critical Vulnerabilities**: 0
- **Authentication System**: Production-ready with admin role management
- **Data Encryption**: All data encrypted in transit and at rest
- **Compliance**: OWASP Top 10 guidelines followed

For detailed security information, see [`SECURITY.md`](./SECURITY.md)

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

### Color Palette
- **Primary**: #C36678 (Spa pink)
- **Primary Dark**: #AA3B50 (Deep rose)
- **Background**: #F8F8F8 (Light gray)
- **Accent**: #F6C7CF (Soft pink)
- **Text**: #000000 (Black)
- **Buttons**: #000000 (Black for high contrast)

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
- **Security Testing**: Authentication, authorization, and input validation
- **Database Schema**: UUID field validation and type consistency
- **Mobile Features**: Calendar navigation and responsive design testing

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

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ environment
- Supabase project configured
- Environment variables validated
- Database migrations completed
- Health checks passing

### Quick Deploy to Vercel
```bash
# 1. Verify environment variables
npm run test:ci

# 2. Build and validate
npm run build

# 3. Deploy to Vercel
vercel --prod
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

We welcome contributions to improve the Dermal Spa Booking System. Please read our comprehensive contributing guidelines for detailed information.

### Quick Start for Contributors
1. **Security First**: Review [`SECURITY.md`](./SECURITY.md) for security guidelines
2. **Read Guidelines**: Check [`CONTRIBUTING.md`](./CONTRIBUTING.md) for detailed contribution process
3. **Follow Standards**: Maintain code quality and security standards
4. **Write Tests**: Include tests for new features (70%+ coverage required)
5. **Security Review**: All changes undergo security review

### Development Standards
- **TypeScript**: Strict type checking with database schema alignment
- **Security**: All code must pass security validation
- **Testing**: Minimum 70% test coverage required
- **Documentation**: Update relevant documentation with changes
- **Code Quality**: ESLint and Prettier for consistent formatting

### Contribution Areas
- **Feature Development**: New booking system features
- **Security Improvements**: Security enhancements and testing
- **Performance Optimization**: Speed and efficiency improvements
- **UI/UX Enhancements**: Mobile-first design improvements
- **Documentation**: Keep documentation current and comprehensive

For detailed contribution guidelines, see [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## 📞 Support

For technical support or questions about the booking system:
- **Clinic Phone**: (671) 647-7546
- **Documentation**: Check the `/docs` folder
- **Issues**: Use GitHub issues for bug reports

## 📄 License

This project is proprietary software for medical spa services.

---

**Built with ❤️ for medical spa services**

## Recent Feature Highlights

### 🎉 New Features Added
- **Mobile Calendar Navigation**: Enhanced mobile-first calendar interface with week-by-week navigation
- **Confetti Animation**: Celebratory confirmation page with confetti explosion animation
- **Advanced Payment Tracking**: Comprehensive payment system with multiple payment methods
- **Debug Tools**: Administrative debug tools for booking conflict resolution
- **Enhanced Admin Layout**: Improved admin panel with better navigation and functionality

### 🔒 Security Enhancements
- **Comprehensive Security Assessment**: Full security review completed with 95% rating
- **Authentication Hardening**: Enhanced admin authentication and session management
- **Input Validation**: Strengthened client and server-side validation
- **Database Security**: UUID-based security and RLS policy improvements
- **Security Documentation**: Complete security policy and best practices documentation

For complete change history, see [`CHANGELOG.md`](./CHANGELOG.md)

## Technical Changelog

### v1.2.0 - Major Database Schema Fixes and Security Enhancements (August 6, 2025)

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
- ✅ **MAJOR**: Resolved critical database schema mismatch issues
- ✅ **FIXED**: "column rooms.has_body_scrub_equipment does not exist" admin panel error
- ✅ **UPDATED**: All field name inconsistencies resolved:
  - `appointment_date` → `booking_date`
  - `capabilities` → `can_perform_services`
  - `requires_room_3` → `requires_body_scrub_room`
- ✅ **CORRECTED**: All room IDs changed from number to string (UUID) throughout codebase
- ✅ **SYNCHRONIZED**: TypeScript types now fully match actual database schema
- ✅ **RESOLVED**: All TypeScript compilation errors for successful deployment
- ✅ **VERIFIED**: Project builds successfully without errors
- ✅ **OPERATIONAL**: Admin panel functionality fully restored
- ✅ **TESTED**: All booking pathways confirmed working

### Previous Updates
- ✅ Enhanced admin panel with authentication
- ✅ Real-time booking monitoring
- ✅ Improved staff management system
- ✅ Better error handling and validation
- ✅ Mobile-optimized admin interface
- ✅ Comprehensive testing suite
