# 📋 Spa Booking Flow Documentation

## Overview
The booking system supports two distinct flows:
1. **SINGLE BOOKING** - One person booking one service
2. **COUPLES BOOKING** - Two people booking services together

## 🟢 SINGLE BOOKING FLOW

### Step-by-Step Pages:

1. **Service Selection** (`/booking`)
   - User selects ONE service
   - Booking type is set to `'single'`
   - State saved: `{ bookingType: 'single', service }`

2. **Date & Time Selection** (`/booking/date-time`)
   - User selects appointment date and time
   - State saved: `{ ...state, date, time }`

3. **Staff Selection** (`/booking/staff`)
   - User selects ONE staff member or "Any Available"
   - State saved: `{ ...state, staff }`

4. **Customer Information** (`/booking/customer-info`)
   - User enters contact details
   - State saved: `{ ...state, customer }`

5. **Payment Selection** (`/booking/payment-selection`)
   - Existing customers choose deposit or pay-on-location
   - New customers go directly to deposit payment

6. **Confirmation** (`/booking/confirmation`)
   - Booking is created in database
   - Confirmation shown to user
   - Email/SMS sent

### Single Booking State Structure:
```typescript
{
  bookingType: 'single',
  service: {
    id: 'deep_cleansing_facial',
    name: 'Deep Cleansing Facial',
    duration: 60,
    price: 79
  },
  date: '2025-08-15',
  time: '14:00',
  staff: {
    id: 'selma_davis',
    name: 'Selma Davis'
  },
  customer: {
    name: 'Jane Smith',
    email: 'jane@email.com',
    phone: '555-0123',
    isNewCustomer: false
  }
}
```

## 💑 COUPLES BOOKING FLOW

### Step-by-Step Pages:

1. **Service Selection** (`/booking`)
   - User explicitly chooses "Couples Booking" option
   - Selects services for both people (same or different)
   - Booking type is set to `'couples'`
   - State saved: `{ bookingType: 'couples', service, secondaryService }`

2. **Date & Time Selection** (`/booking/date-time`)
   - User selects appointment date and time (same for both)
   - State saved: `{ ...state, date, time }`

3. **Staff Selection** (`/booking/staff-couples`)
   - User selects staff for Person 1
   - User selects staff for Person 2 (can be same if available)
   - State saved: `{ ...state, staff, secondaryStaff }`

4. **Customer Information** (`/booking/customer-info`)
   - User enters contact details (one person books for both)
   - State saved: `{ ...state, customer }`

5. **Confirmation** (`/booking/confirmation-couples`)
   - TWO bookings created in database (linked by booking_group_id)
   - Couples confirmation shown
   - Email/SMS sent

### Couples Booking State Structure:
```typescript
{
  bookingType: 'couples',
  service: {
    id: 'deep_cleansing_facial',
    name: 'Deep Cleansing Facial',
    duration: 60,
    price: 79
  },
  secondaryService: {
    id: 'hot_stone_massage',
    name: 'Hot Stone Massage',
    duration: 60,
    price: 90
  },
  date: '2025-08-15',
  time: '14:00',
  staff: {
    id: 'selma_davis',
    name: 'Selma Davis'
  },
  secondaryStaff: {
    id: 'tanisha_brown',
    name: 'Tanisha Brown'
  },
  customer: {
    name: 'Jane Smith',
    email: 'jane@email.com',
    phone: '555-0123',
    isNewCustomer: false
  }
}
```

## 🚦 ROUTING LOGIC

### Key Decision Points:

1. **After Service Selection**
   - Check `bookingState.bookingType`
   - Always proceed to `/booking/date-time`

2. **After Date/Time Selection**
   - If `bookingType === 'single'` → `/booking/staff`
   - If `bookingType === 'couples'` → `/booking/staff-couples`

3. **After Staff Selection**
   - Both flows → `/booking/customer-info`

4. **After Customer Info**
   - If new customer → Payment gateway
   - If existing customer AND `bookingType === 'single'` → `/booking/payment-selection`
   - If existing customer AND `bookingType === 'couples'` → `/booking/confirmation-couples`

5. **After Payment Selection** (single only)
   - → `/booking/confirmation`

## ❌ COMMON ROUTING ERRORS TO PREVENT

1. **Single booking going to `/booking/staff-couples`**
   - Add validation: Redirect to `/booking/staff` if `bookingType === 'single'`

2. **Single booking going to `/booking/confirmation-couples`**
   - Add validation: Redirect to `/booking/confirmation` if `bookingType === 'single'`

3. **Couples booking going to `/booking/staff`**
   - Add validation: Redirect to `/booking/staff-couples` if `bookingType === 'couples'`

4. **Missing secondaryService for couples**
   - Validation: Couples booking MUST have secondaryService

5. **Missing secondaryStaff for couples**
   - Validation: Couples booking MUST have secondaryStaff

## 🛡️ SAFEGUARDS

Each page should implement these checks:

```typescript
// On staff-couples page
if (bookingState.bookingType !== 'couples') {
  redirect('/booking/staff')
}

// On confirmation-couples page
if (bookingState.bookingType !== 'couples') {
  redirect('/booking/confirmation')
}

// On regular staff page
if (bookingState.bookingType === 'couples') {
  redirect('/booking/staff-couples')
}

// On regular confirmation page
if (bookingState.bookingType === 'couples') {
  redirect('/booking/confirmation-couples')
}
```

## 📊 STATE VALIDATION

### Required Fields by Step:

**Step 1 - After Service Selection:**
- `bookingType` (required)
- `service` (required)
- `secondaryService` (required if couples)

**Step 2 - After Date/Time:**
- All from Step 1 +
- `date` (required)
- `time` (required)

**Step 3 - After Staff:**
- All from Step 2 +
- `staff` (required)
- `secondaryStaff` (required if couples)

**Step 4 - After Customer Info:**
- All from Step 3 +
- `customer` (required)

## 🔄 STATE PERSISTENCE

- Use `sessionStorage` for temporary storage during booking
- Use `localStorage` only for recovery after payment redirect
- Clear all booking state after successful confirmation
- Implement state recovery for payment returns

## ✅ SUCCESS CRITERIA

A booking flow is successful when:
1. User completes all steps without routing errors
2. Correct confirmation page is shown based on booking type
3. Database receives correct booking data
4. No service/staff data corruption occurs
5. State remains consistent throughout the flow