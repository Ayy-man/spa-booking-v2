# Generate Rule - Dermal Booking System

You are tasked with converting the PRD into comprehensive documentation files. Follow these steps:

## 1. Read the PRD thoroughly

## 2. Generate the following files:

### implementation-plan.md
Create a detailed step-by-step plan with:
- Stage 1: Project Setup (Next.js, Supabase, Tailwind)
- Stage 2: Database Setup with MCP (Create schema and populate data)
- Stage 3: HTML Prototype (all booking screens)
- Stage 4: Design Implementation (using our color palette)
- Stage 5: Component Development (service selector, date picker, etc.)
- Stage 6: Business Logic (room assignment, staff matching)
- Stage 7: Database Integration (Supabase via MCP)
- Stage 8: Testing & Refinement

Each stage should have:
- Clear objectives
- Specific tasks with checkboxes
- Estimated time
- Dependencies
- MCP server integration points

### project-structure.md
Define the complete file structure:
```
src/
app/
page.tsx (landing)
booking/
page.tsx
components/
components/
ServiceSelector.tsx
DateTimePicker.tsx
StaffSelector.tsx
BookingConfirmation.tsx
lib/
supabase.ts (MCP integration)
booking-logic.ts
types.ts
styles/
```

### ui-ux-documentation.md
Document all UI components and user flows:
- Service selection interface
- Date/time picker design
- Staff preference selector
- Confirmation screens
- Loading states
- Error handling
- MCP data integration points

Include our color palette:
- Primary: #C36678
- Primary Dark: #AA3B50
- Background: #F8F8F8
- Accent: #F6C7CF

### bug-tracking.md
Create a template for tracking issues:
- Bug ID
- Description
- Steps to reproduce
- Expected vs Actual behavior
- Priority
- Status
- MCP-related issues

## 3. Ensure all files reference business-logic.md for spa-specific rules

## 4. Keep language simple and implementation-focused

## 5. Focus on the customer-facing booking flow first

## 6. Include mobile-first responsive design

## 7. Reference the staff-room-matrix.md for complex business rules

## 8. Create practical, actionable documentation that can be used immediately

## 9. MCP Server Integration
- **Database Operations**: All database work should use MCP server
- **Schema Creation**: Use MCP to create tables and insert data
- **Data Validation**: Use MCP for real-time business rule validation
- **Testing**: Use MCP to test all booking scenarios
- **Error Handling**: MCP provides clear error messages for debugging

## 10. MCP Capabilities to Leverage
- Direct database access without manual SQL
- Real-time data validation
- Automated testing of business logic
- Performance optimization through MCP queries
- Error handling and debugging support 