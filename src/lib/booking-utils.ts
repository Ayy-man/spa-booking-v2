// Utility functions for booking logic
// These utilities can be used by both client and server components

import { supabase } from '@/lib/supabase'
import { COUPLES_ROOM_CONFIG, STAFF_ASSIGNMENT_CONFIG } from '@/lib/business-config'
import { staffNameMap, canDatabaseStaffPerformService, isDatabaseStaffAvailableOnDate, getServiceCategory } from '@/lib/staff-data'
import { addMinutes, parseISO, format } from 'date-fns'

/**
 * Utility function for checking if a booking is a special staff request
 * @param booking - The booking object to check
 * @returns boolean - true if customer specifically requested this staff member
 */
export function isSpecialStaffRequest(booking: any): boolean {
  // Check if customer specifically requested this staff member
  // (as opposed to selecting "Any Available" which would be staff_id: 'any-available')
  if (!booking || booking.staff_id === undefined || booking.staff_id === null || booking.staff_id === '') {
    return false
  }
  return booking.staff_id !== 'any-available' && booking.staff_id !== 'any' && booking.staff_id !== 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
}

/**
 * Check if a service requires couples booking
 * @param serviceName - Name of the service
 * @returns boolean - true if service is for couples
 */
export function isCouplesService(serviceName: string): boolean {
  if (!serviceName || typeof serviceName !== 'string') {
    return false
  }
  const couplesKeywords = ['couples', 'couple', 'duo', 'double', 'partner']
  return couplesKeywords.some(keyword => 
    serviceName.toLowerCase().includes(keyword)
  )
}

/**
 * Get booking duration in minutes based on service
 * @param serviceName - Name of the service
 * @returns number - Duration in minutes
 */
export function getBookingDuration(serviceName: string): number {
  if (!serviceName || typeof serviceName !== 'string') {
    return 60 // Default duration
  }
  
  // Default durations for different service types
  // Order matters - more specific matches should come first
  const durationMap: Record<string, number> = {
    'deep cleansing facial': 75,
    'anti-aging facial': 90,
    'hydrating facial': 60,
    'couples massage': 90,
    'body scrub': 45,
    'facial': 60,
    'massage': 90
  }
  
  const lowerServiceName = serviceName.toLowerCase()
  
  // Find matching service type (first match wins, so specific matches come first)
  for (const [key, duration] of Object.entries(durationMap)) {
    if (lowerServiceName.includes(key)) {
      return duration
    }
  }
  
  // Default to 60 minutes if no match found
  return 60
}

/**
 * Check if a service can only be performed in a specific room
 * @param serviceName - Name of the service
 * @returns string | null - Room restriction or null if no restriction
 */
export function getServiceRoomRestriction(serviceName: string): string | null {
  if (!serviceName || typeof serviceName !== 'string') {
    return null
  }
  
  const lowerServiceName = serviceName.toLowerCase()
  
  // Body scrubs can only be done in Room 3 (has special equipment)
  // This takes precedence over couples requirement
  if (lowerServiceName.includes('body scrub') || lowerServiceName.includes('scrub')) {
    return 'Room 3'
  }
  
  // Couples services need larger rooms (Room 2 or 3, not Room 1)
  if (isCouplesService(serviceName)) {
    return 'Room 1 or 2'
  }
  
  return null
}

/**
 * Format booking time for display
 * @param timeString - Time in HH:MM format
 * @returns string - Formatted time
 */
export function formatBookingTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return timeString
  }
}

/**
 * Get booking status color for UI
 * @param status - Booking status
 * @returns string - CSS color class
 */
export function getBookingStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'confirmed': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'cancelled': 'bg-red-100 text-red-800',
    'completed': 'bg-blue-100 text-blue-800',
    'no_show': 'bg-gray-100 text-gray-800'
  }
  
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

// ==================== STAFF RESOLUTION FUNCTIONS ====================

/**
 * Interface for staff resolution result
 */
interface StaffResolutionResult {
  id: string
  name: string
  isResolved: boolean
  originalId: string
  error?: string
}

/**
 * Resolve "any" staff selection to actual available staff member
 * @param staffId - Selected staff ID (could be "any" or specific staff)
 * @param serviceName - Name of the service to be performed
 * @param appointmentDate - Date of appointment (YYYY-MM-DD format)
 * @param startTime - Start time (HH:MM format)
 * @param duration - Service duration in minutes
 * @returns StaffResolutionResult with resolved staff or error
 */
export async function resolveStaffForBooking(
  staffId: string,
  serviceName: string,
  appointmentDate: string,
  startTime: string,
  duration: number
): Promise<StaffResolutionResult> {
  // If not "any" staff, validate the specific staff
  if (staffId !== STAFF_ASSIGNMENT_CONFIG.anyStaffAlias && 
      staffId !== STAFF_ASSIGNMENT_CONFIG.anyStaffId) {
    
    // Validate specific staff can perform service and is available
    try {
      const { data: specificStaff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .eq('is_active', true)
        .single()

      if (error || !specificStaff) {
        return {
          id: staffId,
          name: staffNameMap[staffId as keyof typeof staffNameMap] || staffId,
          isResolved: false,
          originalId: staffId,
          error: 'Selected staff member not found or inactive'
        }
      }

      const serviceCategory = getServiceCategory(serviceName)
      const canPerformService = canDatabaseStaffPerformService(specificStaff, serviceCategory, serviceName)
      const availableOnDate = isDatabaseStaffAvailableOnDate(specificStaff, appointmentDate)

      if (!canPerformService) {
        return {
          id: staffId,
          name: specificStaff.name,
          isResolved: false,
          originalId: staffId,
          error: `${specificStaff.name} cannot perform ${serviceName} services`
        }
      }

      if (!availableOnDate) {
        return {
          id: staffId,
          name: specificStaff.name,
          isResolved: false,
          originalId: staffId,
          error: `${specificStaff.name} is not available on ${appointmentDate}`
        }
      }

      // Check time availability (existing bookings conflict)
      const isAvailable = await checkStaffTimeAvailability(staffId, appointmentDate, startTime, duration)
      if (!isAvailable.available) {
        const conflictDetails = isAvailable.conflictingBooking 
          ? ` (conflict with booking from ${isAvailable.conflictingBooking.start_time} to ${isAvailable.conflictingBooking.end_time})`
          : ''
        console.log(`[resolveStaffForBooking] ${specificStaff.name} unavailable:`, isAvailable.debug)
        return {
          id: staffId,
          name: specificStaff.name,
          isResolved: false,
          originalId: staffId,
          error: `${specificStaff.name} is already booked during this time${conflictDetails}`
        }
      }

      return {
        id: staffId,
        name: specificStaff.name,
        isResolved: true,
        originalId: staffId
      }
    } catch (error: any) {
      return {
        id: staffId,
        name: staffNameMap[staffId as keyof typeof staffNameMap] || staffId,
        isResolved: false,
        originalId: staffId,
        error: `Error validating staff: ${error.message}`
      }
    }
  }

  // Resolve "any" staff to actual available staff
  try {
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .neq('id', STAFF_ASSIGNMENT_CONFIG.anyStaffId) // Exclude the "any" placeholder

    if (staffError || !allStaff) {
      return {
        id: STAFF_ASSIGNMENT_CONFIG.anyStaffAlias,
        name: 'Any Available Staff',
        isResolved: false,
        originalId: staffId,
        error: 'Unable to fetch staff list'
      }
    }

    const serviceCategory = getServiceCategory(serviceName)
    
    // Filter staff that can perform this service and are available on this date
    const qualifiedStaff = allStaff.filter(staff => {
      const canPerform = canDatabaseStaffPerformService(staff, serviceCategory, serviceName)
      const availableOnDate = isDatabaseStaffAvailableOnDate(staff, appointmentDate)
      return canPerform && availableOnDate
    })

    if (qualifiedStaff.length === 0) {
      return {
        id: STAFF_ASSIGNMENT_CONFIG.anyStaffAlias,
        name: 'Any Available Staff',
        isResolved: false,
        originalId: staffId,
        error: `No staff members available who can perform ${serviceName} on ${appointmentDate}`
      }
    }

    // Check each qualified staff for time availability
    for (const staff of qualifiedStaff) {
      const timeAvailability = await checkStaffTimeAvailability(staff.id, appointmentDate, startTime, duration)
      if (timeAvailability.available) {
        return {
          id: staff.id,
          name: staff.name,
          isResolved: true,
          originalId: staffId
        }
      }
    }

    return {
      id: STAFF_ASSIGNMENT_CONFIG.anyStaffAlias,
      name: 'Any Available Staff',
      isResolved: false,
      originalId: staffId,
      error: `All qualified staff members are booked during ${startTime} on ${appointmentDate}`
    }
  } catch (error: any) {
    return {
      id: STAFF_ASSIGNMENT_CONFIG.anyStaffAlias,
      name: 'Any Available Staff',
      isResolved: false,
      originalId: staffId,
      error: `Error resolving staff: ${error.message}`
    }
  }
}

/**
 * Check if a staff member is available at a specific time
 * @param staffId - Staff member ID
 * @param appointmentDate - Date of appointment
 * @param startTime - Start time
 * @param duration - Duration in minutes
 * @returns Promise with availability result
 */
export async function checkStaffTimeAvailability(
  staffId: string,
  appointmentDate: string,
  startTime: string,
  duration: number
): Promise<{ available: boolean; conflictingBooking?: any; debug?: any }> {
  try {
    const endTime = calculateEndTimeFromDuration(startTime, duration)
    
    // Get existing bookings for this staff on this date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('staff_id', staffId)
      .eq('appointment_date', appointmentDate)
      .neq('status', 'cancelled')

    if (error) {
      console.error('[checkStaffTimeAvailability] Database error:', error)
      return { available: false, debug: { error: error.message } }
    }

    if (!existingBookings || existingBookings.length === 0) {
      console.log(`[checkStaffTimeAvailability] Staff ${staffId} has no existing bookings on ${appointmentDate}`)
      return { available: true, debug: { existingBookings: 0 } }
    }

    console.log(`[checkStaffTimeAvailability] Staff ${staffId} has ${existingBookings.length} existing bookings on ${appointmentDate}:`, existingBookings.map(b => ({
      start: b.start_time,
      end: b.end_time,
      service: b.service_id,
      status: b.status
    })))

    // Check for time conflicts with reduced buffer for couples booking validation
    const requestedStart = parseISO(`${appointmentDate}T${startTime}:00`)
    const requestedEnd = parseISO(`${appointmentDate}T${endTime}:00`)
    
    // Use smaller buffer for client-side validation (5 minutes instead of 15)
    // The database function will handle the full buffer validation
    const bufferMinutes = 5
    const bufferStart = addMinutes(requestedStart, -bufferMinutes)
    const bufferEnd = addMinutes(requestedEnd, bufferMinutes)

    console.log(`[checkStaffTimeAvailability] Checking availability for ${startTime}-${endTime} with ${bufferMinutes}min buffer`)

    for (const booking of existingBookings) {
      const bookingStart = parseISO(`${booking.appointment_date}T${booking.start_time}:00`)
      const bookingEnd = parseISO(`${booking.appointment_date}T${booking.end_time}:00`)
      
      // Add buffer to existing booking as well
      const bookingBufferStart = addMinutes(bookingStart, -bufferMinutes)
      const bookingBufferEnd = addMinutes(bookingEnd, bufferMinutes)

      // Check for overlap
      if (bufferStart < bookingBufferEnd && bufferEnd > bookingBufferStart) {
        console.log(`[checkStaffTimeAvailability] Conflict found with booking ${booking.id}: ${booking.start_time}-${booking.end_time}`)
        return { 
          available: false, 
          conflictingBooking: booking,
          debug: {
            requestedTime: `${startTime}-${endTime}`,
            conflictingTime: `${booking.start_time}-${booking.end_time}`,
            bufferUsed: bufferMinutes
          }
        }
      }
    }

    return { available: true }
  } catch (error) {
    return { available: false }
  }
}

/**
 * Resolve staff for couples booking, ensuring different staff members
 * @param primaryStaffId - Primary person's staff selection
 * @param secondaryStaffId - Secondary person's staff selection
 * @param primaryServiceName - Primary person's service
 * @param secondaryServiceName - Secondary person's service
 * @param appointmentDate - Date of appointment
 * @param startTime - Start time
 * @param primaryDuration - Primary service duration
 * @param secondaryDuration - Secondary service duration
 * @returns Promise with both staff resolutions
 */
export async function resolveStaffForCouplesBooking(
  primaryStaffId: string,
  secondaryStaffId: string,
  primaryServiceName: string,
  secondaryServiceName: string,
  appointmentDate: string,
  startTime: string,
  primaryDuration: number,
  secondaryDuration: number
): Promise<{
  primaryStaff: StaffResolutionResult
  secondaryStaff: StaffResolutionResult
  isValid: boolean
  error?: string
}> {
  console.log('[resolveStaffForCouplesBooking] Input parameters:', {
    primaryStaffId,
    secondaryStaffId,
    primaryServiceName,
    secondaryServiceName,
    appointmentDate,
    startTime,
    primaryDuration,
    secondaryDuration
  })

  // Resolve both staff selections
  const [primaryResolution, secondaryResolution] = await Promise.all([
    resolveStaffForBooking(primaryStaffId, primaryServiceName, appointmentDate, startTime, primaryDuration),
    resolveStaffForBooking(secondaryStaffId, secondaryServiceName, appointmentDate, startTime, secondaryDuration)
  ])

  console.log('[resolveStaffForCouplesBooking] Resolution results:', {
    primary: { isResolved: primaryResolution.isResolved, error: primaryResolution.error },
    secondary: { isResolved: secondaryResolution.isResolved, error: secondaryResolution.error }
  })

  // Check if both resolutions were successful
  if (!primaryResolution.isResolved) {
    return {
      primaryStaff: primaryResolution,
      secondaryStaff: secondaryResolution,
      isValid: false,
      error: `Primary staff issue: ${primaryResolution.error}`
    }
  }

  if (!secondaryResolution.isResolved) {
    return {
      primaryStaff: primaryResolution,
      secondaryStaff: secondaryResolution,
      isValid: false,
      error: `Secondary staff issue: ${secondaryResolution.error}`
    }
  }

  // Check if different staff members were resolved
  if (STAFF_ASSIGNMENT_CONFIG.requireDifferentStaffForCouples && 
      primaryResolution.id === secondaryResolution.id) {
    return {
      primaryStaff: primaryResolution,
      secondaryStaff: secondaryResolution,
      isValid: false,
      error: `Cannot book the same staff member (${primaryResolution.name}) for both people. Please select different staff or choose different time slots.`
    }
  }

  console.log('[resolveStaffForCouplesBooking] Success - both staff resolved')
  return {
    primaryStaff: primaryResolution,
    secondaryStaff: secondaryResolution,
    isValid: true
  }
}

// ==================== DURATION CALCULATION FUNCTIONS ====================

/**
 * Calculate end time from start time and duration
 * @param startTime - Start time in HH:MM format
 * @param duration - Duration in minutes
 * @returns End time in HH:MM format
 */
export function calculateEndTimeFromDuration(startTime: string, duration: number): string {
  try {
    const today = new Date()
    const startDateTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${startTime}:00`)
    const endDateTime = addMinutes(startDateTime, duration)
    return format(endDateTime, 'HH:mm')
  } catch (error) {
    return startTime
  }
}

/**
 * Calculate individual booking times for couples booking
 * @param startTime - Shared start time
 * @param primaryDuration - Primary person's service duration
 * @param secondaryDuration - Secondary person's service duration
 * @returns Individual booking time calculations
 */
export function calculateIndividualBookingTimes(
  startTime: string,
  primaryDuration: number,
  secondaryDuration: number
): {
  primary: { startTime: string; endTime: string; duration: number }
  secondary: { startTime: string; endTime: string; duration: number }
} {
  const primaryEndTime = calculateEndTimeFromDuration(startTime, primaryDuration)
  const secondaryEndTime = calculateEndTimeFromDuration(startTime, secondaryDuration)

  return {
    primary: {
      startTime,
      endTime: primaryEndTime,
      duration: primaryDuration
    },
    secondary: {
      startTime,
      endTime: secondaryEndTime,
      duration: secondaryDuration
    }
  }
}

// ==================== ROOM ASSIGNMENT FUNCTIONS ====================

/**
 * Get optimal room for couples booking based on configured preferences
 * @param appointmentDate - Date of appointment
 * @param startTime - Start time
 * @param maxDuration - Maximum duration of both services
 * @returns Promise with room assignment result
 */
export async function getOptimalCouplesRoom(
  appointmentDate: string,
  startTime: string,
  maxDuration: number
): Promise<{
  roomId: number | null
  roomName: string | null
  reason: string
  isValid: boolean
}> {
  try {
    const endTime = calculateEndTimeFromDuration(startTime, maxDuration)
    
    // Get all active rooms with couples capacity
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', COUPLES_ROOM_CONFIG.minimumCapacity)
      .in('id', COUPLES_ROOM_CONFIG.preferredCouplesRoomIds)
      .order('id', { ascending: true })

    if (roomsError || !rooms) {
      return {
        roomId: null,
        roomName: null,
        reason: 'Unable to fetch room information',
        isValid: false
      }
    }

    // Check each preferred room in order
    for (const roomId of COUPLES_ROOM_CONFIG.preferredCouplesRoomIds) {
      const room = rooms.find(r => r.id === roomId)
      if (!room) continue

      // Check if room is available at this time
      const isAvailable = await checkRoomTimeAvailability(roomId, appointmentDate, startTime, maxDuration)
      if (isAvailable.available) {
        return {
          roomId: room.id,
          roomName: room.name,
          reason: `Assigned to ${room.name} (preferred couples room)`,
          isValid: true
        }
      }
    }

    return {
      roomId: null,
      roomName: null,
      reason: `No couples rooms available at ${startTime} on ${appointmentDate}. Please select a different time.`,
      isValid: false
    }
  } catch (error: any) {
    return {
      roomId: null,
      roomName: null,
      reason: `Error assigning couples room: ${error.message}`,
      isValid: false
    }
  }
}

/**
 * Check if a room is available at a specific time
 * @param roomId - Room ID
 * @param appointmentDate - Date of appointment
 * @param startTime - Start time
 * @param duration - Duration in minutes
 * @returns Promise with availability result
 */
export async function checkRoomTimeAvailability(
  roomId: number,
  appointmentDate: string,
  startTime: string,
  duration: number
): Promise<{ available: boolean; conflictingBooking?: any }> {
  try {
    const endTime = calculateEndTimeFromDuration(startTime, duration)
    
    // Get existing bookings for this room on this date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('appointment_date', appointmentDate)
      .neq('status', 'cancelled')

    if (error) {
      return { available: false }
    }

    if (!existingBookings || existingBookings.length === 0) {
      return { available: true }
    }

    // Check for time conflicts (including buffer time)
    const requestedStart = parseISO(`${appointmentDate}T${startTime}:00`)
    const requestedEnd = parseISO(`${appointmentDate}T${endTime}:00`)
    
    // Add buffer time
    const bufferStart = addMinutes(requestedStart, -COUPLES_ROOM_CONFIG.bufferTimeMinutes)
    const bufferEnd = addMinutes(requestedEnd, COUPLES_ROOM_CONFIG.bufferTimeMinutes)

    for (const booking of existingBookings) {
      const bookingStart = parseISO(`${booking.appointment_date}T${booking.start_time}:00`)
      const bookingEnd = parseISO(`${booking.appointment_date}T${booking.end_time}:00`)
      
      // Add buffer to existing booking
      const bookingBufferStart = addMinutes(bookingStart, -COUPLES_ROOM_CONFIG.bufferTimeMinutes)
      const bookingBufferEnd = addMinutes(bookingEnd, COUPLES_ROOM_CONFIG.bufferTimeMinutes)

      // Check for overlap
      if (bufferStart < bookingBufferEnd && bufferEnd > bookingBufferStart) {
        return { 
          available: false, 
          conflictingBooking: booking 
        }
      }
    }

    return { available: true }
  } catch (error) {
    return { available: false }
  }
}