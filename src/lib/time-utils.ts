/**
 * Time utility functions for consistent time handling across the application
 * Ensures safe processing of time values and prevents "Invalid" errors
 */

/**
 * Validates if a time string is in valid format
 */
export function isValidTimeString(time: any): boolean {
  if (!time || typeof time !== 'string') return false
  
  // Check for HH:MM or HH:MM:SS format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
  return timeRegex.test(time)
}

/**
 * Safely formats a time string to HH:MM format
 * Returns null if invalid
 */
export function formatTimeToHHMM(time: any): string | null {
  if (!isValidTimeString(time)) return null
  
  // If already in HH:MM format, return as is
  if (time.length === 5) return time
  
  // If in HH:MM:SS format, extract HH:MM
  if (time.length === 8) return time.slice(0, 5)
  
  return null
}

/**
 * Safely extracts and formats time from a database slot object
 */
export function extractTimeFromSlot(slot: any): string | null {
  if (!slot) return null
  
  const time = slot.available_time || slot.time || slot
  return formatTimeToHHMM(time)
}

/**
 * Validates and formats an array of time slots
 * Filters out invalid entries
 */
export function processTimeSlots(slots: any[]): string[] {
  if (!Array.isArray(slots)) return []
  
  return slots
    .map(slot => extractTimeFromSlot(slot))
    .filter((time): time is string => time !== null)
    .sort()
}

/**
 * Ensures a time value is valid for database insertion
 * Returns formatted time or throws descriptive error
 */
export function validateTimeForDatabase(time: any, fieldName: string = 'time'): string {
  const formatted = formatTimeToHHMM(time)
  
  if (!formatted) {
    throw new Error(`Invalid ${fieldName} value: "${time}". Expected format: HH:MM or HH:MM:SS`)
  }
  
  // PostgreSQL accepts both HH:MM and HH:MM:SS, but we'll standardize on HH:MM:SS
  return formatted.length === 5 ? `${formatted}:00` : formatted
}

/**
 * Combines date and time into ISO string for database
 */
export function combineDateAndTime(date: Date | string, time: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const [hours, minutes] = time.split(':').map(Number)
  
  const combined = new Date(dateObj)
  combined.setHours(hours, minutes, 0, 0)
  
  return combined.toISOString()
}

/**
 * Parses time from various formats safely
 */
export function parseTimeString(timeValue: any): string {
  // Handle null/undefined
  if (!timeValue) {
    console.warn('[time-utils] Received null/undefined time value')
    return '09:00' // Default fallback
  }
  
  // Handle string
  if (typeof timeValue === 'string') {
    // Check if it's a valid time format
    const formatted = formatTimeToHHMM(timeValue)
    if (formatted) return formatted
    
    // Check if it's an ISO date string, extract time
    if (timeValue.includes('T')) {
      const timePart = timeValue.split('T')[1]
      if (timePart) {
        const formatted = formatTimeToHHMM(timePart.slice(0, 8))
        if (formatted) return formatted
      }
    }
  }
  
  console.warn(`[time-utils] Could not parse time value: ${timeValue}`)
  return '09:00' // Default fallback
}

/**
 * Safely extracts time in HH:MM format from a potentially invalid time string
 * This function prevents "Invalid" errors from being truncated to "Inval"
 */
export function safeTimeSlice(timeValue: any): string {
  // First validate the time
  if (!timeValue || typeof timeValue !== 'string') {
    console.warn('[time-utils] safeTimeSlice: Invalid time value', timeValue)
    return '09:00'
  }
  
  // Check if it looks like a valid time before slicing
  if (!isValidTimeString(timeValue) && !timeValue.includes(':')) {
    console.warn('[time-utils] safeTimeSlice: Time does not contain colon', timeValue)
    return '09:00'
  }
  
  // If it's already in HH:MM format, return as is
  if (timeValue.length === 5 && isValidTimeString(timeValue)) {
    return timeValue
  }
  
  // If it's longer (like HH:MM:SS), extract the HH:MM part
  if (timeValue.length >= 5) {
    const sliced = timeValue.slice(0, 5)
    if (isValidTimeString(sliced)) {
      return sliced
    }
  }
  
  // Last resort: try to parse it through formatTimeToHHMM
  const formatted = formatTimeToHHMM(timeValue)
  if (formatted) return formatted
  
  console.warn('[time-utils] safeTimeSlice: Could not safely extract time from', timeValue)
  return '09:00'
}