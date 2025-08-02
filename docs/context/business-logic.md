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

## MEGA PROMPT IMPLEMENTATION - August 2, 2025

### 🎉 MAJOR ENHANCEMENT: All 8 MEGA PROMPT Tasks Implemented

The business logic has been significantly enhanced with comprehensive spa booking system improvements covering customer experience, staff operations, payment processing, legal compliance, and business intelligence.

#### IMPLEMENTED ENHANCEMENTS:

##### 1. Enhanced Customer Registration ✅
- **Required Phone Number Validation**: All bookings now require valid phone number with format checking
- **Customer Communication**: Ensures reliable contact for appointment confirmations and reminders
- **Data Quality**: Improved customer database integrity with complete contact information

##### 2. Flexible Payment System ✅
- **Payment Options**: Customers can choose between deposit (50%) or full payment during booking
- **Revenue Management**: Improved cash flow with flexible payment terms
- **Customer Convenience**: Payment preference selection integrated into booking flow

##### 3. Service-Specific Buffer Times ✅
- **Optimized Scheduling**: 10-minute buffer time for most services, 0 minutes for waxing services
- **Operational Efficiency**: Reduced downtime between appointments while maintaining service quality
- **Room Turnover**: Customized cleaning and preparation time based on service requirements

##### 4. Intelligent Webhook Automation ✅
- **Conditional Triggers**: Webhooks sent based on appointment outcomes (show/no-show)
- **Business Intelligence**: Automated tracking of customer behavior patterns
- **CRM Integration**: Enhanced GoHighLevel integration with status-based automation

##### 5. Strategic Service Presentation ✅
- **Category Organization**: Services grouped with expandable category cards
- **Upselling Focus**: Popular and recommended badges to drive revenue growth
- **Customer Discovery**: Enhanced service presentation improves selection experience

##### 6. Walk-in Customer Management ✅
- **Immediate Booking**: Walk-in customers can book available services instantly
- **Queue Management**: Estimated wait times and status tracking for walk-ins
- **Flexible Options**: Choice between immediate service or scheduled future appointments

##### 7. Staff Operations Enhancement ✅
- **Individual Dashboards**: Staff-specific appointment views and management interfaces
- **Status Management**: Real-time appointment status updates (check-in, in-progress, completed)
- **Customer Insights**: Access to customer information, special requests, and medical notes

##### 8. Legal Compliance System ✅
- **Service-Specific Waivers**: Comprehensive waiver forms tailored to different service types
- **Digital Signatures**: Legal validity through electronic signature capture
- **Medical History**: Service-specific medical information collection
- **Risk Management**: Complete liability protection and consent documentation

### Current State: Production Single-Tenant System with MEGA PROMPT Enhancements
The business logic is optimized specifically for Dermal Skin Clinic and Spa Guam's operations, now featuring professional-grade enhancements for customer management, staff operations, payment processing, and legal compliance.

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

### Enhanced Business Logic Features (MEGA PROMPT Implementation)

#### Advanced Scheduling Logic
- **Service-Specific Buffer Times**: Dynamic buffer time calculation based on service type
  - Standard services: 10-minute buffer for room cleaning and preparation
  - Waxing services: 0-minute buffer for efficient scheduling
  - Body scrub services: Extended buffer time for specialized room requirements

#### Payment Processing Logic
- **Flexible Payment Options**: Integrated payment preference selection
  - Deposit option: 50% of service price required at booking
  - Full payment option: 100% of service price paid upfront
  - Payment preference stored with booking for processing reference

#### Customer Validation Enhancement
- **Required Phone Number**: Comprehensive validation system
  - Format checking for US/Guam phone number standards
  - Real-time validation with user-friendly error messaging
  - Database integrity enforcement for complete customer profiles

#### Intelligent Automation
- **Conditional Webhook System**: Business rule engine for automated communications
  - Show status triggers: Customer completion confirmations
  - No-show status triggers: Follow-up and rescheduling automation
  - Booking status changes: Real-time CRM updates

#### Walk-in Management Logic
- **Dynamic Availability Checking**: Real-time service and staff availability for walk-ins
- **Queue Management**: Estimated wait time calculation based on current bookings
- **Flexible Booking Types**: Support for immediate and scheduled walk-in appointments

#### Service Presentation Logic
- **Category-Based Organization**: Hierarchical service presentation with expandable cards
- **Upselling Intelligence**: Popular and recommended service identification
- **Revenue Optimization**: Strategic service positioning for business growth

#### Staff Operations Logic
- **Personalized Dashboard**: Individual staff appointment filtering and management
- **Status Workflow**: Multi-step appointment status progression
- **Customer Information Access**: Comprehensive customer profile integration

#### Legal Compliance Logic
- **Service-Specific Waiver Requirements**: Dynamic waiver form generation based on service type
- **Medical Information Collection**: Service-appropriate medical history gathering
- **Digital Signature Validation**: Legal compliance through electronic signature capture

### Performance Optimization
- Indexed database queries for sub-300ms response times
- Real-time availability checking to prevent double bookings
- Optimized business logic functions for complex scheduling scenarios
- Efficient room assignment algorithm preventing conflicts
- Enhanced webhook processing with conditional logic
- Optimized payment preference handling
- Streamlined waiver form processing and storage

### Enhanced Database Schema (MEGA PROMPT Implementation)

#### New Tables Added
```sql
-- Waiver management
waivers (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  waiver_data JSONB NOT NULL,
  signature_data TEXT,
  submitted_at TIMESTAMP,
  ip_address INET,
  expires_at TIMESTAMP
);

-- Walk-in customer management
walk_ins (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  arrival_time TIMESTAMP,
  booking_type TEXT DEFAULT 'immediate',
  status TEXT DEFAULT 'waiting',
  estimated_wait_time INTEGER,
  created_at TIMESTAMP
);
```

#### Enhanced Existing Tables
```sql
-- Services table enhancements
ALTER TABLE services ADD COLUMN buffer_time_minutes INTEGER DEFAULT 10;
ALTER TABLE services ADD COLUMN popular_badge BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN recommended BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN requires_waiver BOOLEAN DEFAULT FALSE;

-- Bookings table enhancements
ALTER TABLE bookings ADD COLUMN payment_preference TEXT DEFAULT 'deposit';
ALTER TABLE bookings ADD COLUMN waiver_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN walk_in_id UUID REFERENCES walk_ins(id);

-- Customers table enhancements
ALTER TABLE customers ADD COLUMN phone_required BOOLEAN DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN medical_notes TEXT;
ALTER TABLE customers ADD COLUMN emergency_contact JSONB;
```

### Business Rules Enhancement

#### Payment Processing Rules
1. **Payment Preference Selection**:
   - Customers must choose payment option during booking flow
   - Deposit option: 50% of total service price
   - Full payment option: 100% of total service price
   - Payment preference stored for processing reference

2. **Phone Number Requirements**:
   - All bookings require valid phone number
   - Format validation for US/Guam standards
   - Real-time validation with clear error messaging

3. **Service-Specific Buffer Times**:
   - Standard services: 10-minute buffer between appointments
   - Waxing services: 0-minute buffer for efficiency
   - Body scrub services: Standard 10-minute buffer
   - Custom buffer times configurable per service

4. **Waiver Requirements**:
   - Service-specific waiver forms required before booking
   - Digital signature capture for legal validity
   - Medical history collection based on service type
   - Waiver expiration tracking and renewal reminders

5. **Walk-in Management Rules**:
   - Walk-ins can book immediately available services
   - Queue management with estimated wait times
   - Priority system for scheduled vs walk-in appointments
   - Staff notification system for walk-in arrivals

6. **Webhook Automation Rules**:
   - Conditional webhook triggers based on appointment outcomes
   - Show/no-show status determines automation flow
   - Custom webhook payloads for different event types
   - Error handling and retry logic for failed webhooks

### Monitoring & Reliability
- Health check endpoints for system monitoring
- Automated backup and recovery procedures
- Error tracking and logging for operational support
- Real-time updates across admin interfaces for immediate visibility
- Enhanced webhook delivery monitoring and logging
- Payment preference tracking and reporting
- Waiver completion monitoring and compliance reporting
- Walk-in customer flow analytics and optimization 