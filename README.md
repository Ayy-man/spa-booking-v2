# Medical Spa Booking System

A sophisticated Calendly-style booking system for medical spa services, built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🎉 **PRODUCTION V1 - ENHANCED WITH ADMIN SYSTEM**

**Status**: ✅ **Complete and tested with enhanced admin panel**  
**Version**: v1.1.0  
**Last Updated**: Current session  
**Git Tag**: production-v1

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
- **staff**: Staff members and capabilities
- **rooms**: Room configurations and capabilities
- **bookings**: Booking records and status
- **customers**: Customer information and history
- **staff_schedules**: Staff availability and schedules

### Key Features
- **Row Level Security (RLS)**: Data protection
- **Real-time subscriptions**: Live updates
- **Optimized queries**: Fast performance
- **Data validation**: Input sanitization

## 🧪 Testing

### Automated Testing
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API and database testing
- **E2E Tests**: Full booking flow testing

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

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Setup
1. Create new Supabase project
2. Run database migrations from `/supabase/migrations/`
3. Set up Row Level Security (RLS)
4. Configure authentication

### Environment Variables (Production)
```bash
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

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

**Built with ❤️ for medical spa services**

### Recent Updates
- ✅ Enhanced admin panel with authentication
- ✅ Real-time booking monitoring
- ✅ Improved staff management system
- ✅ Better error handling and validation
- ✅ Mobile-optimized admin interface
- ✅ Comprehensive testing suite # Updated for Vercel deployment
# Vercel deployment trigger - Fri Aug  1 01:20:31 IST 2025
