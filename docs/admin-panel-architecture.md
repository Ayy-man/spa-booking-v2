# Admin Panel Architecture

## Overview

The Dermal Skin Clinic Admin Panel is a comprehensive staff management interface designed to provide real-time visibility and control over daily operations. Built as an extension of the existing booking system, it enables staff to efficiently manage appointments, track room utilization, monitor staff schedules, and handle special customer requests.

### Purpose
- Provide real-time operational visibility for spa management
- Enable efficient resource allocation and scheduling
- Track service performance and staff productivity
- Manage special customer requests and preferences
- Support data-driven decision making

### Key Features ✅ STATUS UPDATED (July 31, 2025)
- Today's Schedule Dashboard ✅ COMPLETED
- Room Timeline Visualization ✅ COMPLETED WITH MAJOR ENHANCEMENTS
  - Enhanced drag-and-drop with visual feedback
  - Click-to-reschedule functionality
  - Fixed time label positioning
  - Improved visual hierarchy and design
- Staff Schedule Management ✅ COMPLETED
- Quick Actions for Common Tasks ✅ COMPLETED
- Service Tracking and Analytics ✅ COMPLETED
- Special Request Indicators ✅ COMPLETED

## Technical Architecture Decisions

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript
- **UI Framework**: React with Server Components
- **Styling**: Tailwind CSS for consistent design
- **Database**: Supabase (PostgreSQL)
- **Real-time Updates**: Supabase Realtime subscriptions
- **Authentication**: Supabase Auth with role-based access
- **State Management**: React Context API for global state
- **Data Fetching**: React Query for efficient caching

### Architecture Principles
1. **Real-time First**: All data updates reflect immediately across all connected clients
2. **Mobile Responsive**: Full functionality on tablets and mobile devices
3. **Performance Optimized**: Lazy loading, code splitting, and efficient queries
4. **Secure by Design**: Role-based access control at database and UI levels
5. **Offline Capable**: Basic functionality with offline support using service workers

## Component Hierarchy and Structure

```
/admin
  ├── layout.tsx (Admin Layout with Navigation)
  ├── page.tsx (Dashboard Overview)
  ├── /components
  │   ├── AdminNav.tsx
  │   ├── DashboardMetrics.tsx
  │   ├── TodaySchedule.tsx
  │   ├── RoomTimeline.tsx
  │   ├── StaffScheduleGrid.tsx
  │   ├── QuickActions.tsx
  │   ├── ServiceTracker.tsx
  │   └── SpecialRequestBadge.tsx
  ├── /schedule
  │   ├── page.tsx (Today's Schedule View)
  │   └── /[date]
  │       └── page.tsx (Date-specific Schedule)
  ├── /rooms
  │   ├── page.tsx (Room Management)
  │   └── /[roomId]
  │       └── page.tsx (Room Details)
  ├── /staff
  │   ├── page.tsx (Staff Management)
  │   └── /[staffId]
  │       └── page.tsx (Staff Details)
  ├── /analytics
  │   ├── page.tsx (Service Analytics)
  │   └── /reports
  │       └── page.tsx (Custom Reports)
  └── /settings
      └── page.tsx (Admin Settings)
```

## Data Flow and State Management

### State Management Architecture
```typescript
// Global Admin Context
interface AdminState {
  currentDate: Date
  selectedView: 'schedule' | 'rooms' | 'staff'
  filters: {
    room: number[]
    staff: number[]
    service: number[]
  }
  realTimeUpdates: boolean
}

// Real-time Subscription Management
interface RealtimeSubscriptions {
  bookings: RealtimeChannel
  staff: RealtimeChannel
  rooms: RealtimeChannel
}
```

### Data Flow Patterns
1. **Initial Load**: Server-side data fetching for SEO and performance
2. **Real-time Updates**: WebSocket subscriptions for live data
3. **Optimistic Updates**: Immediate UI updates with rollback on error
4. **Cache Management**: React Query for intelligent data caching
5. **Background Sync**: Periodic data refresh for consistency

### API Endpoints
```typescript
// Admin-specific API routes
/api/admin/dashboard - Dashboard metrics and overview
/api/admin/schedule - Daily schedule management
/api/admin/rooms/timeline - Room utilization data
/api/admin/staff/schedules - Staff scheduling
/api/admin/analytics - Service performance metrics
/api/admin/actions - Quick action handlers
```

## Security Considerations

### Authentication & Authorization
1. **Multi-level Access Control**
   - Super Admin: Full system access
   - Manager: Operational access (no settings)
   - Staff: Limited to own schedule and assigned bookings
   - Receptionist: View-only access with booking capabilities

2. **Session Management**
   - JWT tokens with 8-hour expiration
   - Refresh token rotation
   - Device fingerprinting for security
   - Automatic logout on inactivity

3. **Data Protection**
   - Row Level Security (RLS) policies
   - Encrypted sensitive data at rest
   - HTTPS-only communication
   - API rate limiting

### Security Headers
```typescript
// Security middleware configuration
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}
```

## UI/UX Design Principles

### Design Philosophy
1. **Information Density**: Maximum information with minimal cognitive load
2. **Progressive Disclosure**: Show details on demand
3. **Consistent Patterns**: Reusable UI components and interactions
4. **Accessibility First**: WCAG 2.1 AA compliance
5. **Performance Perception**: Instant feedback and loading states

### Visual Design System
```css
/* Admin Panel Color Palette */
--admin-primary: #1a73e8 (Actions)
--admin-success: #34a853 (Completed)
--admin-warning: #fbbc04 (Pending)
--admin-danger: #ea4335 (Conflicts)
--admin-neutral: #5f6368 (Secondary)
--admin-background: #f8f9fa
--admin-surface: #ffffff
```

### Responsive Breakpoints
- **Mobile**: 320px - 768px (Simplified single-column layout)
- **Tablet**: 768px - 1024px (Two-column layout)
- **Desktop**: 1024px - 1440px (Full multi-column layout)
- **Wide**: 1440px+ (Enhanced data visualization)

### Interaction Patterns ✅ ENHANCED (July 31, 2025)
1. **Drag & Drop**: For rescheduling appointments ✅ ENHANCED
   - Color-coded drop zones (green/red/blue feedback)
   - Room compatibility highlighting
   - Improved validation and visual feedback
2. **Click-to-Reschedule**: Double-click for quick reschedule ✅ NEW FEATURE
   - Quick action buttons for common reschedule operations
   - Available time slots grid with room availability
   - Integrated validation for room constraints
3. **Inline Editing**: Quick updates without navigation ✅ COMPLETED
4. **Keyboard Navigation**: Full keyboard accessibility ✅ COMPLETED
5. **Touch Gestures**: Swipe actions on mobile ✅ COMPLETED
6. **Context Menus**: Right-click for power users ✅ COMPLETED

## Performance Optimizations

### Frontend Optimizations
- Code splitting by route
- Lazy loading of heavy components
- Virtual scrolling for large lists
- Debounced search and filters
- Memoization of expensive calculations

### Database Optimizations
- Indexed columns for common queries
- Materialized views for analytics
- Connection pooling
- Query result caching
- Batch operations for bulk updates

### Caching Strategy
```typescript
// Cache configuration
{
  staticAssets: "max-age=31536000",
  apiResponses: "max-age=300, stale-while-revalidate=600",
  realtimeData: "no-cache",
  userSpecific: "private, max-age=3600"
}
```

## Integration Points

### Existing System Integration
- Shared authentication with main booking system
- Reuse of existing database schema
- Common UI components and design system
- Shared business logic and validation rules

### Future Integration Capabilities
- Email/SMS notification system
- Payment processing integration
- Third-party calendar sync (Google, Outlook)
- Accounting software export
- Marketing automation webhooks

## Development Guidelines

### Code Organization
- Feature-based folder structure
- Shared components in common directory
- Type definitions in dedicated files
- Utility functions in lib directory
- Tests colocated with components

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Visual regression testing
- Performance benchmarking

### Deployment Process
- Feature branch development
- Pull request reviews
- Automated testing pipeline
- Staging environment validation
- Blue-green production deployment