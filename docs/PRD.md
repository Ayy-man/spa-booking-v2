# Dermal Skin Clinic Booking System - Production System Documentation

## Project Overview
A production-ready medical spa booking system for Dermal Skin Clinic and Spa Guam. This comprehensive system handles complex spa scheduling with 44 services, 4 staff members, 3 treatment rooms, and includes a full admin panel with authentication.

## User Flow
1. **Entry Points:**
   - Voice agent → GoHighLevel → WhatsApp/Email link → Booking app
   - Website → Service selection → Book Now → Booking app

2. **Booking Process:**
   - Select service from dropdown
   - Choose date and time (not calendar view)
   - Select staff preference (Any Available or Specific Staff)
   - Enter contact information
   - Confirm booking

## Production Features - COMPLETED
1. **Customer Booking System**:
   - 44 active services across 7 categories (facials, massages, body treatments, waxing, packages)
   - Advanced date/time selection with real-time availability
   - Staff selection with capability filtering
   - Automated room assignment based on service requirements
   - Couples booking functionality
   - Complete booking confirmation flow

2. **Admin Panel**:
   - Secure authentication system with role-based access
   - Today's schedule dashboard with real-time updates
   - Interactive room timeline with drag-and-drop rescheduling
   - Booking management with status updates
   - Staff schedule management
   - Quick actions for check-in, completion, and cancellations

3. **GoHighLevel Integration**:
   - New customer webhooks
   - Booking confirmation webhooks
   - Booking update webhooks
   - Show/no-show tracking webhooks

4. **24-Hour Reminder System**:
   - Automated SMS/email reminders
   - Customizable reminder templates
   - Delivery tracking and monitoring

5. **Data Management**:
   - Complete Supabase database with PostgreSQL
   - Row-level security policies
   - Automated backup and recovery
   - Comprehensive audit trails

## Current System Configuration

### Room Assignment Logic (IMPLEMENTED)
1. **Room 1**: Standard single services
2. **Room 2**: Couples-capable, standard treatments  
3. **Room 3**: Couples-capable with body scrub capabilities (preferred for couples bookings)
4. **Intelligent Assignment**: System automatically assigns optimal room based on service type and availability

### Staff Configuration (4 ACTIVE STAFF)
1. **Selma**: Comprehensive facial services, Mon/Wed/Fri/Sat/Sun availability
2. **Robyn**: Full service range, complete schedule availability
3. **Tanisha**: Facials and waxing specialist, Mon/Wed/Fri/Sat/Sun (off Tue/Thu)
4. **Leonel**: Massage specialist, Sunday-only availability

### Service Categories (44 ACTIVE SERVICES)
1. **Facial Services** (8 services): 30-120 minutes, $65-$120
2. **Body Massages** (6 services): 60-150 minutes, $80-$120
3. **Body Treatments** (8 services): 30 minutes, $65-$150
4. **Waxing Services** (16 services): 5-60 minutes, $10-$80
5. **Service Packages** (3 services): 90-150 minutes, $130-$200
6. **Body Scrub Services** (2 services): 30 minutes, $65
7. **Membership Services** (1 service): Annual VIP membership, $50

## Production Technical Stack
- **Frontend**: Next.js 14 with App Router (production-optimized)
- **UI Framework**: Shadcn/ui components with custom design system
- **Styling**: Tailwind CSS with WCAG AA compliant color palette
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with role-based access control
- **Real-time**: Supabase real-time subscriptions for live updates
- **Testing**: Jest + React Testing Library (70%+ coverage)
- **Deployment**: Vercel with automated CI/CD pipeline
- **Monitoring**: Built-in health checks and error tracking
- **External Integrations**: GoHighLevel webhooks, SMS/email services

## Production Deployment Status

### Live System Features - COMPLETED
- **Customer Interface**: Complete booking flow from service selection to confirmation
- **Admin Dashboard**: Full-featured admin panel with authentication and real-time updates
- **Database Integration**: Production Supabase database with all business logic functions
- **Webhook Integration**: Active GoHighLevel webhooks for customer management
- **Reminder System**: 24-hour automated reminder system operational
- **Testing Infrastructure**: Comprehensive test suite with 70%+ coverage
- **Documentation**: Complete technical and user documentation

### Deployment Configuration
- **Platform**: Vercel (production deployment)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Domain**: Custom domain configured for Dermal Skin Clinic
- **SSL**: HTTPS encryption enabled
- **Monitoring**: Health check endpoints and error tracking
- **Backup**: Automated daily database backups 