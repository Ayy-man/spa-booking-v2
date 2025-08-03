# Webhook Examples by Service Category

## Service Categories & GHL Mapping

| Service Category | GHL Category | Upsell Sequence |
|-----------------|--------------|-----------------|
| **facial** | FACE TREATMENTS | Facial upsell sequence |
| **massage** | BODY MASSAGES | Massage upsell sequence |
| **body_treatment** | BODY TREATMENTS & BOOSTERS | Body treatment upsell sequence |
| **waxing** | Waxing Services | Waxing upsell sequence |
| **package** | FACE & BODY PACKAGES | Package upsell sequence |

---

## 1. FACE TREATMENTS (facial category)

### New Customer Webhook
```json
{
  "event": "new_customer",
  "booking": {
    "service": "Basic Facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "price": 65
  }
}
```

### Show/No-Show Webhook

#### SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Deep Cleansing Facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "price": 75
  },
  "attendance": {
    "status": "show",
    "admin_notes": "Customer arrived for facial service"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Microderm Facial",
    "service_category": "facial",
    "ghl_category": "FACE TREATMENTS",
    "price": 85
  },
  "attendance": {
    "status": "no_show",
    "admin_notes": "Customer did not arrive for facial appointment"
  }
}
```

---

## 2. BODY MASSAGES (massage category)

### New Customer Webhook
```json
{
  "event": "new_customer",
  "booking": {
    "service": "Balinese Body Massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "price": 85
  }
}
```

### Show/No-Show Webhook

#### SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Hot Stone Massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "price": 90
  },
  "attendance": {
    "status": "show",
    "admin_notes": "Customer arrived for massage service"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Deep Tissue Body Massage",
    "service_category": "massage",
    "ghl_category": "BODY MASSAGES",
    "price": 90
  },
  "attendance": {
    "status": "no_show",
    "admin_notes": "Customer did not arrive for massage appointment"
  }
}
```

---

## 3. BODY TREATMENTS & BOOSTERS (body_treatment category)

### New Customer Webhook
```json
{
  "event": "new_customer",
  "booking": {
    "service": "Underarm Cleaning",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "price": 99
  }
}
```

### Show/No-Show Webhook

#### SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Back Treatment",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "price": 99
  },
  "attendance": {
    "status": "show",
    "admin_notes": "Customer arrived for body treatment service"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Chemical Peel (Body)",
    "service_category": "body_treatment",
    "ghl_category": "BODY TREATMENTS & BOOSTERS",
    "price": 85
  },
  "attendance": {
    "status": "no_show",
    "admin_notes": "Customer did not arrive for body treatment appointment"
  }
}
```

---

## 4. Waxing Services (waxing category)

### New Customer Webhook
```json
{
  "event": "new_customer",
  "booking": {
    "service": "Brazilian Wax (Women)",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "price": 60
  }
}
```

### Show/No-Show Webhook

#### SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Eyebrow Waxing",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "price": 20
  },
  "attendance": {
    "status": "show",
    "admin_notes": "Customer arrived for waxing service"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Full Leg Waxing",
    "service_category": "waxing",
    "ghl_category": "Waxing Services",
    "price": 80
  },
  "attendance": {
    "status": "no_show",
    "admin_notes": "Customer did not arrive for waxing appointment"
  }
}
```

---

## 5. FACE & BODY PACKAGES (package category)

### New Customer Webhook
```json
{
  "event": "new_customer",
  "booking": {
    "service": "Balinese Body Massage + Basic Facial",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "price": 150
  }
}
```

### Show/No-Show Webhook

#### SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Hot Stone Body Massage + Microderm Facial",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "price": 175
  },
  "attendance": {
    "status": "show",
    "admin_notes": "VIP customer arrived for package service"
  }
}
```

#### NO-SHOW
```json
{
  "event": "appointment_attendance",
  "appointment": {
    "service": "Deep Tissue Body Massage + 3Face",
    "service_category": "package",
    "ghl_category": "FACE & BODY PACKAGES",
    "price": 165
  },
  "attendance": {
    "status": "no_show",
    "admin_notes": "Customer did not arrive for package appointment"
  }
}
```

---

## Testing by Category

```bash
# Test each category with show status
curl -X POST http://localhost:3000/api/test-show-no-show-webhook \
  -H "Content-Type: application/json" \
  -d '{"status": "show", "adminNotes": "Customer arrived for [CATEGORY] service"}'

# Replace [CATEGORY] with:
# - facial service
# - massage service  
# - body treatment service
# - waxing service
# - package service
```

This provides webhook examples for each **service category** with show/no-show variations, focusing on the category level rather than individual service IDs. 