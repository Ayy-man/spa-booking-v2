# 🧪 **Comprehensive Test Cases - Medical Spa Booking System**

## **Current Room Logic Summary**

### **Room Configuration:**
- **Room 1**: Single occupancy (capacity: 1), Default for Selma
- **Room 2**: Couples room (capacity: 2), Default for Tanisha  
- **Room 3**: Premium couples room (capacity: 2), Default for Robyn, **ONLY room with body scrub equipment**

### **Room Assignment Rules:**
1. **Body Scrub Services** → Room 3 ONLY (specialized equipment required)
2. **Couples Services** → Room 3 (preferred) → Room 2 (fallback) → Never Room 1
3. **Single Services** → Staff's default room → Any available room (smaller rooms preferred)
4. **Overflow Handling** → Dynamic assignment when preferred rooms unavailable

---

## **🧪 TEST CASE 1: Body Scrub Room Logic**

### **Scenario**: Dead Sea Salt Body Scrub Booking
**Service**: Dead Sea Salt Body Scrub (30 min, $65)
**Expected Room**: Room 3 ONLY
**Test Steps**:
1. Select "Dead Sea Salt Body Scrub" service
2. Choose any date (except Sunday - Leonel only)
3. Select any staff (except Leonel - massage only)
4. **Expected Result**: System should automatically assign Room 3
5. **Validation**: Check booking confirmation shows Room 3

### **Test Variations**:
- Try with different staff members (Selma, Robyn, Tanisha)
- Try on different days of the week
- **Expected**: Always Room 3, regardless of staff or day

---

## **🧪 TEST CASE 2: Couples Service Room Logic**

### **Scenario A**: Couples Massage Package
**Service**: Balinese Body Massage + Basic Facial Package (90 min, $130)
**Expected Room Priority**: Room 3 → Room 2 → Error if both unavailable

### **Test Steps**:
1. Select couples package service
2. Choose date and time
3. Select "Any Available Staff" or specific staff
4. **Expected Result**: Room 3 assigned first, Room 2 as fallback
5. **Validation**: Should never assign Room 1

### **Scenario B**: Test Room 1 Rejection for Couples
**Service**: Any couples service
**Test**: Try to manually select Room 1
**Expected Result**: System should reject and show error "Couples services require Room 2 or Room 3"

---

## **🧪 TEST CASE 3: Staff Default Room Assignment**

### **Scenario A**: Selma's Default Room
**Staff**: Selma Villaver
**Service**: Basic Facial (30 min, $65)
**Expected Room**: Room 1 (her default)
**Test Steps**:
1. Select facial service
2. Choose Selma specifically
3. **Expected Result**: Room 1 automatically assigned

### **Scenario B**: Robyn's Default Room
**Staff**: Robyn Camacho
**Service**: Deep Tissue Massage (60 min, $90)
**Expected Room**: Room 3 (her default)
**Test Steps**:
1. Select massage service
2. Choose Robyn specifically
3. **Expected Result**: Room 3 automatically assigned

### **Scenario C**: Tanisha's Default Room
**Staff**: Tanisha Harris
**Service**: Eyebrow Waxing (15 min, $20)
**Expected Room**: Room 2 (her default)
**Test Steps**:
1. Select waxing service
2. Choose Tanisha specifically
3. **Expected Result**: Room 2 automatically assigned

---

## **🧪 TEST CASE 4: Staff Availability Logic**

### **Scenario A**: Tuesday/Thursday Restrictions
**Test Date**: Tuesday or Thursday
**Expected Staff Available**: Robyn only
**Expected Staff Unavailable**: Selma, Tanisha
**Test Steps**:
1. Select any service
2. Choose Tuesday or Thursday
3. **Expected Result**: Only Robyn shows as available
4. **Validation**: Selma and Tanisha should be grayed out or hidden

### **Scenario B**: Sunday Only Staff
**Test Date**: Sunday
**Expected Staff Available**: Leonel only (for massages/body treatments)
**Test Steps**:
1. Select massage or body treatment service
2. Choose Sunday
3. **Expected Result**: Only Leonel shows as available
4. **Validation**: Other staff should be unavailable

### **Scenario C**: Leonel Service Restrictions
**Staff**: Leonel Sidon
**Valid Services**: Massages, Body Treatments
**Invalid Services**: Facials, Waxing
**Test Steps**:
1. Select facial or waxing service
2. Choose Sunday
3. **Expected Result**: Leonel should not appear as option
4. **Validation**: Only massage/body treatment services should show Leonel

---

## **🧪 TEST CASE 5: Double Booking Prevention**

### **Scenario A**: Same Staff, Same Time
**Test Steps**:
1. Book Selma for Basic Facial at 10:00 AM
2. Try to book Selma for Deep Cleansing Facial at 10:00 AM
3. **Expected Result**: Second booking should be rejected
4. **Error Message**: "Staff member is already booked from 10:00 to 10:30"

### **Scenario B**: Same Room, Same Time**
**Test Steps**:
1. Book Room 1 with Selma at 10:00 AM
2. Try to book Room 1 with Robyn at 10:00 AM
3. **Expected Result**: Second booking should be rejected
4. **Error Message**: "Room is already booked from 10:00 to 10:30"

### **Scenario C**: Overlapping Times with Buffer**
**Test Steps**:
1. Book 60-minute service ending at 11:00 AM
2. Try to book service starting at 10:45 AM (15-minute overlap)
3. **Expected Result**: Second booking should be rejected
4. **Error Message**: Should mention "including 15-minute buffer time"

---

## **🧪 TEST CASE 6: Time Slot Availability Logic**

### **Scenario A**: Business Hours Enforcement
**Test Times**:
- **Valid**: 9:00 AM, 2:00 PM, 5:00 PM
- **Invalid**: 8:00 AM, 7:00 PM, 8:00 PM
**Test Steps**:
1. Try to book at invalid times
2. **Expected Result**: Invalid times should not be available
3. **Error Message**: "Appointment cannot start before business hours" or "Appointment would end after business hours"

### **Scenario B**: Last Booking Time Logic
**Service**: 60-minute service
**Test Time**: 6:00 PM (1 hour before closing)
**Expected Result**: Should be available
**Test Time**: 6:30 PM (30 minutes before closing)
**Expected Result**: Should NOT be available
**Error Message**: "Last appointment must start by 18:00 to allow completion before closing"

### **Scenario C**: Same Day Booking Restrictions
**Test Steps**:
1. Try to book for current time (if it's already past)
2. **Expected Result**: Past times should not be available
3. **Error Message**: "Cannot book appointments for times that have already passed today"

---

## **🧪 TEST CASE 7: Service Category Filtering**

### **Scenario A**: Staff Capability Filtering
**Service**: Basic Facial
**Expected Available Staff**: Selma, Robyn, Tanisha
**Expected Unavailable Staff**: Leonel
**Test Steps**:
1. Select facial service
2. **Expected Result**: Only staff who can perform facials should show

### **Scenario B**: Massage Service Filtering
**Service**: Balinese Body Massage
**Expected Available Staff**: Robyn, Leonel (Sundays only)
**Expected Unavailable Staff**: Selma, Tanisha
**Test Steps**:
1. Select massage service
2. **Expected Result**: Only Robyn and Leonel (on Sundays) should show

### **Scenario C**: Waxing Service Filtering
**Service**: Brazilian Wax
**Expected Available Staff**: Robyn, Tanisha
**Expected Unavailable Staff**: Selma, Leonel
**Test Steps**:
1. Select waxing service
2. **Expected Result**: Only Robyn and Tanisha should show

---

## **🧪 TEST CASE 8: Room Capacity Logic**

### **Scenario A**: Single Service in Couples Room
**Service**: Basic Facial (single person)
**Room**: Room 2 or Room 3
**Expected Result**: Should work fine (couples rooms can handle single services)

### **Scenario B**: Couples Service in Single Room
**Service**: Couples package
**Room**: Room 1
**Expected Result**: Should be rejected
**Error Message**: "Couples services cannot be performed in Room 1 (single occupancy only)"

### **Scenario C**: Room Overflow Handling
**Test Steps**:
1. Book Room 1, Room 2, and Room 3 for same time
2. Try to book another service
3. **Expected Result**: Should show "No rooms available" or similar error

---

## **🧪 TEST CASE 9: Package Service Logic**

### **Scenario A**: Package Room Assignment
**Service**: Balinese Body Massage + Basic Facial Package
**Expected Room**: Room 3 (preferred) → Room 2 (fallback)
**Test Steps**:
1. Select package service
2. **Expected Result**: Should prefer Room 3, fallback to Room 2

### **Scenario B**: Package Duration Handling
**Service**: Hot Stone Massage + Microderm Facial (150 minutes)
**Test Time**: 3:00 PM
**Expected Result**: Should calculate end time as 5:30 PM
**Validation**: Check booking confirmation shows correct duration

---

## **🧪 TEST CASE 10: Edge Cases & Error Handling**

### **Scenario A**: All Staff Unavailable
**Test Date**: Tuesday
**Service**: Facial
**Expected Result**: Only Robyn should be available
**Test**: If Robyn is also booked
**Expected Result**: Should show "No staff available for this service"

### **Scenario B**: Room 3 Unavailable for Body Scrub
**Service**: Dead Sea Salt Body Scrub
**Test**: If Room 3 is booked
**Expected Result**: Should show "Room 3 is required for body scrub services but is currently unavailable"

### **Scenario C**: Invalid Service Selection
**Test**: Try to book without selecting service
**Expected Result**: Should show validation error "Service is required"

### **Scenario D**: Invalid Date Selection
**Test**: Try to book for past date
**Expected Result**: Should show "Cannot book appointments for past dates"

---

## **🧪 TEST CASE 11: Buffer Time Logic**

### **Scenario A**: 15-Minute Buffer Enforcement
**Test Steps**:
1. Book 60-minute service ending at 11:00 AM
2. Try to book service starting at 10:45 AM
3. **Expected Result**: Should be rejected due to 15-minute buffer
4. **Error Message**: Should mention buffer time

### **Scenario B**: Buffer Time Calculation
**Service**: 30-minute facial
**Start Time**: 10:00 AM
**Expected End Time**: 10:30 AM
**Next Available Slot**: 10:45 AM (15-minute buffer)
**Test Steps**:
1. Book 30-minute service at 10:00 AM
2. Check next available time slot
3. **Expected Result**: Next slot should be 10:45 AM

---

## **🧪 TEST CASE 12: Advanced Booking Scenarios**

### **Scenario A**: Multiple Bookings Same Day
**Test Steps**:
1. Book Selma for facial at 10:00 AM (Room 1)
2. Book Robyn for massage at 10:00 AM (Room 3)
3. Book Tanisha for waxing at 10:00 AM (Room 2)
4. **Expected Result**: All three bookings should succeed
5. **Validation**: Each staff in their default room

### **Scenario B**: Room Reassignment When Default Unavailable
**Test Steps**:
1. Book Selma's default room (Room 1) with different staff
2. Try to book Selma for facial
3. **Expected Result**: Should assign to available room (Room 2 or 3)
4. **Validation**: Check booking shows different room than default

### **Scenario C**: Service Duration Impact on Availability
**Test Steps**:
1. Book 90-minute service at 5:00 PM
2. Try to book 30-minute service at 6:00 PM
3. **Expected Result**: Should be rejected (would end after 7:00 PM)
4. **Error Message**: "Appointment would end after business hours"

---

## **📋 Test Execution Checklist**

### **Pre-Test Setup**:
- [ ] Clear all existing bookings (if possible)
- [ ] Verify all staff are active
- [ ] Verify all rooms are active
- [ ] Check current date/time for same-day booking tests

### **Test Execution Order**:
1. **Room Logic Tests** (Cases 1-3)
2. **Staff Availability Tests** (Cases 4)
3. **Double Booking Tests** (Cases 5)
4. **Time Slot Tests** (Cases 6)
5. **Service Filtering Tests** (Cases 7)
6. **Capacity Tests** (Cases 8)
7. **Package Tests** (Cases 9)
8. **Edge Case Tests** (Cases 10-12)

### **Expected Outcomes**:
- ✅ All room assignments follow business rules
- ✅ Staff availability correctly enforced
- ✅ No double bookings possible
- ✅ Time slots respect business hours
- ✅ Service-staff compatibility enforced
- ✅ Error messages are user-friendly
- ✅ Buffer times properly applied

### **Bug Reporting Format**:
```
Test Case: [Case Number]
Scenario: [Description]
Expected: [Expected behavior]
Actual: [Actual behavior]
Steps to Reproduce: [Detailed steps]
Screenshots: [If applicable]
```

---

## **🔧 Technical Notes for Testing**

### **Current System Limitations**:
- RLS policies may block booking creation (needs database setup)
- Some logic may be hardcoded vs. database-driven
- Real-time availability may not be fully implemented

### **Testing Environment**:
- **URL**: http://localhost:3000
- **Database**: Supabase (production)
- **Authentication**: Anonymous (anon key)

### **Common Issues to Watch For**:
1. RLS policy errors blocking bookings
2. TypeScript errors in console
3. Network request failures
4. Missing environment variables

---

**🎯 Focus Areas for Your Testing:**
1. **Room 3 exclusivity** for body scrub services
2. **Staff disappearing** when double-booked (you mentioned this works)
3. **Couples service** room assignment logic
4. **Staff availability** on different days
5. **Time slot** availability and business hours enforcement 