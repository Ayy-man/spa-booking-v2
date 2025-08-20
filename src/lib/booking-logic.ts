import { addMinutes, format, isAfter, isBefore, parseISO, isEqual, isWithinInterval } from 'date-fns'
import { Service, Staff, Room, Booking, BookingConflict, TimeSlot, ScheduleBlock } from '@/types/booking'
import { supabase } from '@/lib/supabase'
import { 
  getGuamTime, 
  toGuamTime, 
  isGuamToday, 
  isTimeSlotBookable,
  createGuamDateTime,
  getGuamDateString,
  formatGuamTime,
  getMinBookingTime,
  BUSINESS_HOURS as GUAM_BUSINESS_HOURS
} from '@/lib/timezone-utils'

// Business constants with enhanced configuration
export const BUSINESS_HOURS = {
  start: '09:00',
  end: '19:00', 
  lastBookingOffset: 60, // 1 hour before closing
  slotDuration: 15, // 15-minute time slots
  bufferTime: 15, // 15 minutes between appointments for cleaning
  maxAdvanceDays: 30, // Maximum days in advance for booking
  minNoticeHours: GUAM_BUSINESS_HOURS.MINIMUM_ADVANCE_HOURS, // 2 hours minimum advance booking
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
    
    // Check if slot meets 2-hour advance booking requirement
    const slotDateTime = createGuamDateTime(format(date, 'yyyy-MM-dd'), slotTime)
    
    if (isTimeSlotBookable(slotDateTime)) {
      slots.push(slotTime)
    }
    
    currentTime = addMinutes(currentTime, BUSINESS_HOURS.slotDuration)
  }
  
  return slots
}

/**
 * Generate available time slots for a specific service and staff combination
 */
export async function generateAvailableTimeSlots(
  date: Date,
  service: Service,
  staff?: Staff,
  room?: Room,
  existingBookings: Booking[] = []
): Promise<{
  time: string;
  available: boolean;
  reason?: string;
}[]> {
  const allSlots = generateTimeSlots(date, service.duration)
  
  const slotsWithAvailability = await Promise.all(
    allSlots.map(async (time) => {
      // Check if this time slot is available
      if (staff && room) {
        const validation = await validateBookingRequest(
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
  )
  
  return slotsWithAvailability
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
    // Error checking service accommodation, return safe default
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
    appointment_date: string
    start_time: string
    end_time: string
    service_id?: string
  },
  existingBookings: Booking[],
  includeBufferTime: boolean = true
): BookingConflict[] {
  const conflicts: BookingConflict[] = []
  
  const newStart = parseISO(`${newBooking.appointment_date}T${newBooking.start_time}:00`)
  const newEnd = parseISO(`${newBooking.appointment_date}T${newBooking.end_time}:00`)
  
  // Add buffer time if requested (15 minutes before and after)
  const bufferStart = includeBufferTime ? addMinutes(newStart, -BUSINESS_HOURS.bufferTime) : newStart
  const bufferEnd = includeBufferTime ? addMinutes(newEnd, BUSINESS_HOURS.bufferTime) : newEnd
  
  for (const booking of existingBookings) {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') continue
    
    const existingStart = parseISO(`${booking.appointment_date}T${booking.start_time}:00`)
    const existingEnd = parseISO(`${booking.appointment_date}T${booking.end_time}:00`)
    
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
      if (booking.room_id === parseInt(newBooking.room_id)) {
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
export async function validateBookingRequest(
  service: Service,
  staff: Staff,
  room: Room,
  date: Date,
  startTime: string,
  existingBookings: Booking[] = []
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: BookingConflict[];
}> {
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
  
  // Validate staff availability (now async due to schedule blocks check)
  const staffAvailability = await isStaffAvailableAtTime(staff, date, startTime, service.duration)
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
      room_id: room.id.toString(),
      appointment_date: format(date, 'yyyy-MM-dd'),
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
    // Return a safe default - fallback to start time if calculation fails
    return startTime
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
  if (service.requires_room_3 || service.category === 'body_scrub') {
    const bodyScrubRoom = availableRooms.find(room => 
      room.capabilities.includes('treatments') && room.is_active
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
  
  // Rule 2: Couples services prefer rooms with capacity >= 2
  if (service.is_couples_service) {
    // Filter for couples rooms
    const couplesRooms = availableRooms.filter(room => 
      room.capacity >= 2 && room.is_active
    )
    
    if (couplesRooms.length === 0) {
      errors.push('No couples rooms available for this time slot')
      return {
        room: null,
        reason: 'Couples services require rooms with capacity for 2 people',
        errors
      }
    }
    
    // Prefer room with body scrub equipment first (usually Room 3)
    const premiumCouplesRoom = couplesRooms.find(room => 
      room.capabilities.includes('treatments')
    )
    if (premiumCouplesRoom) {
      return { 
        room: premiumCouplesRoom, 
        reason: 'Couples service assigned to premium couples room with body scrub equipment',
        errors: []
      }
    }
    
    // Use any available couples room
    const standardCouplesRoom = couplesRooms.find(room => 
      room.capacity >= 2
    )
    if (standardCouplesRoom) {
      return { 
        room: standardCouplesRoom, 
        reason: 'Couples service assigned to couples room',
        errors: []
      }
    }
    
    // Use first available room with capacity >= 2
    return {
      room: couplesRooms[0],
      reason: 'Couples service assigned to available room with sufficient capacity',
      errors: []
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
  const staffCapabilities = staff.capabilities || []
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
  
  const staffCapabilities = staff.capabilities || []
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
  const dayName = format(date, 'EEEE').toLowerCase() // sunday, monday, tuesday, etc.
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Check if staff works on this day using their work_days array
  const worksOnDay = staff.work_days?.includes(dayOfWeek) ?? false
  
  if (!worksOnDay) {
    // Add specific reasons based on staff member
    if (staff.id === 'leonel' && dayOfWeek !== 0) {
      reasons.push('Leonel only works on Sundays')
    } else if (staff.id === 'tanisha' && (dayOfWeek === 2 || dayOfWeek === 4)) {
      reasons.push('Tanisha is off on Tuesdays and Thursdays')
    } else if (staff.id === 'robyn' && (dayOfWeek === 1 || dayOfWeek === 2)) {
      reasons.push('Robyn is off on Mondays and Tuesdays')
    } else if (staff.id === 'selma') {
      // Selma works all days, this shouldn't happen
      reasons.push('Staff schedule error')
    } else {
      reasons.push(`${staff.name} does not work on ${format(date, 'EEEE')}s`)
    }
    return { isAvailable: false, reasons, dayName }
  }
  
  // For now, assume standard work hours if staff works that day
  // In a real implementation, this would come from staff_schedules table
  const workStart = '09:00'
  const workEnd = '19:00'
  
  return {
    isAvailable: true,
    workStart,
    workEnd,
    reasons,
    dayName
  }
}

/**
 * Get schedule blocks for a staff member on a specific date
 */
export async function getScheduleBlocks(
  staffId: string,
  date: Date
): Promise<ScheduleBlock[]> {
  try {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('staff_id', staffId)
      .or(`and(start_date.lte.${dateStr},or(end_date.is.null,end_date.gte.${dateStr}))`)
      .order('start_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching schedule blocks:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getScheduleBlocks:', error)
    return []
  }
}

/**
 * Check if a time slot conflicts with schedule blocks
 */
export function checkScheduleBlockConflict(
  blocks: ScheduleBlock[],
  startTime: string,
  endTime: string,
  date: Date
): { hasConflict: boolean; conflictingBlock?: ScheduleBlock; reason?: string } {
  const dateStr = format(date, 'yyyy-MM-dd')
  
  for (const block of blocks) {
    // Check if the date falls within the block's date range
    const blockStartDate = parseISO(block.start_date)
    const blockEndDate = block.end_date ? parseISO(block.end_date) : blockStartDate
    const checkDate = parseISO(dateStr)
    
    const isDateInBlock = isWithinInterval(checkDate, {
      start: blockStartDate,
      end: blockEndDate
    })
    
    if (!isDateInBlock) continue
    
    // Check for full day blocks
    if (block.block_type === 'full_day') {
      return {
        hasConflict: true,
        conflictingBlock: block,
        reason: block.reason || 'Staff is unavailable for the entire day'
      }
    }
    
    // Check for time range conflicts
    if (block.block_type === 'time_range' && block.start_time && block.end_time) {
      const requestedStart = parseISO(`${dateStr}T${startTime}:00`)
      const requestedEnd = parseISO(`${dateStr}T${endTime}:00`)
      const blockStart = parseISO(`${dateStr}T${block.start_time}`)
      const blockEnd = parseISO(`${dateStr}T${block.end_time}`)
      
      // Check if times overlap
      const hasOverlap = (
        (isBefore(requestedStart, blockEnd) && isAfter(requestedEnd, blockStart)) ||
        (requestedStart.getTime() === blockStart.getTime()) ||
        (requestedEnd.getTime() === blockEnd.getTime())
      )
      
      if (hasOverlap) {
        return {
          hasConflict: true,
          conflictingBlock: block,
          reason: block.reason || `Staff is unavailable from ${block.start_time} to ${block.end_time}`
        }
      }
    }
  }
  
  return { hasConflict: false }
}

/**
 * Check if a staff member is available for a specific time slot
 */
export async function isStaffAvailableAtTime(
  staff: Staff,
  date: Date,
  startTime: string,
  duration: number
): Promise<{ available: boolean; reasons: string[] }> {
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
  
  // Check for schedule blocks
  const scheduleBlocks = await getScheduleBlocks(staff.id, date)
  const endTime = calculateEndTime(startTime, duration)
  const blockConflict = checkScheduleBlockConflict(scheduleBlocks, startTime, endTime, date)
  
  if (blockConflict.hasConflict) {
    reasons.push(blockConflict.reason || 'Staff has a schedule block during this time')
    return { available: false, reasons }
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
  
  if (room.capabilities.includes('treatments')) {
    specialFeatures.push('Body Scrub Equipment')
    suitableFor.push('Body scrub services (exclusive)')
  }
  
  if (room.capacity >= 2) {
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