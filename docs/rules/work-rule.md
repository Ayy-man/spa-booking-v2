# Work Rule - How to Build the Dermal Booking System

You are building a booking system for a medical spa. Always follow these rules:

## MCP Server Access
**IMPORTANT**: You have access to a Supabase MCP server that is already configured and connected to:
- URL: https://doradsvnphdwotkeiylv.supabase.co
- All credentials are configured in mcp-config.json
- You can directly query, insert, and update the database

**Use the MCP server for:**
- Creating database tables and schema
- Inserting initial data (services, staff, rooms)
- Querying availability and bookings
- Testing database operations
- Real-time data validation

## Context Usage
1. **Always keep loaded:**
   - work-rule.md (this file)
   - Current implementation task
   - business-logic.md (for room/staff rules)

2. **Load when needed:**
   - staff-room-matrix.md (for staff assignments)
   - design-system.md (for UI work)
   - supabase-setup-rule.md (for database setup)
   - Specific component files

## Development Process
1. **Check implementation-plan.md** for current stage
2. **Reference project-structure.md** before creating files
3. **Follow ui-ux-documentation.md** for all UI decisions
4. **Log issues in bug-tracking.md**
5. **Use MCP server for all database operations**

## Business Logic Priorities
1. **Room assignment is critical** - never double-book
2. **Staff capabilities must be checked** - see staff-room-matrix.md
3. **Service durations include 15min buffer**
4. **Couples bookings prefer Room 3**

## Code Standards
1. Use TypeScript for all files
2. Component names: PascalCase
3. Functions: camelCase
4. Clear comments for business logic
5. Test room assignment algorithm thoroughly

## Database Schema (Supabase) - Use MCP to Create
```sql
-- services table
id, name, duration, price, category, requires_couples_room, requires_body_scrub_room

-- staff table  
id, name, email, phone, can_perform_services[], default_room, schedule

-- rooms table
id, name, capacity, capabilities[]

-- bookings table
id, service_id, staff_id, room_id, customer_name, customer_email, 
customer_phone, booking_date, start_time, end_time, status, 
special_requests, created_at
```

## UI Implementation
- Mobile-first responsive design
- Use Shadcn/ui components
- Apply custom color palette
- Clear CTAs with black buttons
- Show available times, not calendar

## Testing Checklist
- [ ] Room assignment works correctly
- [ ] Staff capabilities enforced
- [ ] No double bookings
- [ ] Couples services get right rooms
- [ ] Body scrubs only in Room 3

## Error Handling
- Validate all inputs
- Show clear error messages
- Handle network failures gracefully
- Log errors for debugging

## Performance
- Optimize database queries
- Use proper loading states
- Minimize bundle size
- Cache frequently used data

## Security
- Validate all inputs server-side
- Use Row Level Security in Supabase
- Sanitize user data
- Protect against SQL injection

## Accessibility
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers

## Mobile Optimization
- Touch-friendly targets (44px minimum)
- Responsive layouts
- Fast loading on mobile
- Swipe gestures where appropriate

## Business Rules to Always Follow
1. **Body Scrub Services**: Only Room 3
2. **Couples Services**: Room 3 preferred, then Room 2
3. **Staff Availability**: Check schedules before booking
4. **Buffer Time**: 15 minutes between appointments
5. **Operating Hours**: 9 AM - 7 PM
6. **Advance Booking**: Maximum 30 days

## MCP Database Operations
When working with the database:
1. **Always use the MCP server** - don't manually write SQL
2. **Test queries first** - verify data structure
3. **Handle errors gracefully** - provide clear feedback
4. **Use transactions** - for complex operations
5. **Validate business rules** - check room/staff availability

## When Stuck
1. Check business-logic.md for rules
2. Review staff-room-matrix.md for capabilities
3. Test with simple scenarios first
4. Log issues in bug-tracking.md
5. Use MCP server to query database state
6. Ask for clarification on complex rules

## Success Criteria
- All 50+ services bookable
- Room assignment works perfectly
- Staff availability enforced
- Mobile responsive
- Fast and reliable
- Professional appearance
- Database operations via MCP 