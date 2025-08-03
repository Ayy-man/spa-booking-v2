# Dermal Skin Clinic Booking System - Project Requirements Document

## Project Overview
A Calendly-style booking system for Dermal Skin Clinic and Spa Guam that handles complex spa scheduling with multiple rooms, staff, and services.

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

## Core Features (MVP)
1. Service selection dropdown (all 50+ services)
2. Date/time picker (next 30 days)
3. Staff preference selection
4. Room auto-assignment based on service type
5. Booking confirmation
6. Data storage in Supabase

## Business Rules
1. **Room Assignment:**
   - Room 1: Single services only
   - Room 2: Couples services
   - Room 3: Couples + body scrub services (prioritize for couples)
   - Staff can use any room when all are busy

2. **Staff Capabilities:**
   - Selma: All facials except dermaplaning
   - Robyn: Most services except RF/nano/microneedling/derma roller/dermaplaning
   - Tanisha: Facials and waxing (off Tue/Thu)
   - Leonel: Massage only (Sundays only)

3. **Service Categorization:**
   - Facials (30-120 mins)
   - Body Massages (60-150 mins)
   - Body Treatments (30 mins)
   - Waxing (5-60 mins)
   - Packages (90-120 mins)

## Technical Stack
- Frontend: Next.js 14 with App Router
- UI: Shadcn/ui components
- Styling: Tailwind CSS with custom color palette
- Backend: Supabase (auth + database)
- Deployment: Vercel

## Phase 1 Deliverables (Customer-facing)
- Booking interface
- Service/date/time/staff selection
- Booking confirmation
- Database storage

## Phase 2 (Future)
- Staff dashboard (anonymized bookings)
- Room management interface
- Booking modifications
- Email/SMS notifications 