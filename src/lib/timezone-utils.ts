/**
 * Centralized timezone utilities for the spa booking system
 * All times are handled in Pacific/Guam timezone (UTC+10, no DST)
 */

import { 
  utcToZonedTime, 
  zonedTimeToUtc, 
  format as formatTz,
  getTimezoneOffset 
} from 'date-fns-tz'
import { 
  startOfDay, 
  endOfDay, 
  addHours, 
  isAfter, 
  isBefore,
  isSameDay,
  parseISO,
  format,
  addMinutes
} from 'date-fns'

// Guam timezone constant
export const GUAM_TIMEZONE = 'Pacific/Guam'

// Business hours configuration
export const BUSINESS_HOURS = {
  OPEN: 9,  // 9 AM
  CLOSE: 19, // 7 PM
  MINIMUM_ADVANCE_HOURS: 2 // 2 hours advance booking required
}

/**
 * Get current time in Guam timezone
 */
export function getGuamTime(): Date {
  const now = new Date()
  return utcToZonedTime(now, GUAM_TIMEZONE)
}

/**
 * Convert any date to Guam timezone
 */
export function toGuamTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return utcToZonedTime(dateObj, GUAM_TIMEZONE)
}

/**
 * Convert Guam time to UTC for database storage
 */
export function fromGuamTimeToUTC(date: Date): Date {
  return zonedTimeToUtc(date, GUAM_TIMEZONE)
}

/**
 * Check if a date is today in Guam timezone
 */
export function isGuamToday(date: Date | string): boolean {
  const guamNow = getGuamTime()
  const guamDate = toGuamTime(date)
  return isSameDay(guamNow, guamDate)
}

/**
 * Get start of day in Guam timezone (returns UTC for database queries)
 */
export function getGuamStartOfDay(date?: Date | string): string {
  const guamDate = date ? toGuamTime(date) : getGuamTime()
  const startOfGuamDay = startOfDay(guamDate)
  const utcDate = fromGuamTimeToUTC(startOfGuamDay)
  return utcDate.toISOString()
}

/**
 * Get end of day in Guam timezone (returns UTC for database queries)
 */
export function getGuamEndOfDay(date?: Date | string): string {
  const guamDate = date ? toGuamTime(date) : getGuamTime()
  const endOfGuamDay = endOfDay(guamDate)
  const utcDate = fromGuamTimeToUTC(endOfGuamDay)
  return utcDate.toISOString()
}

/**
 * Format date/time for display in Guam timezone
 */
export function formatGuamTime(date: Date | string, formatString: string = 'PPpp'): string {
  const guamDate = toGuamTime(date)
  return formatTz(guamDate, formatString, { timeZone: GUAM_TIMEZONE })
}

/**
 * Get minimum bookable time (current time + 2 hours in Guam)
 */
export function getMinBookingTime(): Date {
  const guamNow = getGuamTime()
  return addHours(guamNow, BUSINESS_HOURS.MINIMUM_ADVANCE_HOURS)
}

/**
 * Check if a time slot is bookable (at least 2 hours in advance)
 */
export function isTimeSlotBookable(slotTime: Date | string): boolean {
  const guamSlotTime = toGuamTime(slotTime)
  const minBookingTime = getMinBookingTime()
  return isAfter(guamSlotTime, minBookingTime)
}

/**
 * Get Guam date string in YYYY-MM-DD format
 */
export function getGuamDateString(date?: Date | string): string {
  const guamDate = date ? toGuamTime(date) : getGuamTime()
  return format(guamDate, 'yyyy-MM-dd')
}

/**
 * Get Guam time string in HH:mm format
 */
export function getGuamTimeString(date: Date | string): string {
  const guamDate = toGuamTime(date)
  return format(guamDate, 'HH:mm')
}

/**
 * Create a Date object for a specific time on a specific date in Guam
 */
export function createGuamDateTime(dateString: string, timeString: string): Date {
  // Combine date and time strings
  const dateTimeString = `${dateString}T${timeString}:00`
  
  // Parse as local time in Guam timezone
  const guamDateTime = parseISO(dateTimeString)
  
  // Convert to UTC for storage
  return zonedTimeToUtc(guamDateTime, GUAM_TIMEZONE)
}

/**
 * Check if business is open at a given time
 */
export function isBusinessOpen(date?: Date | string): boolean {
  const guamDate = date ? toGuamTime(date) : getGuamTime()
  const hours = guamDate.getHours()
  return hours >= BUSINESS_HOURS.OPEN && hours < BUSINESS_HOURS.CLOSE
}

/**
 * Get next available booking time (respecting 2-hour advance and business hours)
 */
export function getNextAvailableBookingTime(): Date {
  const minTime = getMinBookingTime()
  
  // Check if minimum time is within business hours
  const minHours = minTime.getHours()
  
  // If before business hours, set to opening time
  if (minHours < BUSINESS_HOURS.OPEN) {
    minTime.setHours(BUSINESS_HOURS.OPEN, 0, 0, 0)
    return minTime
  }
  
  // If after business hours, set to next day opening
  if (minHours >= BUSINESS_HOURS.CLOSE - 1) {
    const nextDay = new Date(minTime)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(BUSINESS_HOURS.OPEN, 0, 0, 0)
    return nextDay
  }
  
  // Round up to next 15-minute slot
  const minutes = minTime.getMinutes()
  const roundedMinutes = Math.ceil(minutes / 15) * 15
  if (roundedMinutes === 60) {
    return addHours(minTime, 1).setMinutes(0, 0, 0) as unknown as Date
  } else {
    minTime.setMinutes(roundedMinutes, 0, 0)
    return minTime
  }
}

/**
 * Convert UTC database timestamp to Guam display time
 */
export function formatDatabaseTime(utcTimestamp: string, formatString: string = 'PPp'): string {
  return formatGuamTime(utcTimestamp, formatString)
}

/**
 * Get offset between UTC and Guam time in hours
 */
export function getGuamOffset(): number {
  const offset = getTimezoneOffset(GUAM_TIMEZONE, new Date())
  return offset / (1000 * 60 * 60) // Convert milliseconds to hours
}

/**
 * Check if a date is in the past (Guam timezone)
 */
export function isGuamPast(date: Date | string): boolean {
  const guamDate = toGuamTime(date)
  const guamNow = getGuamTime()
  return isBefore(guamDate, guamNow)
}

/**
 * Check if a date is in the future (Guam timezone)
 */
export function isGuamFuture(date: Date | string): boolean {
  const guamDate = toGuamTime(date)
  const guamNow = getGuamTime()
  return isAfter(guamDate, guamNow)
}

/**
 * Get the day of week in Guam timezone (0 = Sunday, 6 = Saturday)
 */
export function getGuamDayOfWeek(date?: Date | string): number {
  const guamDate = date ? toGuamTime(date) : getGuamTime()
  return guamDate.getDay()
}

/**
 * Format time slot for display (e.g., "2:00 PM")
 */
export function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return format(date, 'h:mm a')
}

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(): boolean {
  const guamNow = getGuamTime()
  const currentHour = guamNow.getHours()
  const currentMinutes = guamNow.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinutes
  
  const openTimeInMinutes = BUSINESS_HOURS.OPEN * 60
  const closeTimeInMinutes = BUSINESS_HOURS.CLOSE * 60
  
  return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes
}

/**
 * Get remaining business hours for today
 */
export function getRemainingBusinessHours(): number {
  const guamNow = getGuamTime()
  const currentHour = guamNow.getHours()
  const currentMinutes = guamNow.getMinutes()
  
  if (currentHour >= BUSINESS_HOURS.CLOSE) {
    return 0
  }
  
  if (currentHour < BUSINESS_HOURS.OPEN) {
    return BUSINESS_HOURS.CLOSE - BUSINESS_HOURS.OPEN
  }
  
  const remainingHours = BUSINESS_HOURS.CLOSE - currentHour
  const remainingMinutes = currentMinutes > 0 ? (60 - currentMinutes) / 60 : 0
  
  return Math.max(0, remainingHours - remainingMinutes)
}

/**
 * Debug function to log timezone information
 */
export function debugTimezone(label: string = 'Timezone Debug'): void {
  const localTime = new Date()
  const guamTime = getGuamTime()
  const offset = getGuamOffset()
  
}