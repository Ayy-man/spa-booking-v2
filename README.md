# Medical Spa Booking System

A sophisticated Calendly-style booking system for medical spa services, built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🎉 **PRODUCTION V1 - READY FOR DEPLOYMENT**

**Status**: ✅ **Complete and tested**  
**Version**: v1.0.0  
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
- **Admin Panel**: Basic booking management interface (view all bookings)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Installation
```bash
# Clone the repository
git clone [your-repo-url]
cd dermal-booking-app

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
```

## 📁 Project Structure

```
dermal-booking-app/
├── docs/                          # Documentation
│   ├── PRD.md                     # Project Requirements Document
│   ├── context/                   # Context files for AI
│   ├── rules/                     # AI workflow rules
│   └── design/                    # Design assets
├── src/
│   ├── app/                       # Next.js App Router
│   ├── components/                # React components
│   ├── lib/                       # Utility libraries
│   ├── types/                     # TypeScript definitions
│   ├── hooks/                     # Custom React hooks
│   └── styles/                    # Additional styles
└── public/                        # Static assets
```

## 🔧 Admin Panel

The system includes a basic admin panel at `/admin/bookings` that provides:
- **View all bookings** in a table format
- **Booking details** including customer, service, staff, room, and status
- **Read-only access** to booking information
- **Refresh functionality** to update booking data

**Note**: This is a basic read-only admin interface. Future enhancements could include:
- Booking status management (confirm/cancel/complete)
- Staff schedule management
- Customer management
- Payment processing
- Email notifications

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

### Using Claude Code
1. **Set up custom commands**:
   ```bash
   /create-command generate-implementation
   # Paste content from docs/rules/generate-rule.md
   
   /create-command work
   # Paste content from docs/rules/work-rule.md
   ```

2. **Generate implementation files**:
   ```bash
   /generate-implementation
   ```

3. **Start building**:
   ```bash
   Start building the Dermal booking app following Stage 1 of the implementation plan. Use the work rule to guide development.
   ```

### Development Stages
1. **Stage 1**: Project Setup (Next.js, Supabase, Tailwind)
2. **Stage 2**: HTML Prototype (all booking screens)
3. **Stage 3**: Design Implementation (color palette, components)
4. **Stage 4**: Component Development (React components)
5. **Stage 5**: Business Logic (room assignment, staff matching)
6. **Stage 6**: Database Integration (Supabase)
7. **Stage 7**: Testing & Refinement

## 🗄️ Database Schema

### Services Table
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR NOT NULL,
  requires_couples_room BOOLEAN DEFAULT FALSE,
  requires_body_scrub_room BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Staff Table
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  can_perform_services TEXT[],
  default_room INTEGER,
  schedule JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Rooms Table
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  capacity INTEGER NOT NULL,
  capabilities TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All 50+ services can be booked
- [ ] Room assignment works correctly
- [ ] Staff availability is enforced
- [ ] No double bookings possible
- [ ] Mobile responsive design
- [ ] Fast loading times (<3s)
- [ ] Error handling works
- [ ] Data persists correctly

### Key Test Scenarios
1. **Body Scrub Booking**: Should only allow Room 3
2. **Couples Service**: Should prefer Room 3, then Room 2
3. **Staff-Specific Booking**: Should respect staff capabilities
4. **Double Booking Prevention**: Should prevent overlapping appointments
5. **Mobile Experience**: Should work seamlessly on mobile devices

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Setup
1. Create new Supabase project
2. Run database migrations
3. Set up Row Level Security (RLS)
4. Configure authentication (if needed)

## 📱 User Flow

1. **Entry Points**:
   - Voice agent → GoHighLevel → WhatsApp/Email link → Booking app
   - Website → Service selection → Book Now → Booking app

2. **Booking Process**:
   - Select service from dropdown
   - Choose date and time (next 30 days)
   - Select staff preference (Any Available or Specific Staff)
   - Enter contact information
   - Confirm booking

3. **Confirmation**:
   - Booking summary
   - Confirmation email
   - Next steps information

## 🔒 Security

- Input validation (client and server-side)
- Row Level Security (RLS) in Supabase
- SQL injection protection
- XSS prevention
- CSRF protection

## 📊 Performance

- **Target Metrics**:
  - Page load time: < 3 seconds
  - Booking success rate: > 95%
  - Error rate: < 1%
  - Mobile performance: < 4 seconds

- **Optimizations**:
  - Image optimization
  - Code splitting
  - Database query optimization
  - Caching strategies

## 🤝 Contributing

1. Follow the established code standards
2. Test thoroughly before submitting
3. Update documentation as needed
4. Follow the business logic rules strictly

## 📞 Support

For technical support or questions about the booking system:
- **Clinic Phone**: (671) 647-7546
- **Email**: [your-email]
- **Documentation**: Check the `/docs` folder

## 📄 License

This project is proprietary software for medical spa services.

---

**Built with ❤️ for medical spa services** 