# GoHighLevel Webhook Examples

This document provides comprehensive examples of all webhook types and their variations for different service categories and show/no-show statuses.

## Webhook URLs

```typescript
const webhookUrls = {
  newCustomer: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407',
  bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
  bookingUpdate: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc',
  showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4'
}
```

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

## 1. New Customer Webhook Examples

### 1.1 FACE TREATMENTS - Basic Facial

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

### 1.2 BODY MASSAGES - Balinese Body Massage

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

### 1.3 BODY TREATMENTS & BOOSTERS - Underarm Cleaning

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
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

### 1.4 Waxing Services - Brazilian Wax (Women)

```json
{
  "event": "new_customer",
  "customer": {
    "name": "Jessica Kim",
    "email": "jessica.kim@example.com",
    "phone": "+1-671-555-0321",
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

### 1.5 FACE & BODY PACKAGES - Balinese Body Massage + Basic Facial

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

---

## 2. Booking Confirmation Webhook Examples

### 2.1 FACE TREATMENTS - Deep Cleansing Facial

```json
{
  "event": "booking_confirmed",
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
    "status": "confirmed",
    "confirmation_code": "CONF1705320000000"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "payment": {
    "method": "online_payment",
    "amount": 75,
    "currency": "USD",
    "status": "paid",
    "transaction_id": "txn_1705320000000"
  },
  "system_data": {
    "created_at": "2024-01-15T14:00:00.000Z",
    "confirmed_at": "2024-01-15T14:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705320000000"
  }
}
```

### 2.2 BODY MASSAGES - Hot Stone Massage

```json
{
  "event": "booking_confirmed",
  "booking_id": "booking_002",
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
    "status": "confirmed",
    "confirmation_code": "CONF1705323600000"
  },
  "location": {
    "name": "Dermal Skin Clinic & Spa",
    "address": "Tamuning, Guam 96913",
    "phone": "+1-671-646-DERM"
  },
  "payment": {
    "method": "online_payment",
    "amount": 90,
    "currency": "USD",
    "status": "paid",
    "transaction_id": "txn_1705323600000"
  },
  "system_data": {
    "created_at": "2024-01-15T15:00:00.000Z",
    "confirmed_at": "2024-01-15T15:00:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705323600000"
  }
}
```

---

## 3. Booking Update Webhook Examples

### 3.1 FACE TREATMENTS - Rescheduled Appointment

```json
{
  "event": "booking_updated",
  "booking_id": "booking_001",
  "customer": {
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "phone": "+1-671-555-0123",
    "ghl_contact_id": "ghl_contact_123"
  },
  "changes": {
    "old_status": "confirmed",
    "new_status": "rescheduled",
    "old_date": "2024-01-15",
    "new_date": "2024-01-16",
    "old_time": "14:00",
    "new_time": "15:00",
    "reason": "Customer requested reschedule",
    "requested_by": "customer"
  },
  "appointment": {
    "service": "Deep Cleansing Facial",
    "service_id": "deep_cleansing_facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "staff": "Maria Santos",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-16",
    "time": "15:00",
    "duration": 60,
    "price": 75,
    "currency": "USD",
    "status": "rescheduled"
  },
  "system_data": {
    "updated_at": "2024-01-15T14:00:00.000Z",
    "updated_by": "customer",
    "change_source": "website",
    "session_id": "session_1705320000000"
  }
}
```

### 3.2 BODY TREATMENTS & BOOSTERS - Service Change

```json
{
  "event": "booking_updated",
  "booking_id": "booking_003",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
    "ghl_contact_id": "ghl_contact_789"
  },
  "changes": {
    "old_status": "confirmed",
    "new_status": "service_changed",
    "old_service": "Underarm Cleaning",
    "new_service": "Back Treatment",
    "old_price": 99,
    "new_price": 99,
    "reason": "Customer requested service change",
    "requested_by": "customer"
  },
  "appointment": {
    "service": "Back Treatment",
    "service_id": "back_treatment",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "staff": "Lisa Chen",
    "staff_id": "staff_003",
    "room": "Treatment Room 3",
    "room_id": 3,
    "date": "2024-01-15",
    "time": "16:00",
    "duration": 30,
    "price": 99,
    "currency": "USD",
    "status": "service_changed"
  },
  "system_data": {
    "updated_at": "2024-01-15T16:00:00.000Z",
    "updated_by": "customer",
    "change_source": "website",
    "session_id": "session_1705327200000"
  }
}
```

---

## 4. Show/No-Show Webhook Examples

### 4.1 SHOW - FACE TREATMENTS

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
    "admin_notes": "Customer arrived on time and was satisfied with service",
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

### 4.2 NO-SHOW - BODY MASSAGES

```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_002",
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
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T15:30:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer did not arrive and did not call to cancel",
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
    "created_at": "2024-01-15T15:00:00.000Z",
    "attendance_marked_at": "2024-01-15T15:30:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705323600000",
    "admin_session": "admin_1705323600000"
  }
}
```

### 4.3 SHOW - BODY TREATMENTS & BOOSTERS

```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_003",
  "customer": {
    "name": "Emily Rodriguez",
    "email": "emily.rodriguez@example.com",
    "phone": "+1-671-555-0789",
    "ghl_contact_id": "ghl_contact_789",
    "is_new_customer": false,
    "total_bookings": 1
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
    "admin_notes": "Customer arrived 5 minutes early, treatment completed successfully",
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

### 4.4 NO-SHOW - Waxing Services

```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_004",
  "customer": {
    "name": "Jessica Kim",
    "email": "jessica.kim@example.com",
    "phone": "+1-671-555-0321",
    "ghl_contact_id": "ghl_contact_321",
    "is_new_customer": false,
    "total_bookings": 2
  },
  "appointment": {
    "service": "Brazilian Wax (Women)",
    "service_id": "brazilian_wax_women",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "service_description": "Brazilian Wax (Women) treatment",
    "staff": "Anna Lee",
    "staff_id": "staff_004",
    "room": "Treatment Room 4",
    "room_id": 4,
    "date": "2024-01-15",
    "time": "17:00",
    "duration": 45,
    "price": 60,
    "currency": "USD",
    "status": "no_show"
  },
  "attendance": {
    "status": "no_show",
    "marked_at": "2024-01-15T17:15:00.000Z",
    "marked_by": "admin_panel",
    "admin_notes": "Customer called to cancel 10 minutes before appointment",
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
    "created_at": "2024-01-15T17:00:00.000Z",
    "attendance_marked_at": "2024-01-15T17:15:00.000Z",
    "booking_source": "website",
    "session_id": "session_1705330800000",
    "admin_session": "admin_1705330800000"
  }
}
```

### 4.5 SHOW - FACE & BODY PACKAGES

```json
{
  "event": "appointment_attendance",
  "booking_id": "booking_005",
  "customer": {
    "name": "David Thompson",
    "email": "david.thompson@example.com",
    "phone": "+1-671-555-0654",
    "ghl_contact_id": "ghl_contact_654",
    "is_new_customer": false,
    "total_bookings": 5
  },
  "appointment": {
    "service": "Balinese Body Massage + Basic Facial",
    "service_id": "balinese_massage_basic_facial",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "service_description": "Balinese Body Massage + Basic Facial treatment",
    "staff": "Maria Santos",
    "staff_id": "staff_001",
    "room": "Treatment Room 1",
    "room_id": 1,
    "date": "2024-01-15",
    "time": "18:00",
    "duration": 120,
    "price": 150,
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
    "revenue_impact": 150,
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

---

## Service Category Mapping Summary

| Service Name | Original Category | GHL Category | Webhook Trigger |
|--------------|------------------|--------------|-----------------|
| Basic Facial | facial | FACE TREATMENTS | Facial upsell sequence |
| Deep Cleansing Facial | facial | FACE TREATMENTS | Facial upsell sequence |
| Balinese Body Massage | massage | BODY MASSAGES | Massage upsell sequence |
| Hot Stone Massage | massage | BODY MASSAGES | Massage upsell sequence |
| Underarm Cleaning | body_treatment | BODY TREATMENTS & BOOSTERS | Body treatment upsell sequence |
| Back Treatment | body_treatment | BODY TREATMENTS & BOOSTERS | Body treatment upsell sequence |
| Brazilian Wax (Women) | waxing | Waxing Services | Waxing upsell sequence |
| Balinese Body Massage + Basic Facial | package | FACE & BODY PACKAGES | Package upsell sequence |

## Testing Webhooks

### Test Show/No-Show Webhook

```bash
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "show",
    "adminNotes": "Customer arrived on time and was satisfied with service"
  }'
```

### Test All Webhooks

```bash
node scripts/test-all-webhooks.js
```

---

## Business Impact

### Show Status
- ✅ **Revenue Impact**: Full service price
- ✅ **Time Slot**: Utilized
- ✅ **Staff**: Occupied
- ✅ **Customer Satisfaction**: Positive/Excellent
- ✅ **Follow-up**: Usually not required

### No-Show Status
- ❌ **Revenue Impact**: $0 (lost revenue)
- ❌ **Time Slot**: Wasted
- ❌ **Staff**: Unused
- ❌ **Customer Satisfaction**: Unknown
- ⚠️ **Follow-up**: Usually required (high/medium priority)

This comprehensive webhook system enables targeted marketing automation based on service categories and attendance patterns, maximizing customer retention and revenue optimization. 