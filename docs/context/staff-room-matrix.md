# Staff-Service-Room Compatibility Matrix

## Staff Capabilities

### Selma Villaver (happyskinhappyyou@gmail.com)
**Can Perform:**
- ✅ All Facial Treatments (except dermaplaning)
- ✅ Basic Facial
- ✅ Deep Cleansing Facial
- ✅ Placenta/Collagen Facial
- ✅ Whitening Kojic Facial
- ✅ Anti-Acne Facial
- ✅ Microderm Facial
- ✅ Vitamin C Facial
- ✅ Acne Vulgaris Facial
- ❌ Dermaplaning

**Default Room:** Room 1
**Schedule:** Mon, Wed, Fri, Sat, Sun (on-call with 30-60min notice)

### Robyn Camacho (robyncmcho@gmail.com)
**Can Perform:**
- ✅ All Facials (except RF, nano, microneedling, derma roller, dermaplaning)
- ✅ All Waxing Services
- ✅ All Body Treatments
- ✅ All Body Massages
- ❌ Radio Frequency
- ❌ Nano treatments
- ❌ Microneedling
- ❌ Derma Roller
- ❌ Dermaplaning

**Default Room:** Room 3
**Schedule:** Wed, Thu, Fri, Sat, Sun (off Mon/Tue)

### Tanisha Harris (misstanishababyy@gmail.com)
**Can Perform:**
- ✅ All Facial Treatments (except RF, nano, microneedling, derma roller)
- ✅ All Waxing Services
- ❌ Radio Frequency
- ❌ Nano treatments
- ❌ Microneedling
- ❌ Derma Roller

**Default Room:** Room 2
**Schedule:** Mon, Wed, Fri, Sat, Sun (off Tue/Thu, 2hr notice for on-call)

### Leonel Sidon (sidonleonel@gmail.com)
**Can Perform:**
- ✅ All Body Massages
- ✅ All Body Treatments
- ✅ Can assist with Facials
- ✅ Assists with couples treatments

**Default Room:** Any (assistant role)
**Schedule:** Sunday only

### Phuong Bosque (phuong.bosque@dermalskin.com)
**Can Perform:**
- ✅ All Body Massages (all types)
- ✅ Balinese Body Massage
- ✅ Deep Tissue Body Massage
- ✅ Hot Stone Massage
- ✅ Maternity Massage
- ✅ Stretching Body Massage
- ❌ Facials
- ❌ Waxing
- ❌ Body Treatments

**Default Room:** Any available
**Schedule:** All 7 days (Mon-Sun), 9 AM - 7 PM

## Room Capabilities

### Room 1 (Single)
- **Capacity:** 1 person
- **Services:** Facial, Body Massage, Waxing
- **Default Staff:** Selma
- **Special Features:** Single bed setup

### Room 2 (Couple)
- **Capacity:** 2 people
- **Services:** Facial, Body Massage, Waxing
- **Default Staff:** Tanisha
- **Special Features:** Couple setup, can handle body treatments

### Room 3 (Couple + Special)
- **Capacity:** 2 people
- **Services:** Facial, Body Massage, Waxing, Body Scrub
- **Default Staff:** Robyn
- **Special Features:** Largest room, body scrub equipment, prioritize for couples

## Service-Room Compatibility

### Body Scrub Services (Room 3 ONLY)
- Dead Sea Salt Body Scrub
- Mud Mask Body Wrap
- Any service requiring body scrub equipment

### Couples Services (Room 2 or 3)
- Balinese Body Massage + Basic Facial
- Deep Tissue Body Massage + 3Face
- Hot Stone Body Massage + Microderm Facial
- Any service booked for 2 people

### Single Services (Any Room)
- All individual facials
- All individual massages
- All waxing services
- All body treatments (except body scrub)

## Booking Logic Rules

1. **Body Scrub Priority:** Always assign to Room 3
2. **Couples Priority:** Room 3 first, then Room 2
3. **Staff Preference:** If customer requests specific staff, try to use their default room
4. **Overflow:** When preferred room unavailable, use any available room
5. **Double Booking Prevention:** Never book overlapping appointments in same room 