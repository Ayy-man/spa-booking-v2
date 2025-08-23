# Drag-and-Drop Rescheduling Feature

## Overview
The admin panel now supports drag-and-drop rescheduling of appointments directly on the Staff Schedule View. Admin staff can simply drag a booking card to a new time slot or different staff member to reschedule appointments.

## Features

### 1. Visual Drag-and-Drop
- **Drag booking cards** from one time slot to another
- **Visual feedback** with opacity changes while dragging
- **Drop zone highlighting** shows valid drop targets in blue
- **"Drop here" indicator** appears when hovering over valid slots

### 2. Smart Validation
- **Prevents dragging to occupied slots** - Shows error if slot is taken
- **Couples booking protection** - Couples bookings cannot be dragged (must use Reschedule button)
- **Status validation** - Cannot drag completed, cancelled, or no-show bookings
- **2-hour advance notice** - Enforces minimum booking notice requirement
- **Reschedule limit** - Warns when approaching the 3-reschedule maximum

### 3. Staff Reassignment
- **Drag between staff columns** to reassign to different staff member
- **Staff availability check** - Validates staff is working and available
- **Service capability validation** - Ensures new staff can perform the service
- **Combined operation** - Handles both time change and staff change in one action

### 4. Confirmation Dialog
Shows a detailed confirmation before making changes:
- Current appointment details (customer, service, time, staff)
- New appointment details (date, time, staff)
- Visual indicators for staff changes
- Warning if booking has been rescheduled multiple times

### 5. Success Feedback
- **Success notification** appears after successful reschedule
- **Auto-refresh** of schedule to show updated position
- **Error messages** for any issues during reschedule

## How to Use

### Basic Drag-and-Drop
1. Navigate to Admin → Staff Schedule View
2. Click and hold on any booking card
3. Drag to a new time slot (empty slot will highlight in blue)
4. Drop the booking in the new slot
5. Review the confirmation dialog
6. Click "Confirm Reschedule" to save changes

### Cross-Staff Rescheduling
1. Drag a booking from one staff member's column
2. Drop it in another staff member's column at desired time
3. System will handle both staff reassignment and time change

## Limitations

### Cannot Drag
- **Couples bookings** - Must use Reschedule button (prevents room conflicts)
- **Completed bookings** - Already finished
- **Cancelled bookings** - No longer active
- **No-show bookings** - Customer didn't arrive
- **Past time slots** - Cannot reschedule to the past
- **Bookings at max reschedule limit** (3 times)

### Visual Indicators
- **Draggable bookings** - Normal cursor, can be picked up
- **Non-draggable bookings** - Shows couples indicator or status prevents dragging
- **Valid drop zones** - Blue highlight with "Drop here" text
- **Invalid drop zones** - No highlight, drop will be rejected

## Technical Implementation

### Components Modified
- `/src/components/admin/StaffScheduleView.tsx` - Main drag-drop logic
- `/src/types/booking.ts` - Added reschedule tracking fields

### Key Functions
- `handleDragStart` - Validates booking can be dragged
- `handleDrop` - Validates drop target and shows confirmation
- `handleConfirmReschedule` - Executes the reschedule via API
- `handleDragEnd` - Resets visual states

### API Integration
- Uses existing `/api/admin/bookings/[id]/reschedule` endpoint
- Optionally uses `/api/admin/bookings/[id]/reassign-staff` for staff changes
- Validates eligibility before allowing reschedule
- Handles couples bookings as a group

## Security

- **Authentication required** - Uses admin session token
- **Permission validation** - Only admin users can reschedule
- **Conflict prevention** - Checks for double-booking
- **Audit trail** - All reschedules are logged in database

## Best Practices

1. **Always verify** the confirmation dialog details before confirming
2. **Check availability** - Ensure the new slot is truly available
3. **Consider couples bookings** - Use Reschedule button for these
4. **Note reschedule count** - Be aware of bookings near their limit
5. **Communicate changes** - Inform customers of significant changes

## Troubleshooting

### Booking won't drag
- Check if it's a couples booking (purple badge)
- Verify booking status is draggable
- Ensure you're logged in as admin

### Drop zone not highlighting
- Staff may not be working that day
- Time slot may be in the past
- Slot may already have a booking

### Reschedule fails
- Check for staff/room conflicts
- Verify 2-hour advance notice
- Check reschedule count limit
- Ensure proper admin authentication