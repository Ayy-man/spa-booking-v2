# Contributing to Dermal Spa Booking System

Thank you for your interest in contributing to the Dermal Medical Spa Booking System! This document provides comprehensive guidelines for contributing to this production-ready medical spa booking application.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Security Requirements](#security-requirements)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation Standards](#documentation-standards)
- [Performance Considerations](#performance-considerations)

## Code of Conduct

This project follows a professional code of conduct focused on:
- **Quality**: Maintaining high code quality and security standards
- **Collaboration**: Respectful and constructive communication
- **Security**: Prioritizing security in all contributions
- **Documentation**: Clear and comprehensive documentation
- **Testing**: Thorough testing of all changes

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- **Node.js 18+** installed
- **Git** configured with your information
- **TypeScript** knowledge (project is 100% TypeScript)
- **Next.js** familiarity (App Router pattern)
- **Supabase** understanding (database and authentication)
- **Security mindset** (this is a production medical system)

### First-Time Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/spa-booking-v2.git
   cd spa-booking-v2
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development credentials
   ```

4. **Database Setup**
   - Create a Supabase project
   - Run all migrations in `/supabase/migrations/` in order
   - Seed initial data using `004_seed_data.sql`

5. **Validate Setup**
   ```bash
   npm run build  # Should complete without errors
   npm run test   # Should pass all tests
   npm run dev    # Should start development server
   ```

## Development Environment Setup

### Required Tools

#### Development Dependencies
```bash
# Core development tools
npm install --save-dev typescript @types/node @types/react
npm install --save-dev eslint eslint-config-next
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

#### IDE Configuration (Recommended: VS Code)
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

#### Git Hooks Setup
```bash
# Install pre-commit hooks (recommended)
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test:ci"
```

### Environment Variables Configuration

#### Development Environment
```bash
# .env.local (never commit this file)
NEXT_PUBLIC_SUPABASE_URL=your_dev_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Business configuration
NEXT_PUBLIC_CLINIC_NAME="Development Spa"
NEXT_PUBLIC_BUSINESS_HOURS_START=09:00
NEXT_PUBLIC_BUSINESS_HOURS_END=19:00
```

#### Validation
Always validate your environment setup:
```bash
npm run test:ci  # Includes environment validation tests
```

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────┐
│              Frontend (Next.js)        │
├─────────────────────────────────────────┤
│  • App Router (src/app/)               │
│  • React Components (src/components/)  │
│  • Business Logic (src/lib/)           │
│  • Type Definitions (src/types/)       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           Database (Supabase)           │
├─────────────────────────────────────────┤
│  • PostgreSQL with RLS                 │
│  • Real-time subscriptions             │
│  • Row Level Security policies         │
│  • Authentication & authorization      │
└─────────────────────────────────────────┘
```

### Key Components

#### Core Business Logic (`src/lib/`)
- **`booking-logic.ts`**: Customer booking operations and validation
- **`admin-booking-logic.ts`**: Administrative booking management
- **`staff-data.ts`**: Staff capabilities and scheduling logic
- **`supabase.ts`**: Database client and query functions
- **`booking-state-manager.ts`**: Client-side booking state management

#### Database Schema (`supabase/migrations/`)
- **Services**: 44 medical spa services with pricing and requirements
- **Staff**: 4 staff members with specific capabilities and schedules
- **Rooms**: 3 treatment rooms with equipment specifications
- **Bookings**: Customer appointments with full relationship mapping
- **Admin Users**: Administrative access control

#### Security Layer
- **Authentication**: Supabase Auth with role-based access control
- **Authorization**: Middleware protection for admin routes
- **Input Validation**: Zod schemas for all user inputs
- **Database Security**: RLS policies protecting sensitive data

## Development Workflow

### Branch Strategy

#### Branch Naming Convention
```bash
# Feature branches
feature/mobile-calendar-improvements
feature/payment-system-enhancement
feature/admin-dashboard-update

# Bug fixes
fix/booking-conflict-resolution
fix/calendar-navigation-issue

# Security patches
security/authentication-hardening
security/input-validation-improvement

# Documentation updates
docs/contributing-guidelines-update
docs/security-policy-update
```

#### Workflow Steps
1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop with Testing**
   ```bash
   # Make changes
   npm run test:watch  # Keep tests running
   npm run dev        # Development server
   ```

3. **Quality Checks**
   ```bash
   npm run lint       # Code quality
   npm run build      # Production build test
   npm run test:ci    # Full test suite
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add mobile calendar navigation improvements"
   git push origin feature/your-feature-name
   ```

### Commit Message Standards

Follow conventional commits format:

```bash
# Feature additions
feat(booking): add mobile calendar week navigation
feat(admin): implement booking conflict debug tools

# Bug fixes
fix(auth): resolve admin session timeout issue
fix(ui): correct mobile calendar display on iOS

# Security improvements
security(auth): strengthen admin role validation
security(db): implement additional RLS policies

# Documentation
docs(security): update security policy guidelines
docs(api): add webhook integration documentation

# Performance improvements
perf(booking): optimize availability calculation
perf(db): improve query performance with indexes

# Refactoring
refactor(booking): consolidate validation logic
refactor(components): simplify booking state management
```

## Code Standards

### TypeScript Guidelines

#### Strict Type Safety
```typescript
// Good: Explicit types aligned with database schema
interface BookingRequest {
  service_id: string    // UUID string, not number
  staff_id: string      // UUID string, not number  
  room_id: string       // UUID string, not number
  booking_date: string  // Date string in YYYY-MM-DD format
  booking_time: string  // Time string in HH:MM format
  customer_name: string
  customer_email: string
  customer_phone: string
}

// Bad: Any types or misaligned types
interface BadBookingRequest {
  service_id: any       // Never use 'any'
  staff_id: number      // Database uses UUID strings
  appointment_date: string  // Wrong field name
}
```

#### Database Schema Alignment
```typescript
// Always align types with actual database schema
// Database uses snake_case, maintain consistency
type DatabaseBooking = {
  id: string                 // UUID string
  service_id: string         // UUID string
  staff_id: string          // UUID string
  room_id: string           // UUID string
  appointment_date: string  // Current field name (was booking_date)
  booking_time: string
  customer_name: string
  customer_email: string
  customer_phone: string
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at: string
}
```

#### Component Props Types
```typescript
// Good: Explicit component prop types
interface BookingCardProps {
  booking: DatabaseBooking
  onStatusChange: (bookingId: string, status: string) => void
  showActions?: boolean
}

export default function BookingCard({ booking, onStatusChange, showActions = true }: BookingCardProps) {
  // Component implementation
}
```

### React Component Standards

#### Component Structure
```typescript
'use client'  // Only when needed

import { useState, useEffect } from 'react'
import type { NextPage } from 'next'
import { ComponentProps } from '@/types/components'

// Props interface
interface ComponentProps {
  required: string
  optional?: boolean
}

// Main component
const Component: React.FC<ComponentProps> = ({ required, optional = false }) => {
  // Hooks
  const [state, setState] = useState<string>('')
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [])
  
  // Event handlers
  const handleClick = () => {
    // Handle events
  }
  
  // Render
  return (
    <div className="component-wrapper">
      {/* Component content */}
    </div>
  )
}

export default Component
```

#### Styling Standards
```typescript
// Use Tailwind CSS classes consistently
// Mobile-first responsive design
<div className="
  w-full 
  p-4 
  bg-white 
  rounded-lg 
  shadow-md
  sm:p-6 
  md:p-8
  lg:max-w-2xl
">
  <h2 className="
    text-lg 
    font-semibold 
    text-gray-900
    sm:text-xl
    md:text-2xl
  ">
    Component Title
  </h2>
</div>
```

### Database Interaction Standards

#### Supabase Client Usage
```typescript
import { supabaseClient } from '@/lib/supabase'

// Good: Proper error handling and type safety
async function getBookings(date: string): Promise<DatabaseBooking[]> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select(`
      id,
      service_id,
      staff_id,
      room_id,
      booking_date,
      booking_time,
      customer_name,
      customer_email,
      customer_phone,
      status,
      services(name, duration, price),
      staff(name),
      rooms(name)
    `)
    .eq('booking_date', date)
    .neq('status', 'cancelled')
    .order('booking_time')

  if (error) {
    console.error('Database error:', error)
    throw new Error('Failed to fetch bookings')
  }

  return data || []
}
```

#### RPC Function Calls
```typescript
// Good: Structured RPC calls with validation
async function validateBookingRequest(request: BookingRequest): Promise<ValidationResult> {
  const { data, error } = await supabaseClient
    .rpc('validate_booking_request_v2', {
      p_service_id: request.service_id,
      p_staff_id: request.staff_id,
      p_booking_date: request.booking_date,
      p_booking_time: request.booking_time
    })

  if (error) {
    console.error('RPC error:', error)
    return { isValid: false, errors: ['Validation failed'] }
  }

  return data
}
```

## Security Requirements

### Security-First Development

All contributions must follow security best practices outlined in [`SECURITY.md`](./SECURITY.md).

#### Input Validation
```typescript
import { z } from 'zod'

// Always validate all inputs
const bookingSchema = z.object({
  service_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  room_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/),
  customer_name: z.string().min(2).max(100),
  customer_email: z.string().email(),
  customer_phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/)
})

// Use in API routes
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = bookingSchema.parse(body)
    
    // Process validated data
  } catch (error) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }
}
```

#### Authentication Checks
```typescript
import { headers } from 'next/headers'
import { supabaseClient } from '@/lib/supabase'

// Always verify authentication for protected operations
export async function authenticatedOperation() {
  const headersList = headers()
  const authorization = headersList.get('authorization')
  
  if (!authorization) {
    throw new Error('Authentication required')
  }

  const { data: { user }, error } = await supabaseClient.auth.getUser(
    authorization.replace('Bearer ', '')
  )

  if (error || !user) {
    throw new Error('Invalid authentication')
  }

  // Check for admin role if required
  if (user.user_metadata?.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return user
}
```

#### Environment Variable Security
```typescript
// Good: Validate environment variables
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url()
})

const env = envSchema.parse(process.env)

// Bad: Direct access without validation
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL // Unsafe
```

### Security Review Checklist

Before submitting any code:

- [ ] **Input Validation**: All user inputs validated with Zod schemas
- [ ] **Authentication**: Protected routes check user authentication
- [ ] **Authorization**: Admin operations verify admin role
- [ ] **SQL Injection**: No raw SQL queries, only Supabase client calls
- [ ] **XSS Prevention**: No dangerouslySetInnerHTML without sanitization
- [ ] **Environment Variables**: All sensitive data in environment variables
- [ ] **Error Handling**: Generic error messages to users, detailed logs server-side
- [ ] **Dependencies**: No known vulnerabilities in added dependencies

## Testing Guidelines

### Test Coverage Requirements

**Minimum Coverage**: 70% across all metrics (branches, functions, lines, statements)

#### Test Structure
```
src/
├── __tests__/                 # Global tests
│   ├── booking-utils.test.ts
│   ├── env-validation.test.ts
│   └── health-check.test.ts
├── lib/
│   └── __tests__/             # Library-specific tests
│       ├── booking-logic.test.ts
│       ├── ghl-webhook-sender.test.ts
│       └── room-timeline-logic.test.ts
└── components/
    └── __tests__/             # Component tests
        ├── BookingCard.test.tsx
        └── DateTimePicker.test.tsx
```

#### Unit Test Example
```typescript
import { describe, test, expect } from '@jest/globals'
import { validateBookingTime } from '@/lib/booking-logic'

describe('validateBookingTime', () => {
  test('should accept valid booking times', () => {
    const validTime = '10:00'
    const validDate = '2025-08-15'
    
    const result = validateBookingTime(validTime, validDate)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should reject past booking times', () => {
    const pastTime = '08:00'
    const today = new Date().toISOString().split('T')[0]
    
    const result = validateBookingTime(pastTime, today)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Cannot book in the past')
  })

  test('should enforce business hours', () => {
    const earlyTime = '06:00'
    const futureDate = '2025-08-15'
    
    const result = validateBookingTime(earlyTime, futureDate)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Outside business hours')
  })
})
```

#### Component Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import BookingCard from '@/components/admin/booking-card'
import { mockBooking } from '@/test-fixtures'

describe('BookingCard', () => {
  test('renders booking information correctly', () => {
    render(<BookingCard booking={mockBooking} />)
    
    expect(screen.getByText(mockBooking.customer_name)).toBeInTheDocument()
    expect(screen.getByText(mockBooking.booking_time)).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  test('calls status change handler when status updated', () => {
    const handleStatusChange = jest.fn()
    
    render(
      <BookingCard 
        booking={mockBooking} 
        onStatusChange={handleStatusChange}
      />
    )
    
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(handleStatusChange).toHaveBeenCalledWith(mockBooking.id, 'cancelled')
  })
})
```

#### Integration Test Example
```typescript
import { describe, test, expect } from '@jest/globals'
import { createTestBooking } from '@/lib/booking-logic'
import { supabaseClient } from '@/lib/supabase'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ 
          data: [mockBooking], 
          error: null 
        }))
      }))
    }))
  }
}))

describe('createTestBooking integration', () => {
  test('should create booking with all required data', async () => {
    const bookingRequest = {
      service_id: 'service-uuid',
      staff_id: 'staff-uuid',
      room_id: 'room-uuid',
      booking_date: '2025-08-15',
      booking_time: '10:00',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '(555) 123-4567'
    }

    const result = await createTestBooking(bookingRequest)

    expect(result.success).toBe(true)
    expect(result.booking.customer_name).toBe('Test Customer')
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run CI tests (for deployment)
npm run test:ci

# Run specific test file
npm test -- booking-logic.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

## Pull Request Process

### Before Creating a PR

1. **Feature Branch Updated**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-feature
   git rebase main
   ```

2. **All Checks Pass**
   ```bash
   npm run lint     # Code quality
   npm run build    # Production build
   npm run test:ci  # Full test suite with coverage
   ```

3. **Security Validation**
   - Review changes against security checklist
   - Ensure no sensitive data exposure
   - Validate all user inputs
   - Check authentication/authorization

### PR Title and Description Format

#### PR Title Format
```
type(scope): brief description of changes

Examples:
feat(booking): add mobile calendar week navigation
fix(auth): resolve admin session timeout issue  
security(validation): strengthen input validation
docs(security): update security policy guidelines
```

#### PR Description Template
```markdown
## Summary
Brief description of what this PR accomplishes.

## Changes Made
- Detailed list of changes
- Each change should be specific
- Include technical details

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass  
- [ ] Manual testing completed
- [ ] Security testing performed

## Security Review
- [ ] Input validation implemented
- [ ] Authentication/authorization checked
- [ ] No sensitive data exposed
- [ ] Environment variables secured

## Documentation
- [ ] Code documentation updated
- [ ] README updated if needed
- [ ] API documentation updated if needed

## Deployment Impact
- [ ] No breaking changes
- [ ] Database migrations included (if needed)
- [ ] Environment variables documented (if new)

## Screenshots/Videos
(If applicable, include screenshots or videos of UI changes)
```

### Code Review Process

#### Review Criteria

1. **Code Quality**
   - TypeScript types are correct and aligned with database schema
   - Code follows established patterns and conventions
   - No code duplication or unnecessary complexity
   - Proper error handling implemented

2. **Security**
   - All inputs validated with appropriate schemas
   - Authentication/authorization checks in place
   - No sensitive data exposed in logs or errors
   - Environment variables properly used

3. **Testing**
   - Test coverage meets 70% minimum requirement
   - Tests cover both happy path and edge cases
   - Integration tests for complex workflows
   - Security-related test cases included

4. **Performance**
   - No unnecessary re-renders or computations
   - Database queries optimized
   - Appropriate loading states and error handling
   - Mobile performance considered

5. **Documentation**
   - Code is self-documenting with clear naming
   - Complex logic includes comments
   - API changes documented
   - User-facing changes documented

#### Reviewer Guidelines

As a reviewer, check:

- [ ] **Functionality**: Does the code do what it's supposed to do?
- [ ] **Security**: Are there any security vulnerabilities?
- [ ] **Performance**: Will this impact system performance?
- [ ] **Testing**: Are there adequate tests?
- [ ] **Documentation**: Is the code well-documented?
- [ ] **Standards**: Does the code follow project standards?

### Merge Requirements

Before merging, ensure:

1. ✅ **All CI checks pass**
2. ✅ **At least 2 approving reviews** (for security-critical changes)
3. ✅ **Test coverage maintained at 70%+**
4. ✅ **Security review completed** (for any user-facing changes)
5. ✅ **Documentation updated** (if applicable)
6. ✅ **No merge conflicts**

### Post-Merge Actions

After merging:

1. **Delete Feature Branch**
   ```bash
   git branch -d feature/your-feature
   git push origin --delete feature/your-feature
   ```

2. **Verify Deployment**
   - Monitor CI/CD pipeline
   - Verify changes in staging environment
   - Check for any errors or performance issues

3. **Update Documentation**
   - Update changelog if significant feature
   - Update relevant documentation files
   - Notify team of important changes

## Documentation Standards

### Code Documentation

#### Function Documentation
```typescript
/**
 * Validates booking request against business rules and availability
 * 
 * @param request - The booking request to validate
 * @param request.service_id - UUID of the service being booked
 * @param request.staff_id - UUID of the staff member
 * @param request.booking_date - Date in YYYY-MM-DD format
 * @param request.booking_time - Time in HH:MM format
 * 
 * @returns Promise<ValidationResult> - Validation result with errors if invalid
 * 
 * @throws {Error} When database connection fails
 * 
 * @example
 * ```typescript
 * const result = await validateBookingRequest({
 *   service_id: 'service-uuid',
 *   staff_id: 'staff-uuid', 
 *   booking_date: '2025-08-15',
 *   booking_time: '10:00'
 * })
 * 
 * if (!result.isValid) {
 *   console.log('Validation errors:', result.errors)
 * }
 * ```
 */
async function validateBookingRequest(request: BookingRequest): Promise<ValidationResult> {
  // Implementation
}
```

#### Component Documentation
```typescript
/**
 * BookingCard - Displays booking information with status management
 * 
 * Features:
 * - Shows customer information and appointment details
 * - Allows status changes (confirm, cancel, complete)
 * - Responsive design for mobile and desktop
 * - Accessibility compliant with ARIA labels
 * 
 * @param booking - The booking data to display
 * @param onStatusChange - Callback when booking status changes
 * @param showActions - Whether to show action buttons (default: true)
 * 
 * @example
 * ```tsx
 * <BookingCard 
 *   booking={bookingData}
 *   onStatusChange={(id, status) => updateBookingStatus(id, status)}
 *   showActions={userRole === 'admin'}
 * />
 * ```
 */
interface BookingCardProps {
  booking: DatabaseBooking
  onStatusChange: (bookingId: string, status: BookingStatus) => void
  showActions?: boolean
}
```

### API Documentation

#### API Route Documentation
```typescript
/**
 * POST /api/bookings
 * 
 * Creates a new booking appointment
 * 
 * Security:
 * - Public endpoint (no authentication required)
 * - Rate limited to prevent abuse
 * - Input validation with Zod schemas
 * 
 * Request Body:
 * ```json
 * {
 *   "service_id": "uuid",
 *   "staff_id": "uuid", 
 *   "booking_date": "YYYY-MM-DD",
 *   "booking_time": "HH:MM",
 *   "customer_name": "string",
 *   "customer_email": "email",
 *   "customer_phone": "(XXX) XXX-XXXX"
 * }
 * ```
 * 
 * Response:
 * - 201: Booking created successfully
 * - 400: Invalid input data
 * - 409: Booking conflict (time slot taken)
 * - 500: Server error
 */
export async function POST(request: Request) {
  // Implementation
}
```

### File-Level Documentation

Each significant file should have a header comment:

```typescript
/**
 * @fileoverview Booking logic and validation functions
 * 
 * This module contains the core business logic for booking operations including:
 * - Room assignment based on service requirements
 * - Staff availability checking 
 * - Booking conflict detection
 * - Business rule validation
 * 
 * Security Notes:
 * - All inputs validated with Zod schemas
 * - Database queries use parameterized statements
 * - Authentication checked for admin operations
 * 
 * @author Booking System Team
 * @version 1.2.0
 * @since 2025-01-15
 */

import { z } from 'zod'
import { supabaseClient } from './supabase'
// ... rest of file
```

## Performance Considerations

### Frontend Performance

#### Bundle Size Optimization
```typescript
// Good: Dynamic imports for large components
const AdminPanel = dynamic(() => import('@/components/admin/AdminPanel'), {
  ssr: false,
  loading: () => <div>Loading admin panel...</div>
})

// Good: Code splitting by route
const BookingConfirmation = lazy(() => import('./BookingConfirmation'))
```

#### Component Performance
```typescript
// Good: Memoize expensive calculations
const availableTimeSlots = useMemo(() => {
  return calculateAvailableSlots(selectedDate, staffAvailability)
}, [selectedDate, staffAvailability])

// Good: Prevent unnecessary re-renders
const BookingCard = memo(({ booking, onStatusChange }: BookingCardProps) => {
  return <div>Booking card content</div>
})

// Good: Optimize event handlers
const handleStatusChange = useCallback((bookingId: string, status: string) => {
  onStatusChange(bookingId, status)
}, [onStatusChange])
```

### Database Performance

#### Query Optimization
```typescript
// Good: Select only needed columns
const { data } = await supabaseClient
  .from('bookings')
  .select(`
    id,
    booking_date,
    booking_time,
    customer_name,
    status,
    services!inner(name, duration),
    staff!inner(name)
  `)
  .eq('booking_date', date)
  .order('booking_time')

// Bad: Select all columns
// .select('*')
```

#### Caching Strategy
```typescript
// Good: Cache frequently accessed data
const staffDataCache = new Map<string, StaffMember>()

async function getStaffMember(staffId: string): Promise<StaffMember> {
  if (staffDataCache.has(staffId)) {
    return staffDataCache.get(staffId)!
  }
  
  const staff = await fetchStaffMember(staffId)
  staffDataCache.set(staffId, staff)
  return staff
}
```

### Performance Testing

#### Performance Benchmarks
- **Page Load Time**: < 3 seconds on 3G connection
- **Time to Interactive**: < 4 seconds on mobile
- **Bundle Size**: < 250KB gzipped
- **Database Query Time**: < 500ms average
- **API Response Time**: < 1 second

#### Performance Monitoring
```typescript
// Good: Monitor performance in development
if (process.env.NODE_ENV === 'development') {
  const startTime = performance.now()
  
  await performExpensiveOperation()
  
  const endTime = performance.now()
  console.log(`Operation took ${endTime - startTime} milliseconds`)
}
```

---

## Questions or Need Help?

If you have questions or need assistance with contributing:

1. **Check Documentation**: Review existing documentation first
2. **Search Issues**: Look for similar questions in GitHub issues
3. **Create Issue**: Create a new issue with detailed questions
4. **Security Questions**: Email security@dermalspaguam.com for security-related questions

## Additional Resources

- **Project Documentation**: [`/docs`](./docs) folder
- **Security Policy**: [`SECURITY.md`](./SECURITY.md)
- **Testing Guide**: [`TESTING.md`](./TESTING.md)
- **Deployment Guide**: [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md)

---

**Thank you for contributing to the Dermal Spa Booking System!**

*Last Updated: August 6, 2025*