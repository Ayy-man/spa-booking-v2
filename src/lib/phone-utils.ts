/**
 * Phone number utilities for general US/Canada phone numbers
 * Handles formatting, validation, and conversion for any area code
 * Auto-formats with brackets for readability: (XXX) XXX-XXXX
 */

/**
 * Format a phone number to standard format: (XXX) XXX-XXXX
 * @param value - Raw phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '')
  
  // Format based on length
  if (cleaned.length === 0) {
    return ''
  } else if (cleaned.length <= 3) {
    return `(${cleaned}`
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
  } else if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}${cleaned.length > 6 ? '-' + cleaned.slice(6, 10) : ''}`
  }
  
  // Max length is 10 digits (area code + 7 digits)
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
}

/**
 * Remove formatting from phone number, keeping only digits
 * @param value - Formatted phone number
 * @returns Raw phone number (digits only)
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Validate if a phone number is a valid US/Canada number
 * @param value - Phone number (formatted or unformatted)
 * @returns True if valid phone number
 */
export function validatePhoneNumber(value: string): boolean {
  const cleaned = unformatPhone(value)
  
  // Valid formats:
  // XXXXXXX (7 digits - local number)
  // XXXXXXXX (10 digits - area code + local number)
  // 1XXXXXXXXXX (11 digits - country code + area code + local number)
  
  if (cleaned.length === 7) {
    // 7-digit local number - valid
    return /^[2-9]\d{6}$/.test(cleaned)
  } else if (cleaned.length === 10) {
    // 10-digit number with area code
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(cleaned)
  } else if (cleaned.length === 11) {
    // 11-digit number starting with 1 (US/Canada country code)
    return /^1[2-9]\d{2}[2-9]\d{6}$/.test(cleaned)
  }
  
  return false
}

/**
 * Get validation error message for invalid phone
 * @param value - Phone number being validated
 * @returns Error message or empty string if valid
 */
export function getPhoneValidationError(value: string): string {
  const cleaned = unformatPhone(value)
  
  if (!value || cleaned.length === 0) {
    return 'Phone number is required'
  }
  
  if (cleaned.length < 7) {
    return 'Phone number is too short'
  }
  
  if (cleaned.length > 11) {
    return 'Phone number is too long'
  }
  
  if (!validatePhoneNumber(value)) {
    return 'Please enter a valid phone number'
  }
  
  return ''
}

/**
 * Format phone number for database storage (raw format)
 * Stores as 10 digits: XXXXXXXX (area code + local number)
 * @param value - Phone number in any format
 * @returns Normalized phone number for database
 */
export function normalizePhoneForDB(value: string): string {
  const cleaned = unformatPhone(value)
  
  // If it's a 7-digit number, we can't determine area code
  // User must provide area code for 7-digit numbers
  if (cleaned.length === 7) {
    return cleaned // Return as-is, user needs to add area code
  }
  
  // If it starts with 1 and is 11 digits, remove the country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1)
  }
  
  // If it's 10 digits, return as-is
  if (cleaned.length === 10) {
    return cleaned
  }
  
  return cleaned
}

/**
 * Format phone number for display from database
 * @param value - Raw phone number from database
 * @returns Formatted phone number for display
 */
export function formatPhoneFromDB(value: string | null | undefined): string {
  if (!value) return ''
  
  // Database should store as XXXXXXXX (10 digits: area code + local number)
  // But handle various formats for backward compatibility
  const cleaned = unformatPhone(value)
  
  if (cleaned.length === 10) {
    return formatPhoneNumber(cleaned)
  } else if (cleaned.length === 7) {
    // Old format without area code - can't format properly
    return cleaned
  } else {
    // Fallback - try to format whatever we have
    return formatPhoneNumber(cleaned)
  }
}

/**
 * Handle paste event for phone input
 * @param event - Clipboard event
 * @returns Formatted phone number or null if invalid
 */
export function handlePhonePaste(event: React.ClipboardEvent<HTMLInputElement>): string | null {
  event.preventDefault()
  const pasted = event.clipboardData.getData('text')
  
  // Clean and validate the pasted content
  const cleaned = unformatPhone(pasted)
  
  // Only accept numeric content
  if (!/^\d+$/.test(cleaned)) {
    return null
  }
  
  // Format the pasted number
  return formatPhoneNumber(cleaned)
}

/**
 * Handle phone input change with formatting
 * @param value - Current input value
 * @param previousValue - Previous input value (for backspace detection)
 * @returns Formatted value or original if backspacing
 */
export function handlePhoneInputChange(value: string, previousValue: string = ''): string {
  // Detect backspace
  if (value.length < previousValue.length) {
    // If user is deleting, let them delete without reformatting
    const diff = previousValue.length - value.length
    
    // If they deleted a formatting character, delete the digit before it too
    if (diff === 1 && /[\(\)\s\-]/.test(previousValue[value.length])) {
      return value.slice(0, -1)
    }
    
    return value
  }
  
  // Format on typing
  return formatPhoneNumber(value)
}

/**
 * Check if phone number is complete (has all required digits)
 * @param value - Phone number to check
 * @returns True if phone number is complete
 */
export function isPhoneComplete(value: string): boolean {
  const cleaned = unformatPhone(value)
  return cleaned.length === 10 || cleaned.length === 7
}

/**
 * Get international format for phone number
 * @param value - Phone number in any format
 * @returns International format: +1-XXX-XXX-XXXX
 */
export function getInternationalFormat(value: string): string {
  const normalized = normalizePhoneForDB(value)
  
  if (normalized.length === 10) {
    return `+1-${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }
  
  return value // Return original if can't format
}

// Legacy function names for backward compatibility
export const formatGuamPhone = formatPhoneNumber
export const validateGuamPhone = validatePhoneNumber