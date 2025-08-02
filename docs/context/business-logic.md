# Dermal Skin Clinic Business Logic

## Room Assignment Algorithm

### Priority Rules
1. Check service type first:
   - Body Scrub → Room 3 ONLY
   - Couples booking → Room 3 (preferred) or Room 2
   - Single service → Any available room

2. Staff default rooms:
   - Selma → Room 1
   - Tanisha → Room 2
   - Robyn → Room 3
   - Leonel → Assists in any room

3. Overflow handling:
   - If preferred room unavailable, use any available room
   - Never double-book a room

## Couples Booking Logic

### Features
1. **Service Selection**:
   - Customers can choose same service for both people
   - Option to select different services for each person
   - All services available for couples booking

2. **Staff Selection**:
   - Can choose same staff member for both (if schedule allows)
   - Can select different staff members
   - "Any Available" option works for couples

3. **Room Assignment**:
   - Couples automatically assigned to Room 3 (first preference)
   - Falls back to Room 2 if Room 3 unavailable
   - Both people in same room for synchronized experience

4. **Database Management**:
   - Uses booking_group_id to link couple's bookings
   - booking_type field set to 'couples'
   - Atomic transaction ensures both bookings succeed or fail together

5. **Availability Checking**:
   - Checks both staff members' availability
   - Ensures room can accommodate both appointments
   - Validates no scheduling conflicts

### Business Rules
- Couples bookings must start at the same time
- Both appointments in the same room
- If one booking fails, entire couples booking is cancelled
- Cancellation of one appointment cancels both
- Special pricing or packages can be applied to couples bookings

## Service Duration Mapping
```json
{
  "basic_facial": 30,
  "deep_cleansing_facial": 60,
  "placenta_collagen_facial": 60,
  "whitening_kojic_facial": 60,
  "anti_acne_facial": 60,
  "microderm_facial": 60,
  "vitamin_c_facial": 60,
  "acne_vulgaris_facial": 60,
  "balinese_massage": 60,
  "maternity_massage": 60,
  "deep_tissue_massage": 60,
  "hot_stone_massage": 60,
  "hot_stone_90": 90,
  "body_scrub": 30,
  "packages": {
    "balinese_facial": 90,
    "deep_tissue_3face": 120,
    "hot_stone_microderm": 150
  }
}
```

## Staff Availability
- **Selma**: Mon, Wed, Fri, Sat, Sun (on-call with 30-60min notice)
- **Tanisha**: Mon, Wed, Fri, Sat, Sun (off Tue/Thu, 2hr notice for on-call)
- **Robyn**: Full schedule
- **Leonel**: Sunday only

## Booking Constraints
- Operating hours: 9 AM - 7 PM
- Last booking: 1 hour before closing
- Buffer time: 15 minutes between appointments
- Maximum advance booking: 30 days

## Service Categories
1. **Facials** (30-120 mins)
   - Basic Facial: 30 mins, $65
   - Deep Cleansing Facial: 60 mins, $79
   - Placenta/Collagen Facial: 60 mins, $90
   - Whitening Kojic Facial: 60 mins, $90
   - Anti-Acne Facial: 60 mins, $90
   - Microderm Facial: 60 mins, $99
   - Vitamin C Facial: 60 mins, $120
   - Acne Vulgaris Facial: 60 mins, $120

2. **Body Massages** (60-150 mins)
   - Balinese Body Massage: 60 mins, $80
   - Maternity Massage: 60 mins, $85
   - Stretching Body Massage: 60 mins, $85
   - Deep Tissue Body Massage: 60 mins, $90
   - Hot Stone Massage: 60 mins, $90
   - Hot Stone Massage 90 Minutes: 90 mins, $120

3. **Body Treatments** (30 mins)
   - Underarm Cleaning: 30 mins, $99
   - Back Treatment: 30 mins, $99
   - Chemical Peel (Body): 30 mins, $85
   - Underarm/Inguinal Whitening: 30 mins, $150
   - Microdermabrasion (Body): 30 mins, $85
   - Deep Moisturizing Body Treatment: 30 mins, $65
   - Dead Sea Salt Body Scrub: 30 mins, $65
   - Mud Mask Body Wrap: 30 mins, $65

4. **Waxing** (5-60 mins)
   - Eyebrow Waxing: 15 mins, $20
   - Lip Waxing: 5 mins, $10
   - Half Arm Waxing: 15 mins, $40
   - Full Arm Waxing: 30 mins, $60
   - Chin Waxing: 5 mins, $12
   - Neck Waxing: 15 mins, $30
   - Lower Leg Waxing: 30 mins, $40
   - Full Leg Waxing: 60 mins, $80
   - Full Face Waxing: 30 mins, $60
   - Bikini Waxing: 30 mins, $35
   - Underarm Waxing: 15 mins, $20
   - Brazilian Wax (Women): 45 mins, $60
   - Brazilian Waxing (Men): 45 mins, $75
   - Chest Wax: 30 mins, $40
   - Stomach Wax: 30 mins, $40
   - Shoulders: 30 mins, $30
   - Feet: 5 mins, $30

5. **Packages** (90-150 mins)
   - Balinese Body Massage + Basic Facial: 90 mins, $130
   - Deep Tissue Body Massage + 3Face: 120 mins, $180
   - Hot Stone Body Massage + Microderm Facial: 150 mins, $200

6. **Special Services**
   - Basic Vajacial Cleaning + Brazilian Wax: 30 mins, $90
   - Dermal VIP Card: 30 mins, $50/year

## Production System Configuration - August 2, 2025

### Current State: Production Single-Tenant System
The business logic is optimized specifically for Dermal Skin Clinic and Spa Guam's operations, providing a robust and efficient booking system tailored to their unique requirements.

### Production Business Configuration
1. **Service Catalog Management**
   - 44 active services across 7 categories (facial, massage, body_treatment, body_scrub, waxing, packages, membership)
   - Fixed pricing structure optimized for Guam market
   - Service duration-based scheduling with 15-minute intervals
   - Category-based filtering and display organization

2. **Staff Management System**
   - 4 active staff members with individual specializations and schedules
   - Staff capability matrix ensuring only qualified staff are assigned to services
   - Individual work schedules (e.g., Leonel Sundays-only, Tanisha off Tue/Thu)
   - Default room assignments for operational efficiency

3. **Room Configuration**
   - 3 treatment rooms with specific capabilities and capacity
   - Room 3 exclusive for body scrub services (special equipment/amenities)
   - Rooms 2 & 3 couples-capable for synchronized treatments
   - Intelligent room assignment algorithm based on service requirements

4. **Operational Rules**
   - Operating hours: 9 AM - 7 PM daily
   - 15-minute buffer time between appointments
   - 30-day advance booking window
   - Same-day booking restrictions based on staff availability

5. **GoHighLevel Integration**
   - New customer webhook triggers for lead management
   - Booking confirmation notifications for customer follow-up
   - Status update webhooks for appointment changes
   - Show/no-show tracking for customer relationship management

### Data Security & Privacy
- Row-level security policies protecting customer information
- Encrypted data storage with Supabase managed encryption
- Secure admin authentication with role-based access control
- HIPAA-conscious handling of medical notes and customer preferences

### Performance Optimization
- Indexed database queries for sub-300ms response times
- Real-time availability checking to prevent double bookings
- Optimized business logic functions for complex scheduling scenarios
- Efficient room assignment algorithm preventing conflicts

### Monitoring & Reliability
- Health check endpoints for system monitoring
- Automated backup and recovery procedures
- Error tracking and logging for operational support
- Real-time updates across admin interfaces for immediate visibility 