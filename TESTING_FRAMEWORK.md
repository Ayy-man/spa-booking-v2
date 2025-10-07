# Comprehensive Testing Framework for Spa Booking System v2.3.0

## Overview
This document provides a structured 20-step testing framework to validate all functionality of the Dermal Spa Booking System. Each test is designed to verify specific features, business rules, and edge cases.

---

## 🧪 Customer Booking Flow Tests (Steps 1-8)

### Step 1: Book Single Facial Service
**Objective**: Test standard single-person booking flow
- **Service**: Deep Cleansing Facial (60 min, $150)
- **Staff**: Select Selma
- **Date**: Any Tuesday (her working day)
- **Time**: 10:00 AM
- **Expected Result**: ✅ Booking confirmed, Room 1 assigned

### Step 2: Book Couples Massage
**Objective**: Test couples booking with room requirements
- **Service**: Swedish Massage - Couples (60 min, $240 total)
- **Staff**: Select different staff for each person
- **Date**: Any weekday
- **Time**: 2:00 PM
- **Expected Result**: ✅ Booking confirmed, Room 3 assigned (couples room)

### Step 3: Book Body Scrub Treatment
**Objective**: Test Room 3 requirement for body scrub services
- **Service**: Full Body Scrub (90 min, $200)
- **Staff**: Any available
- **Date**: Any weekday
- **Time**: 11:00 AM
- **Expected Result**: ✅ Booking confirmed, Room 3 automatically assigned

### Step 4: Book Waxing with Waiver
**Objective**: Test waiver requirement flow
- **Service**: Brazilian Wax (45 min, $75)
- **Staff**: Tanisha
- **Date**: Any Monday, Wednesday, or Friday
- **Time**: 3:00 PM
- **Expected Result**: ✅ Waiver form displayed, booking confirmed after acceptance

### Step 5: Book Service with Add-ons
**Objective**: Test add-on selection and pricing
- **Service**: Signature Facial (75 min, $175)
- **Add-ons**: 
  - Dermaplaning ($50)
  - LED Therapy ($30)
- **Staff**: Selma
- **Expected Result**: ✅ Total price $255, add-ons saved with booking

### Step 6: Book Consultation Service
**Objective**: Test consultation booking with on-site pricing
- **Service**: Skin Consultation (30 min)
- **Staff**: Any available
- **Expected Result**: ✅ Shows "Pricing determined on-site", no payment required

### Step 7: Book on Sunday
**Objective**: Test Sunday-specific staff availability
- **Service**: Deep Tissue Massage (90 min, $180)
- **Date**: Any Sunday
- **Staff Options**: Should only show Leonel and Phuong
- **Expected Result**: ✅ Only Sunday-available staff shown

### Step 8: Book at Closing Time
**Objective**: Test last booking slot validation
- **Service**: Express Facial (30 min, $75)
- **Time**: 6:30 PM (last slot)
- **Expected Result**: ✅ Booking allowed (ends at 7:00 PM)
- **Test**: Try 6:45 PM
- **Expected Result**: ❌ Blocked (would end after closing)

---

## 👥 Staff Availability Tests (Steps 9-11)

### Step 9: Test Working Status
**Objective**: Verify immediate booking for "Working" staff
- **Admin Action**: Set Selma to "Working" status
- **Customer Action**: Book appointment 1 hour from now
- **Expected Result**: ✅ Booking allowed (only 2-hour standard notice required)

### Step 10: Test On-Call Status
**Objective**: Test advance notice requirements
- **Admin Action**: Set Robyn to "On-Call" with 4-hour notice
- **Test A**: Book 2 hours from now
  - **Expected Result**: ❌ Blocked (needs 4 hours notice)
- **Test B**: Book 5 hours from now
  - **Expected Result**: ✅ Booking allowed

### Step 11: Test Off Status
**Objective**: Verify complete booking block
- **Admin Action**: Set Tanisha to "Off" status
- **Customer Action**: Try to book any time
- **Expected Result**: ❌ Tanisha not shown in available staff list

---

## 🔧 Admin Panel Tests (Steps 12-16)

### Step 12: Admin Login
**Objective**: Test authentication system
- **URL**: /admin/login
- **Credentials**: 
  - Email: admin@demo-spa.com
  - Password: [from environment variable]
- **Expected Result**: ✅ Redirected to admin dashboard
- **Session Test**: Refresh page, should remain logged in

### Step 13: Create Walk-in
**Objective**: Test walk-in creation and assignment
- **Admin Panel**: Today's Schedule → Create Walk-in
- **Customer Name**: John Walk-in
- **Phone**: (671) 555-1234
- **Service**: Express Facial
- **Assign**: Available staff member
- **Expected Result**: ✅ Walk-in created and shown in schedule

### Step 14: Quick Add Appointment
**Objective**: Test quick appointment creation
- **Location**: Staff Schedule View
- **Action**: Click "Quick Add" button
- **Fill**: 
  - Customer: Jane Quick
  - Service: Relaxation Massage
  - Time: Next available slot
- **Expected Result**: ✅ Appointment created without full booking flow

### Step 15: Reschedule Booking
**Objective**: Test reschedule limits and validation
- **Find**: Any existing booking
- **Action**: Click "Reschedule"
- **Test A**: Reschedule to 1 hour from now
  - **Expected Result**: ❌ Needs 2-hour notice
- **Test B**: Reschedule 3 times
  - **Expected Result**: ❌ Maximum reschedules reached after 3rd

### Step 16: Cancel Booking
**Objective**: Test cancellation with tracking
- **Find**: Any confirmed booking
- **Action**: Click "Cancel"
- **Reason**: "Customer request"
- **Expected Result**: ✅ Status changed to "cancelled", reason saved

---

## 🚫 Edge Cases & Validation Tests (Steps 17-20)

### Step 17: Test Room Conflicts
**Objective**: Prevent double-booking
- **Existing Booking**: Room 2, 2:00 PM, Facial
- **New Attempt**: Same room, same time, different service
- **Expected Result**: ❌ "Room already booked at this time"

### Step 18: Test Staff Capabilities
**Objective**: Enforce staff service restrictions
- **Test A**: Book Dermaplaning with Robyn
  - **Expected Result**: ❌ Service not available (Robyn can't do dermaplaning)
- **Test B**: Book Dermaplaning with Selma
  - **Expected Result**: ✅ Booking allowed

### Step 19: Test Phone Validation
**Objective**: Validate phone number formats
- **Test A**: Enter "(671) 123-4567"
  - **Expected Result**: ✅ Accepted and formatted
- **Test B**: Enter "123-4567" (no area code)
  - **Expected Result**: ✅ Accepted for Guam local number
- **Test C**: Enter "123"
  - **Expected Result**: ❌ "Phone number too short"
- **Test D**: Enter "abcdefgh"
  - **Expected Result**: ❌ Invalid characters removed

### Step 20: Test Business Rules
**Objective**: Validate all business constraints
- **Test A**: Book at 8:00 AM (before opening)
  - **Expected Result**: ❌ "Cannot book before 9:00 AM"
- **Test B**: Book at 7:30 PM (after closing)
  - **Expected Result**: ❌ "Cannot book after 7:00 PM"
- **Test C**: Book 45 days in advance
  - **Expected Result**: ❌ "Cannot book more than 30 days in advance"
- **Test D**: Book for yesterday
  - **Expected Result**: ❌ "Cannot book past dates"

---

## 📊 Test Execution Checklist

### Pre-Test Setup
- [ ] Database is clean or in known state
- [ ] All staff schedules configured
- [ ] Services and rooms active
- [ ] Admin credentials available

### Customer Flow (Steps 1-8)
- [ ] Step 1: Single facial booking
- [ ] Step 2: Couples massage booking  
- [ ] Step 3: Body scrub (Room 3)
- [ ] Step 4: Waxing with waiver
- [ ] Step 5: Service with add-ons
- [ ] Step 6: Consultation booking
- [ ] Step 7: Sunday booking
- [ ] Step 8: Closing time booking

### Staff Availability (Steps 9-11)
- [ ] Step 9: Working status
- [ ] Step 10: On-call status
- [ ] Step 11: Off status

### Admin Panel (Steps 12-16)
- [ ] Step 12: Admin login
- [ ] Step 13: Create walk-in
- [ ] Step 14: Quick add
- [ ] Step 15: Reschedule
- [ ] Step 16: Cancel booking

### Edge Cases (Steps 17-20)
- [ ] Step 17: Room conflicts
- [ ] Step 18: Staff capabilities
- [ ] Step 19: Phone validation
- [ ] Step 20: Business rules

---

## 🔍 Expected Test Results Summary

### Success Metrics
- **Booking Success Rate**: >95% for valid bookings
- **Validation Accuracy**: 100% for business rules
- **Room Assignment**: 100% correct based on service type
- **Staff Filtering**: 100% accurate based on capabilities
- **Add-on Calculations**: 100% accurate pricing

### Common Issues to Watch
1. **Timezone Issues**: All times should be in Guam time (ChST/UTC+10)
2. **Buffer Time**: 15-minute buffer between appointments
3. **Couples Booking**: Should use single slot to prevent conflicts
4. **Phone Format**: Must handle (671) area code correctly
5. **Session Timeout**: Admin session should last 24 hours

---

## 📝 Test Data Reference

### Test Customers
- **Single**: Sarah Test (sarah@test.com, (671) 555-0001)
- **Couples**: John & Jane Couple (couple@test.com, (671) 555-0002)
- **Walk-in**: Walk-in Customer (no email, (671) 555-0003)

### Test Services by Category
**Facials**: Deep Cleansing, Signature, Express
**Massages**: Swedish, Deep Tissue, Relaxation
**Body Treatments**: Full Body Scrub, Body Wrap
**Waxing**: Brazilian, Full Leg, Bikini
**Consultations**: Skin Consultation, Treatment Planning

### Staff Availability Matrix
| Staff | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-------|-----|-----|-----|-----|-----|-----|-----|
| Selma | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Tanisha | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Robyn | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leonel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Phuong | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Running the Tests

### Manual Testing
1. Start with a clean database or known state
2. Follow each step in order
3. Document any deviations from expected results
4. Take screenshots of errors for debugging

### Automated Testing (Future)
```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:booking
npm run test:admin
npm run test:validation
```

---

## 📞 Support

For issues during testing:
- **Technical Issues**: Check error logs in browser console
- **Database Issues**: Verify Supabase connection
- **Authentication Issues**: Check environment variables
- **Business Logic Questions**: Refer to BUSINESS_RULES.md

---

**Last Updated**: January 2025
**Version**: 2.3.0
**Test Framework Version**: 1.0