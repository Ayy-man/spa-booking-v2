// Utility functions for booking logic
// These utilities can be used by both client and server components

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
  return booking.staff_id !== 'any-available' && booking.staff_id !== 'any'
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