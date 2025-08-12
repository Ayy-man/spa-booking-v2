/**
 * Booking Step Validation Utilities
 * Centralized validation logic for ensuring users complete each step in order
 */

import { loadBookingState, BookingState } from './booking-state-manager'

export interface ValidationResult {
  isValid: boolean
  redirectTo?: string
  message?: string
}

/**
 * Validate that user has selected a service (Step 1)
 */
export function validateServiceSelection(): ValidationResult {
  const state = loadBookingState()
  
  if (!state) {
    return {
      isValid: false,
      redirectTo: '/booking',
      message: 'Please start by selecting a service'
    }
  }
  
  const hasService = state.bookingData?.primaryService || state.selectedService
  
  if (!hasService) {
    return {
      isValid: false,
      redirectTo: '/booking',
      message: 'Please select a service first'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate that user has selected date and time (Step 2)
 */
export function validateDateTimeSelection(): ValidationResult {
  // First check service selection
  const serviceValidation = validateServiceSelection()
  if (!serviceValidation.isValid) {
    return serviceValidation
  }
  
  const state = loadBookingState()!
  
  if (!state.selectedDate || !state.selectedTime) {
    return {
      isValid: false,
      redirectTo: '/booking/date-time',
      message: 'Please select a date and time'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate that user has selected staff (Step 3)
 */
export function validateStaffSelection(): ValidationResult {
  // First check date/time selection
  const dateTimeValidation = validateDateTimeSelection()
  if (!dateTimeValidation.isValid) {
    return dateTimeValidation
  }
  
  const state = loadBookingState()!
  
  if (!state.selectedStaff) {
    return {
      isValid: false,
      redirectTo: '/booking/staff',
      message: 'Please select a staff member'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate that user has provided customer info (Step 4)
 */
export function validateCustomerInfo(): ValidationResult {
  // First check staff selection
  const staffValidation = validateStaffSelection()
  if (!staffValidation.isValid) {
    return staffValidation
  }
  
  const state = loadBookingState()!
  
  if (!state.customerInfo) {
    return {
      isValid: false,
      redirectTo: '/booking/customer-info',
      message: 'Please provide your information'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate that user has completed payment selection (Step 5)
 */
export function validatePaymentSelection(): ValidationResult {
  // First check customer info
  const customerValidation = validateCustomerInfo()
  if (!customerValidation.isValid) {
    return customerValidation
  }
  
  const state = loadBookingState()!
  
  // New customers go straight to payment, skip payment selection
  if (state.customerInfo?.isNewCustomer) {
    return { isValid: true }
  }
  
  // Payment selection step removed - go directly to confirmation
  // Payment type is determined automatically based on customer status
  
  return { isValid: true }
}

/**
 * Get the current step based on booking state
 */
export function getCurrentStep(): number {
  const serviceValidation = validateServiceSelection()
  if (!serviceValidation.isValid) return 1
  
  const dateTimeValidation = validateDateTimeSelection()
  if (!dateTimeValidation.isValid) return 2
  
  const staffValidation = validateStaffSelection()
  if (!staffValidation.isValid) return 3
  
  const customerValidation = validateCustomerInfo()
  if (!customerValidation.isValid) return 4
  
  const paymentValidation = validatePaymentSelection()
  if (!paymentValidation.isValid) return 5
  
  return 6 // Complete/Confirmation
}

/**
 * Check if user can access a specific step
 */
export function canAccessStep(step: number): ValidationResult {
  switch (step) {
    case 1: // Service selection - always accessible
      return { isValid: true }
      
    case 2: // Date/time selection
      return validateServiceSelection()
      
    case 3: // Staff selection
      return validateDateTimeSelection()
      
    case 4: // Customer info
      return validateStaffSelection()
      
    case 5: // Payment selection
      return validateCustomerInfo()
      
    case 6: // Confirmation
      return validatePaymentSelection()
      
    default:
      return {
        isValid: false,
        redirectTo: '/booking',
        message: 'Invalid step'
      }
  }
}

/**
 * Validate and redirect if necessary
 * Returns true if validation passes, false if redirecting
 */
export function validateAndRedirect(requiredStep: number): boolean {
  const validation = canAccessStep(requiredStep)
  
  if (!validation.isValid && validation.redirectTo) {
    console.log(`[StepValidation] Redirecting to ${validation.redirectTo}: ${validation.message}`)
    window.location.href = validation.redirectTo
    return false
  }
  
  return validation.isValid
}

/**
 * Get step names for display
 */
export function getStepName(step: number): string {
  const stepNames = {
    1: 'Service Selection',
    2: 'Date & Time',
    3: 'Staff Selection', 
    4: 'Customer Information',
    5: 'Payment Options',
    6: 'Confirmation'
  }
  
  return stepNames[step as keyof typeof stepNames] || 'Unknown Step'
}

/**
 * Get the URL for a step
 */
export function getStepUrl(step: number): string {
  const stepUrls = {
    1: '/booking',
    2: '/booking/date-time',
    3: '/booking/staff',
    4: '/booking/customer-info',
    5: '/booking/confirmation',
    6: '/booking/confirmation'
  }
  
  return stepUrls[step as keyof typeof stepUrls] || '/booking'
}