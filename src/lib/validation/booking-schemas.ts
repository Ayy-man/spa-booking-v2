/**
 * Zod validation schemas for booking-related data
 * Provides runtime type safety and input validation
 */

import { z } from 'zod'
import { validateGuamPhone, normalizePhoneForDB } from '@/lib/phone-utils'

// Phone number validation for Guam (671) area code
// Accepts formats: (671) XXX-XXXX, 671-XXX-XXXX, 671XXXXXXX, XXXXXXX (7 digits)
const guamPhoneRegex = /^(\(671\)\s?|671[\-\.]?)?[2-9]\d{2}[\-\.]?\d{4}$/
const phoneRegex = guamPhoneRegex // Backward compatibility alias

// Email validation with additional security checks
const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim()

// Safe string schema that prevents XSS
const safeStringSchema = z.string()
  .trim()
  .min(1, 'This field is required')
  .max(500, 'Text is too long')
  .regex(/^[^<>]*$/, 'Invalid characters detected')

// Customer information schema
export const customerInfoSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  
  email: emailSchema,
  
  phone: z.string()
    .trim()
    .transform((val) => normalizePhoneForDB(val)) // Normalize to 671XXXXXXX format
    .refine((val) => val === '' || validateGuamPhone(val), {
      message: 'Please enter a valid Guam phone number'
    })
    .optional()
    .or(z.literal('')),
  
  isNewCustomer: z.boolean(),
  
  marketingConsent: z.boolean().optional()
})

// Service selection schema
export const serviceSelectionSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
  serviceName: safeStringSchema,
  price: z.number()
    .positive('Price must be positive')
    .max(10000, 'Price exceeds maximum'),
  duration: z.number()
    .int('Duration must be whole number')
    .positive('Duration must be positive')
    .max(480, 'Duration exceeds 8 hours')
})

// Date and time selection schema
export const dateTimeSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  
  time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  timezone: z.string().optional()
})

// Staff selection schema
export const staffSelectionSchema = z.object({
  staffId: z.string()
    .min(1, 'Staff selection is required'),
  
  staffName: safeStringSchema,
  
  roomId: z.number()
    .int('Room ID must be integer')
    .positive('Invalid room ID')
})

// Payment option schema
export const paymentOptionSchema = z.object({
  paymentType: z.enum(['full', 'deposit', 'location'], {
    errorMap: () => ({ message: 'Invalid payment option' })
  }),
  
  amount: z.number()
    .nonnegative('Amount cannot be negative')
    .max(10000, 'Amount exceeds maximum')
})

// Complete booking request schema
export const bookingRequestSchema = z.object({
  customer: customerInfoSchema,
  service: serviceSelectionSchema,
  dateTime: dateTimeSchema,
  staff: staffSelectionSchema,
  payment: paymentOptionSchema,
  notes: z.string()
    .max(1000, 'Notes are too long')
    .optional()
    .transform(val => val?.trim())
})

// Couples booking schema
export const couplesBookingSchema = bookingRequestSchema.extend({
  isCouplesBooking: z.literal(true),
  secondaryService: serviceSelectionSchema,
  secondaryStaff: staffSelectionSchema
})

// Walk-in request schema
export const walkInRequestSchema = z.object({
  customerName: safeStringSchema,
  customerPhone: z.string()
    .trim()
    .transform((val) => normalizePhoneForDB(val))
    .refine((val) => validateGuamPhone(val), {
      message: 'Please enter a valid Guam phone number'
    }),
  customerEmail: emailSchema.optional(),
  serviceName: safeStringSchema,
  serviceCategory: safeStringSchema,
  notes: z.string()
    .max(500, 'Notes are too long')
    .optional()
    .transform(val => val?.trim())
})

// Admin booking update schema
export const bookingUpdateSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded'])
    .optional(),
  internalNotes: z.string()
    .max(1000, 'Notes are too long')
    .optional()
})

// Waiver form schema
export const waiverFormSchema = z.object({
  signature: z.string()
    .min(100, 'Signature is too short')
    .max(50000, 'Signature data is too large'),
  
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms' })
  }),
  
  medicalConditions: z.string()
    .max(1000, 'Medical conditions text is too long')
    .optional(),
  
  allergies: z.string()
    .max(500, 'Allergies text is too long')
    .optional(),
  
  medications: z.string()
    .max(500, 'Medications text is too long')
    .optional(),
  
  emergencyContactName: safeStringSchema,
  emergencyContactPhone: z.string()
    .trim()
    .transform((val) => normalizePhoneForDB(val))
    .refine((val) => validateGuamPhone(val), {
      message: 'Please enter a valid Guam emergency contact phone'
    })
})

// Type exports for TypeScript
export type CustomerInfo = z.infer<typeof customerInfoSchema>
export type ServiceSelection = z.infer<typeof serviceSelectionSchema>
export type DateTime = z.infer<typeof dateTimeSchema>
export type StaffSelection = z.infer<typeof staffSelectionSchema>
export type PaymentOption = z.infer<typeof paymentOptionSchema>
export type BookingRequest = z.infer<typeof bookingRequestSchema>
export type CouplesBooking = z.infer<typeof couplesBookingSchema>
export type WalkInRequest = z.infer<typeof walkInRequestSchema>
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>
export type WaiverForm = z.infer<typeof waiverFormSchema>

// Validation helper functions
export function validateBookingRequest(data: unknown): BookingRequest {
  return bookingRequestSchema.parse(data)
}

export function validateCustomerInfo(data: unknown): CustomerInfo {
  return customerInfoSchema.parse(data)
}

export function validateWalkIn(data: unknown): WalkInRequest {
  return walkInRequestSchema.parse(data)
}

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}