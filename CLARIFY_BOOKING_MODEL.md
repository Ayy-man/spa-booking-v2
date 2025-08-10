# Spa Booking Model Clarification

## The Correct Business Model

### ALL Services Can Be Booked As:
1. **Single Booking** - One person receiving the service
2. **Couples Booking** - Two people receiving the same (or different) service together

### This Includes Package Services:
- **"Balinese Body Massage + Basic Facial"** can be:
  - Single: One person gets massage THEN facial (sequential)
  - Couples: Two people, one gets massage while other gets facial (simultaneous)
  
- **"Deep Tissue Body Massage + 3Face"** can be:
  - Single: One person gets both treatments
  - Couples: Two people each get one treatment
  
- **"Hot Stone Body Massage + Microderm Facial"** can be:
  - Single: One person gets both treatments
  - Couples: Two people each get one treatment

## The Database Field `is_couples_service` is MISLEADING
- This field should NOT restrict booking types
- It should be ignored in the UI
- Every service should show both single and couples options

## Implementation:
1. Customer selects ANY service
2. Customer chooses booking type (Single or Couples)
3. System handles accordingly:
   - Single: Book for one person
   - Couples: Book for two people (same or different services)

## Current Issues:
- The database has 3 package services marked as `is_couples_service = true`
- This incorrectly limits them to couples only
- They should allow both single AND couples bookings