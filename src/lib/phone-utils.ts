/**
 * Phone number utilities for Guam (671) area code
 * Handles formatting, validation, and conversion for Guam phone numbers
 */

/**
 * Format a phone number to Guam format: (671) XXX-XXXX
 * @param value - Raw phone number string
 * @returns Formatted phone number
 */
export function formatGuamPhone(value: string): string {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '')
  
  // If number doesn't start with 671, add it
  let normalized = cleaned
  if (!cleaned.startsWith('671') && !cleaned.startsWith('1671')) {
    // If it's a 7-digit number, prepend 671
    if (cleaned.length === 7) {
      normalized = '671' + cleaned
    } else if (cleaned.length === 10 && cleaned.startsWith('1')) {
      // Handle 1-671-XXX-XXXX format
      normalized = cleaned.substring(1)
    } else if (cleaned.length === 11 && cleaned.startsWith('1671')) {
      // Handle 1-671-XXX-XXXX format
      normalized = cleaned.substring(1)
    }
  }
  
  // Remove country code if present
  if (normalized.startsWith('1671')) {
    normalized = normalized.substring(1)
  }
  
  // Format based on length
  if (normalized.length === 0) {
    return ''
  } else if (normalized.length <= 3) {
    return `(${normalized}`
  } else if (normalized.length <= 6) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`
  } else if (normalized.length <= 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}${normalized.length > 6 ? '-' + normalized.slice(6, 10) : ''}`
  }
  
  // Max length is 10 digits (671 + 7 digits)
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`
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
 * Validate if a phone number is a valid Guam number
 * @param value - Phone number (formatted or unformatted)
 * @returns True if valid Guam phone number
 */
export function validateGuamPhone(value: string): boolean {
  const cleaned = unformatPhone(value)
  
  // Valid formats:
  // 671XXXXXXX (10 digits starting with 671)
  // 1671XXXXXXX (11 digits starting with 1671)
  // XXXXXXX (7 digits - will be prefixed with 671)
  
  if (cleaned.length === 7) {
    // 7-digit local number - valid
    return /^[2-9]\d{6}$/.test(cleaned)
  } else if (cleaned.length === 10) {
    // Must start with 671
    return /^671[2-9]\d{6}$/.test(cleaned)
  } else if (cleaned.length === 11) {
    // Must start with 1671
    return /^1671[2-9]\d{6}$/.test(cleaned)
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
  
  if (!validateGuamPhone(value)) {
    return 'Please enter a valid Guam phone number'
  }
  
  return ''
}

/**
 * Format phone number for database storage (raw format)
 * Always stores as 10 digits: 671XXXXXXX
 * @param value - Phone number in any format
 * @returns Normalized phone number for database
 */
export function normalizePhoneForDB(value: string): string {
  const cleaned = unformatPhone(value)
  
  // If it's a 7-digit number, prepend 671
  if (cleaned.length === 7) {
    return '671' + cleaned
  }
  
  // If it starts with 1671, remove the 1
  if (cleaned.startsWith('1671')) {
    return cleaned.substring(1)
  }
  
  // If it starts with 1 and is 11 digits, assume it's 1-671-XXX-XXXX
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1)
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
  
  // Database should store as 671XXXXXXX (10 digits)
  // But handle various formats for backward compatibility
  const cleaned = unformatPhone(value)
  
  if (cleaned.length === 10 && cleaned.startsWith('671')) {
    return formatGuamPhone(cleaned)
  } else if (cleaned.length === 7) {
    // Old format without area code
    return formatGuamPhone('671' + cleaned)
  } else {
    // Fallback - try to format whatever we have
    return formatGuamPhone(cleaned)
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
  return formatGuamPhone(cleaned)
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
  return formatGuamPhone(value)
}

/**
 * Check if phone number is complete (has all 10 digits)
 * @param value - Phone number to check
 * @returns True if phone number is complete
 */
export function isPhoneComplete(value: string): boolean {
  const cleaned = unformatPhone(value)
  return cleaned.length === 10 || (cleaned.length === 7 && !cleaned.startsWith('671'))
}

/**
 * Get international format for phone number
 * @param value - Phone number in any format
 * @returns International format: +1-671-XXX-XXXX
 */
export function getInternationalFormat(value: string): string {
  const normalized = normalizePhoneForDB(value)
  
  if (normalized.length === 10 && normalized.startsWith('671')) {
    return `+1-${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }
  
  return value // Return original if can't format
}