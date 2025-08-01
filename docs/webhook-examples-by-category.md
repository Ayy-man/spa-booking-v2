# GoHighLevel Webhook Examples by Service Category

This document provides webhook examples for each **service category** with show/no-show variations.

## Service Categories

### GHL Categories (for Upsell Sequences)
1. **BODY MASSAGES** - Massage services
2. **BODY TREATMENTS & BOOSTERS** - Body treatments and scrubs  
3. **FACE TREATMENTS** - Facial services
4. **FACE & BODY PACKAGES** - Package deals and VIP services
5. **Waxing Services** - All waxing services

### Original Categories (for internal use)
1. **facial** - Facial treatments
2. **massage** - Body massages
3. **body_treatment** - Body treatments
4. **body_scrub** - Body scrubs
5. **waxing** - Waxing services
6. **package** - Package deals
7. **membership** - Membership services

---

## 1. FACE TREATMENTS (facial category)

### 1.1 New Customer Webhook - FACE TREATMENTS

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "phone": "+1-671-555-0123",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T14:00:00.000Z"
  },
  "booking": {
    "service": "Basic Facial",
    "service_id": "basic_facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "service_description": "Basic Facial treatment",
    "date": "2024-01-15",
    "time": "14:00",
    "duration": 60,
    "price": 65,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705320000000",
    "session_id": "session_1705320000000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### 1.2 Show/No-Show Webhook - FACE TREATMENTS

#### SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_001",
  "customer": {
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Deep Cleansing Facial",
    "service_id": "deep_cleansing_facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "service_description": "Deep Cleansing Facial treatment",
    "staff": "Maria Santos",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "14:00",
    "duration": 60,
    "price": 75,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T14:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer arrived on time and was satisfied with facial service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 75,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "positive"
  },
  "system_data": {
    "created_at": "2024-01-15T14:00:00.000Z",
    "attendance_marked_at": "2024-01-15T14:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705320000000",
    "admin_session": "admin_1705320000000"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_002",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
    "ghl_contact_id": "ghl_contact_789",
    "is_new_customer": false,
    "total_bookings": 1
  },
  "appointment": {
    "service": "Microderm Facial",
    "service_id": "microderm_facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "service_description": "Microderm Facial treatment",
    "staff": "Lisa Chen",
    "staff_id": "staff_003",
    "room": "Treatment Room 3",
    "room_id": 3,
    "date": "2024-01-15",
    "time": "16:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T16:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive for facial appointment",
    "follow_up_required": true,
    "follow_up_priority": "high"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 0,
    "time_slot_utilization": "wasted",
    "staff_availability": "unused",
    "customer_satisfaction": "unknown"
  },
  "system_data": {
    "created_at": "2024-01-15T16:00:00.000Z",
    "attendance_marked_at": "2024-01-15T16:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705327200000",
    "admin_session": "admin_1705327200000"
  }
}
```

---

## 2. BODY MASSAGES (massage category)

### 2.1 New Customer Webhook - BODY MASSAGES

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Michael Chen",
    "email": "michael.chen@example.com",
    "phone": "+1-671-555-0456",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T15:00:00.000Z"
  },
  "booking": {
    "service": "Balinese Body Massage",
    "service_id": "balinese_massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "service_description": "Balinese Body Massage treatment",
    "date": "2024-01-15",
    "time": "15:00",
    "duration": 60,
    "price": 85,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705323600000",
    "session_id": "session_1705323600000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### 2.2 Show/No-Show Webhook - BODY MASSAGES

#### SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_003",
  "customer": {
    "name": "Michael Chen",
    "email": "michael.chen@example.com",
    "phone": "+1-671-555-0456",
    "ghl_contact_id": "ghl_contact_456",
    "is_new_customer": false,
    "total_bookings": 3
  },
  "appointment": {
    "service": "Hot Stone Massage",
    "service_id": "hot_stone_massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "service_description": "Hot Stone Massage treatment",
    "staff": "John Smith",
    "staff_id": "staff_002",
    "room": "Treatment Room 2",
    "room_id": 2,
    "date": "2024-01-15",
    "time": "15:00",
    "duration": 60,
    "price": 90,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T15:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer arrived on time and enjoyed the massage service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 90,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "positive"
  },
  "system_data": {
    "created_at": "2024-01-15T15:00:00.000Z",
    "attendance_marked_at": "2024-01-15T15:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705323600000",
    "admin_session": "admin_1705323600000"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_004",
  "customer": {
    "name": "David Thompson",
    "email": "david.thompson@example.com",
    "phone": "+1-671-555-0654",
    "ghl_contact_id": "ghl_contact_654",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Deep Tissue Body Massage",
    "service_id": "deep_tissue_massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "service_description": "Deep Tissue Body Massage treatment",
    "staff": "John Smith",
    "staff_id": "staff_002",
    "room": "Treatment Room 2",
    "room_id": 2,
    "date": "2024-01-15",
    "time": "17:00",
    "duration": 60,
    "price": 90,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T17:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive for massage appointment",
    "follow_up_required": true,
    "follow_up_priority": "high"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 0,
    "time_slot_utilization": "wasted",
    "staff_availability": "unused",
    "customer_satisfaction": "unknown"
  },
  "system_data": {
    "created_at": "2024-01-15T17:00:00.000Z",
    "attendance_marked_at": "2024-01-15T17:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705330800000",
    "admin_session": "admin_1705330800000"
  }
}
```

---

## 3. BODY TREATMENTS & BOOSTERS (body_treatment category)

### 3.1 New Customer Webhook - BODY TREATMENTS & BOOSTERS

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Jessica Kim",
    "email": "jessica.kim@example.com",
    "phone": "+1-671-555-0321",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T16:00:00.000Z"
  },
  "booking": {
    "service": "Underarm Cleaning",
    "service_id": "underarm_cleaning",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "service_description": "Underarm Cleaning treatment",
    "date": "2024-01-15",
    "time": "16:00",
    "duration": 30,
    "price": 99,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705327200000",
    "session_id": "session_1705327200000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### 3.2 Show/No-Show Webhook - BODY TREATMENTS & BOOSTERS

#### SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_005",
  "customer": {
    "name": "Jessica Kim",
    "email": "jessica.kim@example.com",
    "phone": "+1-671-555-0321",
    "ghl_contact_id": "ghl_contact_321",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Back Treatment",
    "service_id": "back_treatment",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "service_description": "Back Treatment treatment",
    "staff": "Lisa Chen",
    "staff_id": "staff_003",
    "room": "Treatment Room 3",
    "room_id": 3,
    "date": "2024-01-15",
    "time": "16:00",
    "duration": 30,
    "price": 99,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T16:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer arrived on time for body treatment service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 99,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "positive"
  },
  "system_data": {
    "created_at": "2024-01-15T16:00:00.000Z",
    "attendance_marked_at": "2024-01-15T16:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705327200000",
    "admin_session": "admin_1705327200000"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_006",
  "customer": {
    "name": "Alex Wilson",
    "email": "alex.wilson@example.com",
    "phone": "+1-671-555-0987",
    "ghl_contact_id": "ghl_contact_987",
    "is_new_customer": false,
    "total_bookings": 1
  },
  "appointment": {
    "service": "Chemical Peel (Body)",
    "service_id": "chemical_peel_body",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "service_description": "Chemical Peel (Body) treatment",
    "staff": "Lisa Chen",
    "staff_id": "staff_003",
    "room": "Treatment Room 3",
    "room_id": 3,
    "date": "2024-01-15",
    "time": "18:00",
    "duration": 30,
    "price": 85,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T18:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive for body treatment appointment",
    "follow_up_required": true,
    "follow_up_priority": "medium"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 0,
    "time_slot_utilization": "wasted",
    "staff_availability": "unused",
    "customer_satisfaction": "unknown"
  },
  "system_data": {
    "created_at": "2024-01-15T18:00:00.000Z",
    "attendance_marked_at": "2024-01-15T18:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705334400000",
    "admin_session": "admin_1705334400000"
  }
}
```

---

## 4. Waxing Services (waxing category)

### 4.1 New Customer Webhook - Waxing Services

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T17:00:00.000Z"
  },
  "booking": {
    "service": "Brazilian Wax (Women)",
    "service_id": "brazilian_wax_women",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "service_description": "Brazilian Wax (Women) treatment",
    "date": "2024-01-15",
    "time": "17:00",
    "duration": 45,
    "price": 60,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705330800000",
    "session_id": "session_1705330800000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### 4.2 Show/No-Show Webhook - Waxing Services

#### SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_007",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
    "ghl_contact_id": "ghl_contact_789",
    "is_new_customer": false,
    "total_bookings": 3
  },
  "appointment": {
    "service": "Eyebrow Waxing",
    "service_id": "eyebrow_waxing",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "service_description": "Eyebrow Waxing treatment",
    "staff": "Anna Lee",
    "staff_id": "staff_004",
    "room": "Treatment Room 4",
    "room_id": 4,
    "date": "2024-01-15",
    "time": "17:00",
    "duration": 15,
    "price": 20,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T17:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer arrived on time for waxing service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 20,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "positive"
  },
  "system_data": {
    "created_at": "2024-01-15T17:00:00.000Z",
    "attendance_marked_at": "2024-01-15T17:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705330800000",
    "admin_session": "admin_1705330800000"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_008",
  "customer": {
    "name": "Rachel Green",
    "email": "rachel.green@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123",
    "is_new_customer": false,
    "total_bookings": 1
  },
  "appointment": {
    "service": "Full Leg Waxing",
    "service_id": "full_leg_waxing",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "service_description": "Full Leg Waxing treatment",
    "staff": "Anna Lee",
    "staff_id": "staff_004",
    "room": "Treatment Room 4",
    "room_id": 4,
    "date": "2024-01-15",
    "time": "19:00",
    "duration": 60,
    "price": 80,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T19:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive for waxing appointment",
    "follow_up_required": true,
    "follow_up_priority": "medium"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 0,
    "time_slot_utilization": "wasted",
    "staff_availability": "unused",
    "customer_satisfaction": "unknown"
  },
  "system_data": {
    "created_at": "2024-01-15T19:00:00.000Z",
    "attendance_marked_at": "2024-01-15T19:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705338000000",
    "admin_session": "admin_1705338000000"
  }
}
```

---

## 5. FACE & BODY PACKAGES (package category)

### 5.1 New Customer Webhook - FACE & BODY PACKAGES

```json
{
  "event": "new_customer",
  "customer": {
    "name": "David Thompson",
    "email": "david.thompson@example.com",
    "phone": "+1-671-555-0654",
    "is_new_customer": true,
    "source": "spa_booking_website",
    "created_at": "2024-01-15T18:00:00.000Z"
  },
  "booking": {
    "service": "Balinese Body Massage + Basic Facial",
    "service_id": "balinese_massage_basic_facial",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "service_description": "Balinese Body Massage + Basic Facial treatment",
    "date": "2024-01-15",
    "time": "18:00",
    "duration": 120,
    "price": 150,
    "currency": "USD",
    "location": "Dermal Skin Clinic & Spa, Guam",
    "booking_notes": "First-time customer"
  },
  "preferences": {
    "communication_preference": "email",
    "marketing_consent": true,
    "special_requests": ""
  },
  "system_data": {
    "booking_id": "temp_booking_1705334400000",
    "session_id": "session_1705334400000",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "unknown",
    "referrer": "https://dermalskinclinicspa.com/booking"
  }
}
```

### 5.2 Show/No-Show Webhook - FACE & BODY PACKAGES

#### SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_009",
  "customer": {
    "name": "David Thompson",
    "email": "david.thompson@example.com",
    "phone": "+1-671-555-0654",
    "ghl_contact_id": "ghl_contact_654",
    "is_new_customer": false,
    "total_bookings": 5
  },
  "appointment": {
    "service": "Hot Stone Body Massage + Microderm Facial",
    "service_id": "hot_stone_microderm_package",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "service_description": "Hot Stone Body Massage + Microderm Facial treatment",
    "staff": "Maria Santos",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "18:00",
    "duration": 120,
    "price": 175,
    "currency": "USD",
    "status": "completed"
  },
  "attendance": {
    "status": "show",
    "marked_at": "2024-01-15T18:00:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "VIP customer, arrived on time, very satisfied with package service",
    "follow_up_required": false,
    "follow_up_priority": "normal"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 175,
    "time_slot_utilization": "utilized",
    "staff_availability": "occupied",
    "customer_satisfaction": "excellent"
  },
  "system_data": {
    "created_at": "2024-01-15T18:00:00.000Z",
    "attendance_marked_at": "2024-01-15T18:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705334400000",
    "admin_session": "admin_1705334400000"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_010",
  "customer": {
    "name": "Sophie Martinez",
    "email": "sophie.martinez@example.com",
    "phone": "+1-671-555-0456",
    "ghl_contact_id": "ghl_contact_456",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Deep Tissue Body Massage + 3Face",
    "service_id": "deep_tissue_3face_package",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "service_description": "Deep Tissue Body Massage + 3Face treatment",
    "staff": "Maria Santos",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "20:00",
    "duration": 120,
    "price": 165,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T20:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive for package appointment",
    "follow_up_required": true,
    "follow_up_priority": "high"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "business_impact": {
    "revenue_impact": 0,
    "time_slot_utilization": "wasted",
    "staff_availability": "unused",
    "customer_satisfaction": "unknown"
  },
  "system_data": {
    "created_at": "2024-01-15T20:00:00.000Z",
    "attendance_marked_at": "2024-01-15T20:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705341600000",
    "admin_session": "admin_1705341600000"
  }
}
```

---

## Service Category Summary

| Service Category | GHL Category | Webhook Trigger | Show Example | No-Show Example |
|-----------------|--------------|-----------------|--------------|-----------------|
| **facial** | FACE TREATMENTS | Facial upsell sequence | ✅ Basic Facial | ❌ Microderm Facial |
| **massage** | BODY MASSAGES | Massage upsell sequence | ✅ Hot Stone Massage | ❌ Deep Tissue Massage |
| **body_treatment** | BODY TREATMENTS & BOOSTERS | Body treatment upsell sequence | ✅ Back Treatment | ❌ Chemical Peel |
| **waxing** | Waxing Services | Waxing upsell sequence | ✅ Eyebrow Waxing | ❌ Full Leg Waxing |
| **package** | FACE & BODY PACKAGES | Package upsell sequence | ✅ Hot Stone + Microderm | ❌ Deep Tissue + 3Face |

## Testing Commands

### Test Show/No-Show for Each Category

```bash
# Test FACE TREATMENTS
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for facial service"}'

# Test BODY MASSAGES  
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for massage service"}'

# Test BODY TREATMENTS & BOOSTERS
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for body treatment service"}'

# Test Waxing Services
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for waxing service"}'

# Test FACE & BODY PACKAGES
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for package service"}'
```

This provides webhook examples for each **service category** with show/no-show variations, focusing on the category level rather than individual service IDs. 