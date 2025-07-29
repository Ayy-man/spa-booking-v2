import { addMinutes, format, isAfter, isBefore, parseISO, isEqual } from 'date-fns'
import { Service, Staff, Room, Booking, BookingConflict, TimeSlot } from '@/types/booking'

// Business constants with enhanced configuration
export const BUSINESS_HOURS = {
  start: '09:00',
  end: '19:00', 
  lastBookingOffset: 60, // 1 hour before closing
  slotDuration: 15, // 15-minute time slots
  bufferTime: 15, // 15 minutes between appointments for cleaning
  maxAdvanceDays: 30, // Maximum days in advance for booking
  minNoticeHours: 1, // Minimum hours notice for same-day bookings
}

// Room configuration constants
export const ROOM_TYPES = {
  SINGLE: 'single',
  COUPLES: 'couples',
  PREMIUM: 'premium' // Room 3 with body scrub equipment
} as const

// Staff scheduling constants  
export const STAFF_CONSTRAINTS = {
  LEONEL_SUNDAY_ONLY: true,
  SELMA_TANISHA_OFF_TUE_THU: true,
  ON_CALL_MIN_NOTICE_MINUTES: {
    SELMA: 30,
    TANISHA: 120 // 2 hours
  }
} as const

// Service category requirements
export const SERVICE_REQUIREMENTS = {
  BODY_SCRUB_ROOM_3_ONLY: true,
  COUPLES_NEVER_ROOM_1: true,
  PACKAGE_PREFER_ROOM_3: true
} as const

/**
 * Generate time slots for a given date with availability consideration
 */
export function generateTimeSlots(
  date: Date, 
  serviceDuration?: number,
  considerLastBooking: boolean = true
): string[] {
  const slots: string[] = []
  const startTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.start}:00`)
  const endTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.end}:00`)
  
  // Calculate the latest start time based on service duration
  let latestStartTime = endTime
  if (considerLastBooking && serviceDuration) {
    latestStartTime = addMinutes(endTime, -(serviceDuration + BUSINESS_HOURS.bufferTime))
  } else {
    latestStartTime = addMinutes(endTime, -BUSINESS_HOURS.lastBookingOffset)
  }
  
  let currentTime = startTime
  
  while (isBefore(currentTime, latestStartTime)) {
    const slotTime = format(currentTime, 'HH:mm')
    
    // For same-day bookings, skip past time slots
    if (format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const now = new Date()
      const slotDateTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${slotTime}:00`)
      
      if (isAfter(slotDateTime, addMinutes(now, BUSINESS_HOURS.minNoticeHours * 60))) {
        slots.push(slotTime)
      }
    } else {
      slots.push(slotTime)
    }
    
    currentTime = addMinutes(currentTime, BUSINESS_HOURS.slotDuration)
  }
  
  return slots
}

/**
 * Generate available time slots for a specific service and staff combination
 */
export function generateAvailableTimeSlots(
  date: Date,
  service: Service,
  staff?: Staff,
  room?: Room,
  existingBookings: Booking[] = []
): {
  time: string;
  available: boolean;
  reason?: string;
}[] {
  const allSlots = generateTimeSlots(date, service.duration)
  
  return allSlots.map(time => {
    // Check if this time slot is available
    if (staff && room) {
      const validation = validateBookingRequest(
        service,
        staff,
        room,
        date,
        time,
        existingBookings
      )
      
      return {
        time,
        available: validation.isValid,
        reason: validation.errors[0] || validation.warnings[0]
      }
    }
    
    return {
      time,
      available: true
    }
  })
}

/**
 * Check if a time slot can accommodate a service duration with enhanced validation
 */
export function canAccommodateService(
  startTime: string,
  serviceDuration: number,
  date: Date,
  includeBuffer: boolean = true
): boolean {
  try {
    const startDateTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`)
    const businessStart = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.start}:00`)
    const businessEnd = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.end}:00`)
    
    // Check if start time is within business hours
    if (isBefore(startDateTime, businessStart)) {
      return false
    }
    
    // Calculate end time with optional buffer
    const totalDuration = serviceDuration + (includeBuffer ? BUSINESS_HOURS.bufferTime : 0)
    const endDateTime = addMinutes(startDateTime, totalDuration)
    
    // Check if service can be completed before business closes
    if (isAfter(endDateTime, businessEnd)) {
      return false
    }
    
    // Check against last booking time policy
    const lastBookingTime = addMinutes(businessEnd, -BUSINESS_HOURS.lastBookingOffset)
    if (isAfter(startDateTime, lastBookingTime)) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking service accommodation:', error)
    return false
  }
}

/**
 * Get detailed accommodation information for a time slot
 */
export function getAccommodationDetails(
  startTime: string,
  serviceDuration: number,
  date: Date
): {
  canAccommodate: boolean;
  endTime: string;
  businessEnd: string;
  timeUntilClose: number; // minutes
  reason?: string;
} {
  const startDateTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`)
  const endDateTime = addMinutes(startDateTime, serviceDuration)
  const businessEnd = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.end}:00`)
  
  const timeUntilClose = (businessEnd.getTime() - endDateTime.getTime()) / (1000 * 60)
  
  let reason: string | undefined
  const canAccommodate = canAccommodateService(startTime, serviceDuration, date)
  
  if (!canAccommodate) {
    if (isBefore(startDateTime, parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.start}:00`))) {
      reason = 'Start time is before business hours'
    } else if (isAfter(endDateTime, businessEnd)) {
      reason = 'Service would end after business hours'
    } else {
      reason = 'Too close to closing time'
    }
  }
  
  return {
    canAccommodate,
    endTime: format(endDateTime, 'HH:mm'),
    businessEnd: format(businessEnd, 'HH:mm'),
    timeUntilClose: Math.round(timeUntilClose),
    reason
  }
}

/**
 * Check for booking conflicts with enhanced validation and buffer time
 */
export function checkBookingConflicts(
  newBooking: {
    staff_id: string
    room_id: string
    booking_date: string
    start_time: string
    end_time: string
    service_id?: string
  },
  existingBookings: Booking[],
  includeBufferTime: boolean = true
): BookingConflict[] {
  const conflicts: BookingConflict[] = []
  
  const newStart = parseISO(`${newBooking.booking_date}T${newBooking.start_time}:00`)
  const newEnd = parseISO(`${newBooking.booking_date}T${newBooking.end_time}:00`)
  
  // Add buffer time if requested (15 minutes before and after)
  const bufferStart = includeBufferTime ? addMinutes(newStart, -BUSINESS_HOURS.bufferTime) : newStart
  const bufferEnd = includeBufferTime ? addMinutes(newEnd, BUSINESS_HOURS.bufferTime) : newEnd
  
  for (const booking of existingBookings) {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') continue
    
    const existingStart = parseISO(`${booking.booking_date}T${booking.start_time}:00`)
    const existingEnd = parseISO(`${booking.booking_date}T${booking.end_time}:00`)
    
    // Check for time overlap with buffer consideration
    // Add buffer to existing booking as well for proper conflict detection
    const existingBufferStart = includeBufferTime ? addMinutes(existingStart, -BUSINESS_HOURS.bufferTime) : existingStart
    const existingBufferEnd = includeBufferTime ? addMinutes(existingEnd, BUSINESS_HOURS.bufferTime) : existingEnd
    
    const hasOverlap = (
      // New booking overlaps with existing booking (including buffers)
      (isBefore(bufferStart, existingBufferEnd) && isAfter(bufferEnd, existingBufferStart)) ||
      // Edge case: exact time matches
      (bufferStart.getTime() === existingBufferStart.getTime()) ||
      (bufferEnd.getTime() === existingBufferEnd.getTime())
    )
    
    if (hasOverlap) {
      // Staff conflict
      if (booking.staff_id === newBooking.staff_id) {
        const bufferMessage = includeBufferTime ? 
          ` (including 15-minute buffer time)` : ''
        conflicts.push({
          type: 'staff',
          message: `Staff member is already booked from ${booking.start_time} to ${booking.end_time}${bufferMessage}`,
          conflicting_booking: booking
        })
      }
      
      // Room conflict  
      if (booking.room_id === newBooking.room_id) {
        const bufferMessage = includeBufferTime ? 
          ` (including 15-minute cleaning buffer)` : ''
        conflicts.push({
          type: 'room',
          message: `Room is already booked from ${booking.start_time} to ${booking.end_time}${bufferMessage}`,
          conflicting_booking: booking
        })
      }
    }
  }
  
  return conflicts
}

/**
 * Enhanced booking validation with comprehensive business rule checking
 */
export function validateBookingRequest(
  service: Service,
  staff: Staff,
  room: Room,
  date: Date,
  startTime: string,
  existingBookings: Booking[] = []
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: BookingConflict[];
} {
  const errors: string[] = []
  const warnings: string[] = []
  let conflicts: BookingConflict[] = []
  
  // Validate required parameters
  if (!service) errors.push('Service is required')
  if (!staff) errors.push('Staff member is required')
  if (!room) errors.push('Room is required')
  if (!date) errors.push('Date is required')
  if (!startTime) errors.push('Start time is required')
  
  if (errors.length > 0) {
    return { isValid: false, errors, warnings, conflicts }
  }
  
  // Calculate end time
  const endTime = calculateEndTime(startTime, service.duration)
  
  // Validate booking time
  const timeValidation = validateBookingTime(date, startTime, service.duration)
  if (!timeValidation.isValid) {
    errors.push(...timeValidation.errors)
  }
  
  // Validate staff capability
  const staffCapability = validateStaffCapability(staff, service)
  if (!staffCapability.canPerform) {
    errors.push(...staffCapability.reasons)
  }
  
  // Validate staff availability
  const staffAvailability = isStaffAvailableAtTime(staff, date, startTime, service.duration)
  if (!staffAvailability.available) {
    errors.push(...staffAvailability.reasons)
  }
  
  // Validate room assignment
  const roomValidation = getOptimalRoom(service, staff, [room], date, startTime)
  if (!roomValidation.room || roomValidation.room.id !== room.id) {
    if (roomValidation.errors.length > 0) {
      errors.push(...roomValidation.errors)
    } else {
      warnings.push(`${room.name} may not be optimal for this service: ${roomValidation.reason}`)
    }
  }
  
  // Check for booking conflicts
  conflicts = checkBookingConflicts(
    {
      staff_id: staff.id,
      room_id: room.id,
      booking_date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      service_id: service.id
    },
    existingBookings
  )
  
  if (conflicts.length > 0) {
    conflicts.forEach(conflict => {
      errors.push(conflict.message)
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    conflicts
  }
}

/**
 * Calculate end time based on service duration with validation
 */
export function calculateEndTime(startTime: string, duration: number): string {
  try {
    // Parse time as if it's today to handle time calculations
    const today = new Date()
    const startDateTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${startTime}:00`)
    
    if (isNaN(startDateTime.getTime())) {
      throw new Error('Invalid start time format')
    }
    
    if (duration <= 0) {
      throw new Error('Duration must be positive')
    }
    
    const endDateTime = addMinutes(startDateTime, duration)
    return format(endDateTime, 'HH:mm')
  } catch (error) {
    // Return a safe default or re-throw based on needs
    console.error('Error calculating end time:', error)
    return startTime // Fallback to start time if calculation fails
  }
}

/**
 * Calculate the next available time slot considering buffer time
 */
export function calculateNextAvailableSlot(
  lastBookingEndTime: string,
  bufferMinutes: number = BUSINESS_HOURS.bufferTime
): string {
  const today = new Date()
  const lastEndDateTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${lastBookingEndTime}:00`)
  const nextAvailableDateTime = addMinutes(lastEndDateTime, bufferMinutes)
  
  return format(nextAvailableDateTime, 'HH:mm')
}

/**
 * Get total appointment duration including buffer time
 */
export function getTotalAppointmentDuration(
  serviceDuration: number,
  includeBuffer: boolean = true
): number {
  return serviceDuration + (includeBuffer ? BUSINESS_HOURS.bufferTime : 0)
}

/**
 * Validate booking time against business rules with enhanced checks
 */
export function validateBookingTime(
  date: Date,
  startTime: string,
  duration: number
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if date is in the past (with today buffer)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  
  if (isBefore(date, today)) {
    errors.push('Cannot book appointments for past dates')
  } else if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    // Same day booking - check if time has passed
    const now = new Date()
    const requestedDateTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`)
    
    if (isBefore(requestedDateTime, now)) {
      errors.push('Cannot book appointments for times that have already passed today')
    } else if (isBefore(requestedDateTime, addMinutes(now, 60))) {
      warnings.push('Booking is less than 1 hour from now - please ensure adequate preparation time')
    }
  }
  
  // Check if date is too far in advance (30 days)
  const maxAdvanceDate = new Date(today)
  maxAdvanceDate.setDate(today.getDate() + 30)
  if (isAfter(date, maxAdvanceDate)) {
    errors.push('Cannot book more than 30 days in advance')
  }
  
  // Enhanced business hours validation
  const businessValidation = canAccommodateService(startTime, duration, date)
  if (!businessValidation) {
    const startDateTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`)
    const endDateTime = addMinutes(startDateTime, duration)
    const businessEnd = parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.end}:00`)
    const lastBookingTime = addMinutes(businessEnd, -BUSINESS_HOURS.lastBookingOffset)
    
    if (isBefore(startDateTime, parseISO(`${format(date, 'yyyy-MM-dd')}T${BUSINESS_HOURS.start}:00`))) {
      errors.push(`Appointment cannot start before business hours (${BUSINESS_HOURS.start})`)
    } else if (isAfter(endDateTime, businessEnd)) {
      errors.push(`Appointment would end after business hours (${BUSINESS_HOURS.end})`)
    } else if (isAfter(startDateTime, lastBookingTime)) {
      errors.push(`Last appointment must start by ${format(lastBookingTime, 'HH:mm')} to allow completion before closing`)
    }
  }
  
  // Check for weekend/holiday restrictions (if needed)
  const dayOfWeek = format(date, 'EEEE')
  if (dayOfWeek === 'Sunday') {
    warnings.push('Sunday appointments have limited staff availability (Leonel only)')
  } else if (dayOfWeek === 'Tuesday' || dayOfWeek === 'Thursday') {
    warnings.push('Limited staff availability on Tuesdays and Thursdays (Selma and Tanisha unavailable)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Determine optimal room for a service with enhanced validation
 */
export function getOptimalRoom(
  service: Service,
  preferredStaff?: Staff,
  availableRooms: Room[] = [],
  bookingDate?: Date,
  startTime?: string
): { room: Room | null; reason: string; errors: string[] } {
  const errors: string[] = []
  
  // Validate service requirements first
  if (!service) {
    return { room: null, reason: 'Invalid service provided', errors: ['Service is required'] }
  }
  
  // Rule 1: Body scrub services MUST use Room 3 (only room with body scrub equipment)
  if (service.requires_body_scrub_room || service.category === 'body_scrub') {
    const bodyScrubRoom = availableRooms.find(room => 
      room.has_body_scrub_equipment && room.is_active
    )
    
    if (bodyScrubRoom) {
      return { 
        room: bodyScrubRoom, 
        reason: 'Body scrub service requires Room 3 with specialized equipment',
        errors: []
      }
    }
    
    // Check if Room 3 exists but is unavailable
    const room3Exists = availableRooms.length > 0
    if (room3Exists) {
      errors.push('Room 3 is required for body scrub services but is currently unavailable')
    } else {
      errors.push('No room with body scrub equipment found in the system')
    }
    
    return { 
      room: null, 
      reason: 'Body scrub services can only be performed in Room 3',
      errors
    }
  }
  
  // Rule 2: Couples services prefer Room 3, then Room 2 (never Room 1)
  if (service.requires_couples_room || service.is_package) {
    // Validate couples services cannot use Room 1
    const room1 = availableRooms.find(room => room.capacity === 1)
    if (availableRooms.length === 1 && room1) {
      errors.push('Couples services cannot be performed in Room 1 (single occupancy only)')
      return {
        room: null,
        reason: 'Couples services require Room 2 or Room 3',
        errors
      }
    }
    
    // Try Room 3 first (premium room with body scrub equipment)
    const room3 = availableRooms.find(room => 
      room.capacity >= 2 && room.has_body_scrub_equipment && room.is_active
    )
    if (room3) {
      return { 
        room: room3, 
        reason: 'Couples service assigned to Room 3 (premium couples room)',
        errors: []
      }
    }
    
    // Try Room 2 (standard couples room)
    const room2 = availableRooms.find(room => 
      room.capacity >= 2 && room.is_couples_room && room.is_active
    )
    if (room2) {
      return { 
        room: room2, 
        reason: 'Couples service assigned to Room 2 (couples room)',
        errors: []
      }
    }
    
    errors.push('No couples rooms (Room 2 or Room 3) available for this time slot')
    return {
      room: null,
      reason: 'Couples services require rooms with capacity for 2 people',
      errors
    }
  }
  
  // Rule 3: Try staff's default room first (for single services)
  if (preferredStaff?.default_room_id) {
    const staffDefaultRoom = availableRooms.find(room => 
      room.id === preferredStaff.default_room_id && room.is_active
    )
    if (staffDefaultRoom) {
      // Verify staff can perform this service in their default room
      if (canStaffPerformService(preferredStaff, service)) {
        return { 
          room: staffDefaultRoom, 
          reason: `Assigned to ${preferredStaff.name}'s default room`,
          errors: []
        }
      } else {
        errors.push(`${preferredStaff.name} cannot perform ${service.category} services`)
      }
    }
  }
  
  // Rule 4: Use any available room (prefer smaller rooms for efficiency)
  const suitableRooms = availableRooms.filter(room => {
    // Check if room can handle this service category
    const roomCapabilities = room.capabilities || []
    return room.is_active && 
           (roomCapabilities.includes(service.category) || roomCapabilities.length === 0)
  })
  
  if (suitableRooms.length === 0) {
    errors.push(`No rooms available that can accommodate ${service.category} services`)
    return {
      room: null,
      reason: `No suitable rooms found for ${service.category} services`,
      errors
    }
  }
  
  // Sort by capacity (smaller rooms first for single services)
  const sortedRooms = [...suitableRooms].sort((a, b) => a.capacity - b.capacity)
  const assignedRoom = sortedRooms[0]
  
  return { 
    room: assignedRoom, 
    reason: `Assigned to available ${assignedRoom.name}`,
    errors: []
  }
}

/**
 * Check if staff can perform a service with detailed validation
 */
export function canStaffPerformService(staff: Staff, service: Service): boolean {
  if (!staff || !service) {
    return false
  }
  
  // Check if staff is active
  if (!staff.is_active) {
    return false
  }
  
  // Check if staff has the required capability for this service category
  const staffCapabilities = staff.can_perform_services || []
  return staffCapabilities.includes(service.category)
}

/**
 * Get detailed staff capability validation
 */
export function validateStaffCapability(
  staff: Staff, 
  service: Service
): { canPerform: boolean; reasons: string[] } {
  const reasons: string[] = []
  
  if (!staff) {
    reasons.push('No staff member specified')
    return { canPerform: false, reasons }
  }
  
  if (!service) {
    reasons.push('No service specified')
    return { canPerform: false, reasons }
  }
  
  if (!staff.is_active) {
    reasons.push(`${staff.name} is currently inactive`)
    return { canPerform: false, reasons }
  }
  
  const staffCapabilities = staff.can_perform_services || []
  if (!staffCapabilities.includes(service.category)) {
    reasons.push(`${staff.name} is not qualified to perform ${service.category} services`)
    return { canPerform: false, reasons }
  }
  
  return { canPerform: true, reasons: [] }
}

/**
 * Get staff availability for a specific day with enhanced validation
 */
export function getStaffDayAvailability(
  staff: Staff,
  date: Date
): { 
  isAvailable: boolean; 
  workStart?: string; 
  workEnd?: string;
  reasons: string[];
  dayName: string;
} {
  const reasons: string[] = []
  
  if (!staff) {
    reasons.push('No staff member provided')
    return { isAvailable: false, reasons, dayName: '' }
  }
  
  if (!staff.is_active) {
    reasons.push(`${staff.name} is currently inactive`)
    return { isAvailable: false, reasons, dayName: '' }
  }
  
  // Get day name in correct format
  const dayName = format(date, 'EEE').toLowerCase() // mon, tue, wed, thu, fri, sat, sun
  const schedule = staff.schedule as any
  
  if (!schedule) {
    reasons.push(`${staff.name} has no schedule configured`)
    return { isAvailable: false, reasons, dayName }
  }
  
  if (!schedule[dayName]) {
    reasons.push(`${staff.name} has no schedule for ${dayName}`)
    return { isAvailable: false, reasons, dayName }
  }
  
  const daySchedule = schedule[dayName]
  const isAvailable = daySchedule.available || false
  
  if (!isAvailable) {
    // Add specific reasons based on staff member
    if (staff.name === 'Leonel Sidon' && dayName !== 'sun') {
      reasons.push('Leonel only works on Sundays')
    } else if ((staff.name === 'Selma Villaver' || staff.name === 'Tanisha Harris') && 
               (dayName === 'tue' || dayName === 'thu')) {
      reasons.push(`${staff.name} is off on Tuesdays and Thursdays`)
    } else {
      reasons.push(`${staff.name} is not available on ${dayName}`)
    }
  }
  
  return {
    isAvailable,
    workStart: daySchedule.start_time,
    workEnd: daySchedule.end_time,
    reasons,
    dayName
  }
}

/**
 * Check if a staff member is available for a specific time slot
 */
export function isStaffAvailableAtTime(
  staff: Staff,
  date: Date,
  startTime: string,
  duration: number
): { available: boolean; reasons: string[] } {
  const reasons: string[] = []
  
  // Check day availability first
  const dayAvailability = getStaffDayAvailability(staff, date)
  if (!dayAvailability.isAvailable) {
    return { available: false, reasons: dayAvailability.reasons }
  }
  
  // Check if requested time is within staff work hours
  if (dayAvailability.workStart && dayAvailability.workEnd) {
    const requestedStart = parseISO(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`)
    const workStart = parseISO(`${format(date, 'yyyy-MM-dd')}T${dayAvailability.workStart}:00`)
    const workEnd = parseISO(`${format(date, 'yyyy-MM-dd')}T${dayAvailability.workEnd}:00`)
    const requestedEnd = addMinutes(requestedStart, duration)
    
    if (isBefore(requestedStart, workStart) || isAfter(requestedEnd, workEnd)) {
      reasons.push(`${staff.name} works ${dayAvailability.workStart}-${dayAvailability.workEnd}, but service time is ${startTime}-${format(requestedEnd, 'HH:mm')}`)
      return { available: false, reasons }
    }
  }
  
  return { available: true, reasons: [] }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hr`
  }
  
  return `${hours} hr ${remainingMinutes} min`
}

/**
 * Get service category display name
 */
export function getServiceCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    facial: 'Facial Treatments',
    massage: 'Body Massages', 
    body_treatment: 'Body Treatments',
    body_scrub: 'Body Scrubs',
    waxing: 'Waxing Services',
    package: 'Package Deals',
    membership: 'Memberships'
  }
  
  return categoryNames[category] || category
}

/**
 * Get booking status display information 
 */
export function getBookingStatusInfo(status: string): {
  label: string;
  color: string;
  description: string;
} {
  const statusInfo: Record<string, { label: string; color: string; description: string }> = {
    confirmed: {
      label: 'Confirmed',
      color: 'green',
      description: 'Booking is confirmed and scheduled'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'red', 
      description: 'Booking has been cancelled'
    },
    completed: {
      label: 'Completed',
      color: 'blue',
      description: 'Service has been completed'
    },
    no_show: {
      label: 'No Show',
      color: 'orange',
      description: 'Customer did not show up for appointment'
    }
  }
  
  return statusInfo[status] || {
    label: status,
    color: 'gray',
    description: 'Unknown status'
  }
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error: string): string {
  // Convert technical error messages to user-friendly ones
  const errorMappings: Record<string, string> = {
    'duplicate key value violates unique constraint': 'This time slot is already booked',
    'check constraint': 'Invalid booking data provided',
    'foreign key constraint': 'Selected staff, room, or service is no longer available',
    'not null violation': 'Required booking information is missing'
  }
  
  for (const [technical, friendly] of Object.entries(errorMappings)) {
    if (error.toLowerCase().includes(technical)) {
      return friendly
    }
  }
  
  return error
}

/**
 * Get room utilization information
 */
export function getRoomUtilizationInfo(room: Room): {
  capabilities: string[];
  specialFeatures: string[];
  suitableFor: string[];
} {
  const capabilities = room.capabilities || []
  const specialFeatures: string[] = []
  const suitableFor: string[] = []
  
  if (room.has_body_scrub_equipment) {
    specialFeatures.push('Body Scrub Equipment')
    suitableFor.push('Body scrub services (exclusive)')
  }
  
  if (room.is_couples_room) {
    specialFeatures.push('Couples Setup')
    suitableFor.push('Couples treatments')
  }
  
  if (room.capacity === 1) {
    suitableFor.push('Individual treatments only')
  } else if (room.capacity >= 2) {
    suitableFor.push('Individual and couples treatments')
  }
  
  return {
    capabilities: capabilities.map(cap => getServiceCategoryDisplayName(cap)),
    specialFeatures,
    suitableFor
  }
}