/**
 * Validation utilities for spa booking forms with animation support
 */

export interface ValidationRule {
  validate: (value: string) => boolean
  message: string
  type?: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  success?: boolean
}

export interface FieldValidation {
  rules: ValidationRule[]
  required?: boolean
  requiredMessage?: string
}

/**
 * Common validation rules for spa booking forms
 */
export const validationRules = {
  // Email validation
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Please enter a valid email address'
  },

  // Phone number validation (flexible format)
  phone: {
    validate: (value: string) => /^[\+]?[\d\s\-\(\)\.]{10,}$/.test(value.replace(/\s/g, '')),
    message: 'Please enter a valid phone number'
  },

  // Name validation (at least 2 characters, letters and spaces)
  name: {
    validate: (value: string) => /^[a-zA-Z\s]{2,}$/.test(value.trim()),
    message: 'Name must be at least 2 characters and contain only letters'
  },

  // Required field validation
  required: {
    validate: (value: string) => value.trim().length > 0,
    message: 'This field is required'
  },

  // Minimum length validation
  minLength: (length: number) => ({
    validate: (value: string) => value.trim().length >= length,
    message: `Must be at least ${length} characters long`
  }),

  // Maximum length validation
  maxLength: (length: number) => ({
    validate: (value: string) => value.trim().length <= length,
    message: `Must be no more than ${length} characters long`
  }),

  // Special notes validation (optional but if provided, minimum length)
  specialNotes: {
    validate: (value: string) => value.trim().length === 0 || value.trim().length >= 10,
    message: 'Special notes should be at least 10 characters if provided',
    type: 'warning' as const
  },

  // Time format validation (HH:MM)
  time: {
    validate: (value: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value),
    message: 'Please enter a valid time format (HH:MM)'
  },

  // Date validation (not in the past)
  futureDate: {
    validate: (value: string) => {
      const date = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    },
    message: 'Please select a future date'
  }
}

/**
 * Validate a single field with multiple rules
 */
export function validateField(
  value: string,
  validation: FieldValidation
): ValidationResult {
  const trimmedValue = value.trim()

  // Check required validation first
  if (validation.required && !validationRules.required.validate(trimmedValue)) {
    return {
      isValid: false,
      error: validation.requiredMessage || validationRules.required.message
    }
  }

  // If field is not required and empty, it's valid
  if (!validation.required && trimmedValue.length === 0) {
    return { isValid: true }
  }

  // Run through all validation rules
  let warning: string | undefined

  for (const rule of validation.rules) {
    if (!rule.validate(trimmedValue)) {
      if (rule.type === 'warning') {
        warning = rule.message
      } else {
        return {
          isValid: false,
          error: rule.message
        }
      }
    }
  }

  return {
    isValid: true,
    warning,
    success: trimmedValue.length > 0 // Show success for non-empty valid fields
  }
}

/**
 * Validate multiple fields at once
 */
export function validateForm(
  values: Record<string, string>,
  validations: Record<string, FieldValidation>
): {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  results: Record<string, ValidationResult>
} {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  const results: Record<string, ValidationResult> = {}

  let isFormValid = true

  for (const [fieldName, validation] of Object.entries(validations)) {
    const value = values[fieldName] || ''
    const result = validateField(value, validation)
    
    results[fieldName] = result

    if (!result.isValid && result.error) {
      errors[fieldName] = result.error
      isFormValid = false
    }

    if (result.warning) {
      warnings[fieldName] = result.warning
    }
  }

  return {
    isValid: isFormValid,
    errors,
    warnings,
    results
  }
}

/**
 * Real-time validation with debouncing support
 */
export class RealTimeValidator {
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private validations: Record<string, FieldValidation>
  private debounceMs: number

  constructor(validations: Record<string, FieldValidation>, debounceMs = 300) {
    this.validations = validations
    this.debounceMs = debounceMs
  }

  validateField(
    fieldName: string,
    value: string,
    callback: (result: ValidationResult) => void,
    immediate = false
  ): void {
    const validation = this.validations[fieldName]
    if (!validation) return

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(fieldName)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const validate = () => {
      const result = validateField(value, validation)
      callback(result)
    }

    if (immediate) {
      validate()
    } else {
      const timeout = setTimeout(validate, this.debounceMs)
      this.timeouts.set(fieldName, timeout)
    }
  }

  cleanup(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
  }
}

/**
 * Predefined validation configurations for common spa booking forms
 */
export const bookingValidations = {
  customerInfo: {
    firstName: {
      rules: [validationRules.name],
      required: true,
      requiredMessage: 'First name is required'
    },
    lastName: {
      rules: [validationRules.name],
      required: true,
      requiredMessage: 'Last name is required'
    },
    email: {
      rules: [validationRules.email],
      required: true,
      requiredMessage: 'Email address is required'
    },
    phone: {
      rules: [validationRules.phone],
      required: true,
      requiredMessage: 'Phone number is required'
    },
    specialRequests: {
      rules: [validationRules.specialNotes],
      required: false
    }
  },

  appointmentDetails: {
    selectedDate: {
      rules: [validationRules.futureDate],
      required: true,
      requiredMessage: 'Please select an appointment date'
    },
    selectedTime: {
      rules: [validationRules.time],
      required: true,
      requiredMessage: 'Please select an appointment time'
    }
  },

  contactForm: {
    name: {
      rules: [validationRules.name],
      required: true,
      requiredMessage: 'Name is required'
    },
    email: {
      rules: [validationRules.email],
      required: true,
      requiredMessage: 'Email address is required'
    },
    message: {
      rules: [validationRules.minLength(10)],
      required: true,
      requiredMessage: 'Message is required'
    }
  }
}

/**
 * Utility to create animated validation message props
 */
export function createValidationMessageProps(
  result: ValidationResult,
  showAnimations: boolean = true
) {
  return {
    error: result.error,
    success: result.success ? 'Valid' : undefined,
    warning: result.warning,
    showAnimation: showAnimations
  }
}