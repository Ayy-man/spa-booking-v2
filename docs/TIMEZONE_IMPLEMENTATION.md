# Timezone Implementation Documentation

## Overview
All times in the Dermal Skin Clinic booking system operate in **Guam Time (UTC+10/ChST)**.

## Key Components

### 1. Centralized Timezone Module
**File:** `/src/lib/timezone-utils.ts`

This module provides all timezone-related utilities:
- `GUAM_TIMEZONE = 'Pacific/Guam'`
- `getGuamTime()` - Returns current time in Guam
- `toGuamTime()` - Converts any date to Guam timezone
- `getGuamDateString()` - Returns YYYY-MM-DD in Guam time
- `getGuamTimeString()` - Returns HH:mm in Guam time
- `createGuamDateTime()` - Creates Date object in Guam timezone
- `formatGuamTime()` - Formats date/time for display
- `getGuamStartOfDay()` - Gets start of day in Guam time
- `getGuamEndOfDay()` - Gets end of day in Guam time

### 2. Business Hours Configuration
```typescript
BUSINESS_HOURS = {
  OPEN: 9,      // 9:00 AM Guam time
  CLOSE: 19,    // 7:00 PM Guam time  
  MINIMUM_ADVANCE_HOURS: 2  // 2-hour advance booking
}
```

### 3. 2-Hour Advance Booking Rule

#### Implementation
- `isTimeSlotBookable(slotTime)` - Checks if slot meets 2-hour requirement
- `getMinBookingTime()` - Returns earliest bookable time (now + 2 hours)

#### Enforcement Points
1. **Frontend Date/Time Selection** (`/src/app/booking/date-time/page.tsx`)
   - Filters out time slots that don't meet 2-hour requirement
   - Shows message when no slots available due to timing

2. **Booking Logic** (`/src/lib/booking-logic.ts`)
   - `generateTimeSlots()` filters slots based on advance booking
   - Validation in `validateBookingTime()`

3. **API Endpoints**
   - Walk-ins use `getGuamTime()` for check-in timestamps
   - Daily reports filter using Guam day boundaries

### 4. Database Integration

#### Timestamp Storage
- All timestamps stored in UTC in database
- Converted to/from Guam time at application layer

#### Key Queries Updated
- Walk-ins filtering: Uses `getGuamStartOfDay()` and `getGuamEndOfDay()`
- Booking creation: Uses `getGuamTime().toISOString()`
- Daily reports: Scheduled for 6 PM Guam time

### 5. Environment Configuration
```env
NEXT_PUBLIC_TIMEZONE="Pacific/Guam"
TZ="Pacific/Guam"
```

## Usage Examples

### Check if time slot is bookable
```typescript
import { isTimeSlotBookable, createGuamDateTime } from '@/lib/timezone-utils'

const slotDateTime = createGuamDateTime('2025-08-21', '14:00')
if (isTimeSlotBookable(slotDateTime)) {
  // Slot is at least 2 hours in the future
}
```

### Get current Guam time
```typescript
import { getGuamTime, formatGuamTime } from '@/lib/timezone-utils'

const now = getGuamTime()
console.log(formatGuamTime(now)) // "Aug 21, 2025 9:48 AM"
```

### Filter today's bookings
```typescript
import { getGuamStartOfDay, getGuamEndOfDay } from '@/lib/timezone-utils'

const today = new Date()
const startOfDay = getGuamStartOfDay(today)
const endOfDay = getGuamEndOfDay(today)

// Query bookings between these times
```

## Testing Checklist

### Booking Flow
- [ ] At 9:48 AM Guam time, earliest slot shows 11:48 AM or later
- [ ] Time slots properly filtered based on 2-hour rule
- [ ] Message shown when no slots available due to timing

### Admin Panel
- [ ] Times display in Guam timezone
- [ ] Daily reports run at 6 PM Guam time
- [ ] Walk-in timestamps show correct Guam time

### Edge Cases
- [ ] Booking across day boundaries works correctly
- [ ] Weekend bookings respect timezone
- [ ] DST transitions handled (Guam doesn't observe DST)

## Common Issues & Solutions

### Issue: Times showing in wrong timezone
**Solution:** Ensure all time operations use timezone-utils functions

### Issue: 2-hour rule not enforced
**Solution:** Check that `isTimeSlotBookable()` is called before displaying slots

### Issue: Database times incorrect
**Solution:** Always use `.toISOString()` when saving to database

## Migration Notes
When migrating from mixed timezone usage:
1. Replace all `new Date()` with `getGuamTime()`
2. Replace date formatting with `getGuamDateString()` or `formatGuamTime()`
3. Update queries to use `getGuamStartOfDay()` and `getGuamEndOfDay()`
4. Test thoroughly at different times of day