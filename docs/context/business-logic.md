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
- **Selma**: Mon, Wed, Fri, Sat, Sun (on-call with 30-60min notice) - Facials only
- **Tanisha**: Mon, Wed, Fri, Sat, Sun (off Tue/Thu, 2hr notice for on-call) - Facials & Waxing
- **Robyn**: Wed, Thu, Fri, Sat, Sun (off Mon/Tue) - All services except some advanced facials
- **Leonel**: Sunday only - Massages, Treatments, can assist with Facials
- **Phuong**: All 7 days, 9 AM - 7 PM - Massages only (all types)

## Booking Constraints
- Operating hours: 9 AM - 7 PM (Guam time UTC+10)
- Minimum advance booking: 2 hours before appointment
- Last booking: 1 hour before closing
- Buffer time: 15 minutes between appointments (IMPLEMENTED)
- Maximum advance booking: 30 days
- All times displayed and stored in Guam timezone

### 15-Minute Buffer Implementation
The system automatically adds a 15-minute buffer between all appointment slots to ensure:
- Adequate time for room cleaning and preparation
- Staff transition time between clients
- Reduced scheduling conflicts and overlaps
- Enhanced customer experience with no rushed appointments

**Buffer Calculation Logic:**
- **Time Slot Duration**: Service Duration + 15-minute buffer
- **Next Available Slot**: Previous slot end time + 15-minute buffer
- **Examples**:
  - 30-min services: 9:00-9:30, 9:45-10:15, 10:30-11:00
  - 60-min services: 9:00-10:00, 10:15-11:15, 11:30-12:30
  - 90-min services: 9:00-10:30, 10:45-12:15, 12:30-14:00

## Service Categories

### 0. Consultation Services (New Category - August 2025)
- **Facial Consultation**: 30 mins, $25
  - Professional skin assessment and treatment planning
  - Special UI treatment with premium card styling
  - Available for all staff members who can perform facials
  - Can be combined with add-ons for comprehensive consultation experience

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

## Payment System Logic

### Service-Specific Payment Links System (Implemented August 4, 2025)

#### Payment Method Selection Rules
1. **Existing Customers**:
   - Can choose "Pay in Full Now" (full service price)
   - Can choose "Pay Deposit ($30)" (traditional deposit system)
   - Routing to payment selection page for enhanced options

2. **New Customers**:
   - Continue using established $30 deposit system
   - No payment method selection (maintains simplicity)
   - Direct routing to existing deposit payment process

#### Service Coverage Logic
The payment system operates with two tiers of service coverage:

**Tier 1: Full Payment Links Available (16 services - 35% coverage)**
Services with dedicated payment links for full service cost:
- **Facials**: 8 services (Basic to Acne Vulgaris)
- **Body Massages**: 5 services (Balinese to Hot Stone 90-minute)
- **Body Treatments**: 3 services (Dead Sea Salt, Deep Moisturizing, Mud Mask)

**Tier 2: Deposit Fallback System (30 services - 65% coverage)**
Services automatically using $30 deposit system:
- **Waxing Services**: 15 services (All waxing treatments)
- **Body Treatments**: 9 additional services (Underarm Cleaning, Chemical Peel, etc.)
- **Packages**: 3 combination services
- **Special Services**: 3 specialty services

#### Payment Selection Business Rules

1. **Service Type Detection**:
   - System checks if selected service has dedicated payment link
   - Automatic routing based on service payment availability
   - Transparent pricing display for both options

2. **Customer Segmentation**:
   - Existing customer detection via email/phone lookup
   - Dynamic interface presentation based on customer status
   - Consistent experience regardless of payment method chosen

3. **Fallback Logic**:
   - Services without payment links automatically use deposit system
   - No disruption to booking flow for unsupported services
   - Graceful degradation maintaining full functionality

4. **Pricing Display Rules**:
   - Full service price shown for payment link services
   - $30 deposit option always available as alternative
   - Clear indication of payment method selected in confirmation

### Payment Configuration Management

#### Configuration System Structure
Located in `/src/lib/payment-config.ts`:
- Centralized mapping of services to payment links
- Type-safe configuration with TypeScript integration
- Scalable system for easy addition of new payment links
- Automatic fallback detection for services without links

#### Admin Payment Link Management
Located at `/src/app/admin/payment-links/page.tsx`:
- Complete overview of all 46 services and their payment status
- Copy-to-clipboard functionality for easy link sharing
- Service categorization matching business service structure
- Usage instructions and implementation guidance

#### Integration Points
1. **Database Integration**:
   - Works seamlessly with existing Supabase booking system
   - No changes required to existing database schema
   - Maintains all existing booking verification and security

2. **Customer Management**:
   - Integrates with existing customer detection logic
   - Preserves all customer information collection processes
   - Maintains customer history and booking relationships

3. **Admin Interface**:
   - Professional dashboard integrated with admin navigation
   - Consistent with existing admin panel design and functionality
   - Easy access via admin dashboard navigation

### Business Impact Rules

#### Cash Flow Enhancement
- **Immediate Revenue**: 35% of services can collect full payment upfront
- **Reduced Processing**: Direct payment links eliminate external payment steps
- **Revenue Optimization**: Full payment option increases immediate revenue capture

#### Customer Experience Enhancement
- **Payment Choice**: Existing customers gain payment method flexibility
- **Streamlined Process**: Direct payment links reduce booking complexity
- **Professional Interface**: Consistent spa-themed payment experience

#### Operational Efficiency
- **Staff Efficiency**: Copy-to-clipboard functionality for quick link sharing
- **Service Coverage Visibility**: Immediate awareness of payment link availability
- **No Disruption**: New customers continue with familiar deposit process

#### Future Scalability
- **Easy Expansion**: Simple process to add new payment links
- **System Ready**: Infrastructure supports unlimited service payment links
- **Configuration Driven**: All payment options managed through central configuration

## User Interface Theme System

### Dark Mode Implementation (Added August 15, 2025)

#### Theme Management Rules
1. **Customer Interface**:
   - Full dark mode support across all booking pages
   - Theme toggle available in header for customer preference
   - localStorage persistence maintains theme choice across sessions
   - Default theme: Light mode (not system preference)

2. **Admin Interface**:
   - **Intentionally Light Mode Only**: Admin panel excludes dark mode
   - Maintains operational consistency for staff
   - Ensures standardized interface for all administrative functions
   - Professional business software appearance maintained

#### Theme System Configuration
1. **Storage Key**: 'spa-theme' in localStorage
2. **Implementation**: Class-based dark mode using Tailwind CSS
3. **Transitions**: 300ms smooth transitions between themes
4. **SSR Compatibility**: Proper hydration handling prevents theme flash
5. **Accessibility**: WCAG AA compliance maintained in both themes

#### Dark Mode Color Scheme
- **Background**: #1a1a1a (main), #2a2a2a (cards)
- **Primary**: #E8B3C0 (enhanced spa pink for dark mode contrast)
- **Text**: #f5f5f5 (primary), #e0e0e0 (secondary)
- **Borders**: #333333 (subtle separations)
- **Status Colors**: Maintained high contrast for success, error, warning states

#### Business Rules for Theme Usage
1. **Customer Experience**: Theme choice empowers customer comfort
2. **Brand Consistency**: Spa aesthetic maintained in both light and dark themes
3. **Operational Standards**: Admin functions remain in light mode for consistency
4. **Accessibility Leadership**: Demonstrates commitment to inclusive design
5. **Modern Standards**: Meets contemporary web application expectations

#### Technical Implementation Rules
- **Performance**: Class-based switching for optimal speed
- **Persistence**: Theme preference saved and restored automatically
- **Compatibility**: Cross-browser support maintained
- **Mobile Optimization**: Touch-friendly theme toggle interface
- **SEO Friendly**: Proper SSR handling maintains search optimization

## Add-ons System Business Logic (Implemented August 2025)

### Add-ons Integration Rules
1. **Service Compatibility**:
   - Services with `allows_addons=true` automatically show add-ons page during booking
   - Add-ons are filtered by service category and compatibility
   - Add-ons can be service-specific or category-wide

2. **Pricing and Duration Logic**:
   - Add-ons extend total appointment duration automatically
   - Base service price + add-ons prices = total booking cost
   - Real-time calculations shown during selection process
   - Historical pricing stored at booking time for consistency

3. **Booking Flow Integration**:
   - Add-ons selection page appears after service selection (before date/time)
   - Skip option available for customers who don't want add-ons
   - Add-ons information carried through entire booking process
   - Displayed in confirmation, admin panels, and reports

### Add-ons Categories

#### Body Massage Add-ons
Available for all massage services:
- **Hot Stone Back**: $15, 30 mins
- **Deep Moisturizing**: $25, 30 mins  
- **30 Minutes Extra Massage**: $40, 30 mins

#### Facial Treatment Add-ons by Level
- **Face Treatment #1 Add-on**: $50, 30 mins
- **Face Treatment #2 Add-on**: $60, 30 mins
- **Face Treatment #3 Add-on**: $85, 45 mins
- **Face Treatment #4 Add-on**: $99, 55 mins

#### Premium Face Treatment #4 Add-ons
All $120, 60 minutes enhancements:
- **Hollywood Facial Add-on**
- **LED Photo Aging Add-on** 
- **Acne Vulgaris Treatment Add-on**
- **Vampire Facial Add-on (Fruit Based)**
- **Glassy Skin Add-on**
- **Hydra Facial Add-on**
- **Obaji Infusion Whitening Add-on**
- **Nano Face Treatment Add-on**
- **Derma Planning Add-on**
- **Microneedling Add-on**
- **Dark Spot Treatment Add-on**

### Add-ons Business Impact Rules

#### Revenue Enhancement
- **Additional Revenue Stream**: Add-ons provide 15-25% average booking value increase
- **Upselling Opportunities**: Natural upselling during service selection process
- **Service Differentiation**: Premium add-ons distinguish basic vs luxury experiences

#### Operational Considerations
- **Extended Appointment Times**: Staff scheduling must account for add-on duration
- **Room Utilization**: Longer appointments affect daily capacity planning
- **Staff Skills**: Some premium add-ons may require additional staff training

#### Customer Experience Rules
- **Optional Enhancement**: Add-ons are always optional, never mandatory
- **Clear Pricing**: All add-on costs displayed upfront with no hidden fees
- **Service Compatibility**: Only relevant add-ons shown based on selected service
- **Quantity Limits**: Some add-ons have maximum quantity restrictions for safety/time

### Staff Assignment for Add-ons
- **Facial Add-ons**: Available to staff who can perform facial services (Selma, Robyn, Tanisha)
- **Massage Add-ons**: Available to staff who can perform massage services (Robyn, Leonel, Phuong)
- **Premium Add-ons**: May require specific staff training or expertise
- **Cross-trained Staff**: Some add-ons available across multiple service categories