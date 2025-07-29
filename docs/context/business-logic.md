# Dermal Skin Clinic Business Logic

## Room Assignment Algorithm

### Priority Rules
1. Check service type first:
   - Body Scrub → Room 3 ONLY
   - Couples service → Room 3 (preferred) or Room 2
   - Single service → Any available room

2. Staff default rooms:
   - Selma → Room 1
   - Tanisha → Room 2
   - Robyn → Room 3
   - Leonel → Assists in any room

3. Overflow handling:
   - If preferred room unavailable, use any available room
   - Never double-book a room

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