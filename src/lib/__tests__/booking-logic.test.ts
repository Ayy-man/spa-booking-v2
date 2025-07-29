/**
 * Comprehensive test suite for Dermal Spa booking logic
 * Tests all critical business rules and edge cases
 */

import { 
  getOptimalRoom,
  canStaffPerformService,
  validateStaffCapability,
  getStaffDayAvailability,
  isStaffAvailableAtTime,
  checkBookingConflicts,
  validateBookingRequest,
  validateBookingTime,
  calculateEndTime,
  canAccommodateService,
  generateTimeSlots,
  generateAvailableTimeSlots,
  BUSINESS_HOURS,
  SERVICE_REQUIREMENTS,
  STAFF_CONSTRAINTS
} from '../booking-logic'

import { Service, Staff, Room, Booking } from '@/types/booking'

// Mock data based on actual seed data
const mockRooms: Room[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Room 1',
    room_number: 1,
    capacity: 1,
    capabilities: ['facial', 'massage', 'waxing', 'body_treatment'],
    has_body_scrub_equipment: false,
    is_couples_room: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Room 2',
    room_number: 2,
    capacity: 2,
    capabilities: ['facial', 'massage', 'waxing', 'body_treatment'],
    has_body_scrub_equipment: false,
    is_couples_room: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Room 3',
    room_number: 3,
    capacity: 2,
    capabilities: ['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub'],
    has_body_scrub_equipment: true,
    is_couples_room: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

const mockStaff: Staff[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Selma Villaver',
    email: 'happyskinhappyyou@gmail.com',
    phone: '(671) 647-7546',
    can_perform_services: ['facial'],
    default_room_id: '11111111-1111-1111-1111-111111111111',
    schedule: {
      mon: { available: true, start_time: '09:00', end_time: '19:00' },
      tue: { available: false },
      wed: { available: true, start_time: '09:00', end_time: '19:00' },
      thu: { available: false },
      fri: { available: true, start_time: '09:00', end_time: '19:00' },
      sat: { available: true, start_time: '09:00', end_time: '19:00' },
      sun: { available: true, start_time: '09:00', end_time: '19:00' }
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Robyn Camacho',
    email: 'robyncmcho@gmail.com',
    phone: '(671) 647-7546',
    can_perform_services: ['facial', 'massage', 'waxing', 'body_treatment', 'body_scrub', 'package'],
    default_room_id: '33333333-3333-3333-3333-333333333333',
    schedule: {
      mon: { available: true, start_time: '09:00', end_time: '19:00' },
      tue: { available: true, start_time: '09:00', end_time: '19:00' },
      wed: { available: true, start_time: '09:00', end_time: '19:00' },
      thu: { available: true, start_time: '09:00', end_time: '19:00' },
      fri: { available: true, start_time: '09:00', end_time: '19:00' },
      sat: { available: true, start_time: '09:00', end_time: '19:00' },
      sun: { available: true, start_time: '09:00', end_time: '19:00' }
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Tanisha Harris',
    email: 'misstanishababyy@gmail.com',
    phone: '(671) 647-7546',
    can_perform_services: ['facial', 'waxing'],
    default_room_id: '22222222-2222-2222-2222-222222222222',
    schedule: {
      mon: { available: true, start_time: '09:00', end_time: '19:00' },
      tue: { available: false },
      wed: { available: true, start_time: '09:00', end_time: '19:00' },
      thu: { available: false },
      fri: { available: true, start_time: '09:00', end_time: '19:00' },
      sat: { available: true, start_time: '09:00', end_time: '19:00' },
      sun: { available: true, start_time: '09:00', end_time: '19:00' }
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    name: 'Leonel Sidon',
    email: 'sidonleonel@gmail.com',
    phone: '(671) 647-7546',
    can_perform_services: ['massage', 'body_treatment'],
    default_room_id: null,
    schedule: {
      mon: { available: false },
      tue: { available: false },
      wed: { available: false },
      thu: { available: false },
      fri: { available: false },
      sat: { available: false },
      sun: { available: true, start_time: '09:00', end_time: '19:00' }
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

const mockServices: Service[] = [
  {
    id: 'service-facial-basic',
    name: 'Basic Facial',
    description: 'A gentle cleansing facial',
    duration: 30,
    price: 65.00,
    category: 'facial',
    requires_couples_room: false,
    requires_body_scrub_room: false,
    is_package: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'service-body-scrub',
    name: 'Dead Sea Salt Body Scrub',
    description: 'Exfoliating body scrub',
    duration: 30,
    price: 65.00,
    category: 'body_scrub',
    requires_couples_room: false,
    requires_body_scrub_room: true,
    is_package: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'service-couples-package',
    name: 'Balinese Body Massage + Basic Facial',
    description: 'Couples package',
    duration: 90,
    price: 130.00,
    category: 'package',
    requires_couples_room: true,
    requires_body_scrub_room: false,
    is_package: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

describe('Room Assignment Logic', () => {
  describe('Body Scrub Services', () => {
    test('should assign body scrub service to Room 3 only', () => {
      const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
      const result = getOptimalRoom(bodyScrubService, undefined, mockRooms)
      
      expect(result.room?.id).toBe('33333333-3333-3333-3333-333333333333') // Room 3
      expect(result.reason).toContain('Body scrub service requires Room 3')
      expect(result.errors).toHaveLength(0)
    })

    test('should reject body scrub service if Room 3 unavailable', () => {
      const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
      const roomsWithoutRoom3 = mockRooms.filter(r => !r.has_body_scrub_equipment)
      
      const result = getOptimalRoom(bodyScrubService, undefined, roomsWithoutRoom3)
      
      expect(result.room).toBeNull()
      expect(result.errors).toContain('Room 3 is required for body scrub services but is currently unavailable')
    })

    test('should only allow qualified staff for body scrub services', () => {
      const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
      const robyn = mockStaff.find(s => s.name === 'Robyn Camacho')!
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      
      expect(canStaffPerformService(robyn, bodyScrubService)).toBe(true)
      expect(canStaffPerformService(selma, bodyScrubService)).toBe(false)
    })
  })

  describe('Couples Services', () => {
    test('should prefer Room 3 for couples services', () => {
      const couplesService = mockServices.find(s => s.requires_couples_room)!
      const result = getOptimalRoom(couplesService, undefined, mockRooms)
      
      expect(result.room?.id).toBe('33333333-3333-3333-3333-333333333333') // Room 3
      expect(result.reason).toContain('Room 3 (premium couples room)')
      expect(result.errors).toHaveLength(0)
    })

    test('should use Room 2 if Room 3 unavailable for couples', () => {
      const couplesService = mockServices.find(s => s.requires_couples_room)!
      const roomsWithoutRoom3 = mockRooms.filter(r => !r.has_body_scrub_equipment)
      
      const result = getOptimalRoom(couplesService, undefined, roomsWithoutRoom3)
      
      expect(result.room?.id).toBe('22222222-2222-2222-2222-222222222222') // Room 2
      expect(result.reason).toContain('Room 2 (couples room)')
    })

    test('should reject couples service if only Room 1 available', () => {
      const couplesService = mockServices.find(s => s.requires_couples_room)!
      const onlyRoom1 = [mockRooms[0]] // Room 1 only
      
      const result = getOptimalRoom(couplesService, undefined, onlyRoom1)
      
      expect(result.room).toBeNull()
      expect(result.errors).toContain('Couples services cannot be performed in Room 1 (single occupancy only)')
    })
  })

  describe('Single Services', () => {
    test('should assign single service to staff default room', () => {
      const facialService = mockServices.find(s => s.category === 'facial')!
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      
      const result = getOptimalRoom(facialService, selma, mockRooms)
      
      expect(result.room?.id).toBe('11111111-1111-1111-1111-111111111111') // Room 1 (Selma's default)
      expect(result.reason).toContain("Selma Villaver's default room")
    })

    test('should use any available room if default unavailable', () => {
      const facialService = mockServices.find(s => s.category === 'facial')!
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      const roomsWithoutRoom1 = mockRooms.filter(r => r.id !== selma.default_room_id)
      
      const result = getOptimalRoom(facialService, selma, roomsWithoutRoom1)
      
      expect(result.room).not.toBeNull()
      expect(result.reason).toContain('Assigned to available')
    })
  })
})

describe('Staff Availability Logic', () => {
  describe('Day of Week Constraints', () => {
    test('should respect Leonel Sunday-only schedule', () => {
      const leonel = mockStaff.find(s => s.name === 'Leonel Sidon')!
      
      // Test Sunday (available)
      const sunday = new Date('2024-07-28') // Sunday
      const sundayAvailability = getStaffDayAvailability(leonel, sunday)
      expect(sundayAvailability.isAvailable).toBe(true)
      expect(sundayAvailability.reasons).toHaveLength(0)
      
      // Test Monday (unavailable) 
      const monday = new Date('2024-07-29') // Monday
      const mondayAvailability = getStaffDayAvailability(leonel, monday)
      expect(mondayAvailability.isAvailable).toBe(false)
      expect(mondayAvailability.reasons).toContain('Leonel only works on Sundays')
    })

    test('should respect Selma/Tanisha Tuesday/Thursday off', () => {
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      const tanisha = mockStaff.find(s => s.name === 'Tanisha Harris')!
      
      // Test Tuesday (unavailable)
      const tuesday = new Date('2024-07-30') // Tuesday
      const selmaAvailability = getStaffDayAvailability(selma, tuesday)
      const tanishaAvailability = getStaffDayAvailability(tanisha, tuesday)
      
      expect(selmaAvailability.isAvailable).toBe(false)
      expect(tanishaAvailability.isAvailable).toBe(false)
      expect(selmaAvailability.reasons).toContain('Selma Villaver is off on Tuesdays and Thursdays')
      expect(tanishaAvailability.reasons).toContain('Tanisha Harris is off on Tuesdays and Thursdays')
    })

    test('should allow Robyn full schedule access', () => {
      const robyn = mockStaff.find(s => s.name === 'Robyn Camacho')!
      
      // Test all days of week
      const dates = [
        new Date('2024-07-28'), // Sunday
        new Date('2024-07-29'), // Monday  
        new Date('2024-07-30'), // Tuesday
        new Date('2024-07-31'), // Wednesday
        new Date('2024-08-01'), // Thursday
        new Date('2024-08-02'), // Friday
        new Date('2024-08-03')  // Saturday
      ]
      
      dates.forEach(date => {
        const availability = getStaffDayAvailability(robyn, date)
        expect(availability.isAvailable).toBe(true)
      })
    })
  })

  describe('Staff Capability Validation', () => {
    test('should validate staff service capabilities correctly', () => {
      const facialService = mockServices.find(s => s.category === 'facial')!
      const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
      
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      const robyn = mockStaff.find(s => s.name === 'Robyn Camacho')!
      
      // Selma can do facials but not body scrubs
      expect(canStaffPerformService(selma, facialService)).toBe(true)
      expect(canStaffPerformService(selma, bodyScrubService)).toBe(false)
      
      // Robyn can do both
      expect(canStaffPerformService(robyn, facialService)).toBe(true)
      expect(canStaffPerformService(robyn, bodyScrubService)).toBe(true)
    })

    test('should provide detailed capability validation reasons', () => {
      const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
      const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
      
      const validation = validateStaffCapability(selma, bodyScrubService)
      
      expect(validation.canPerform).toBe(false)
      expect(validation.reasons).toContain('Selma Villaver is not qualified to perform body_scrub services')
    })
  })

  describe('Time Slot Availability', () => {
    test('should check staff availability for specific time slots', () => {
      const robyn = mockStaff.find(s => s.name === 'Robyn Camacho')!
      const monday = new Date('2024-07-29') // Monday
      
      // Within work hours
      const morningAvailability = isStaffAvailableAtTime(robyn, monday, '10:00', 60)
      expect(morningAvailability.available).toBe(true)
      
      // Outside work hours (too early)
      const earlyAvailability = isStaffAvailableAtTime(robyn, monday, '07:00', 60)
      expect(earlyAvailability.available).toBe(false)
      expect(earlyAvailability.reasons[0]).toContain('works 09:00-19:00')
      
      // Outside work hours (too late)
      const lateAvailability = isStaffAvailableAtTime(robyn, monday, '18:30', 60)
      expect(lateAvailability.available).toBe(false)
      expect(lateAvailability.reasons[0]).toContain('works 09:00-19:00')
    })
  })
})

describe('Booking Conflict Detection', () => {
  const existingBookings: Booking[] = [
    {
      id: 'booking-1',
      service_id: 'service-facial-basic',
      staff_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Selma
      room_id: '11111111-1111-1111-1111-111111111111', // Room 1
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '555-0123',
      booking_date: '2024-08-01',
      start_time: '10:00',
      end_time: '10:30',
      status: 'confirmed',
      special_requests: null,
      total_price: 65.00,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  test('should detect staff double-booking conflicts', () => {
    const newBooking = {
      staff_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Same staff (Selma)
      room_id: '22222222-2222-2222-2222-222222222222', // Different room
      booking_date: '2024-08-01',
      start_time: '10:15', // Overlaps with existing 10:00-10:30
      end_time: '11:15'
    }
    
    const conflicts = checkBookingConflicts(newBooking, existingBookings)
    
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('staff')
    expect(conflicts[0].message).toContain('Staff member is already booked')
  })

  test('should detect room double-booking conflicts', () => {
    const newBooking = {
      staff_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Different staff (Robyn)
      room_id: '11111111-1111-1111-1111-111111111111', // Same room
      booking_date: '2024-08-01',
      start_time: '10:15', // Overlaps with existing 10:00-10:30
      end_time: '11:15'
    }
    
    const conflicts = checkBookingConflicts(newBooking, existingBookings)
    
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('room')
    expect(conflicts[0].message).toContain('Room is already booked')
  })

  test('should respect 15-minute buffer time', () => {
    const newBooking = {
      staff_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Different staff
      room_id: '11111111-1111-1111-1111-111111111111', // Same room as existing booking
      booking_date: '2024-08-01',
      start_time: '10:30', // Exactly when previous ends
      end_time: '11:30'
    }
    
    // With buffer (default)
    const conflictsWithBuffer = checkBookingConflicts(newBooking, existingBookings, true)
    expect(conflictsWithBuffer).toHaveLength(1) // Should conflict due to buffer
    
    // Without buffer
    const conflictsWithoutBuffer = checkBookingConflicts(newBooking, existingBookings, false)
    expect(conflictsWithoutBuffer).toHaveLength(0) // Should not conflict
  })

  test('should ignore cancelled bookings', () => {
    const cancelledBooking: Booking = {
      ...existingBookings[0],
      id: 'booking-cancelled',
      status: 'cancelled'
    }
    
    const newBooking = {
      staff_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Same staff as cancelled
      room_id: '11111111-1111-1111-1111-111111111111', // Same room as cancelled
      booking_date: '2024-08-01',
      start_time: '10:00', // Same time as cancelled
      end_time: '10:30'
    }
    
    const conflicts = checkBookingConflicts(newBooking, [cancelledBooking])
    
    expect(conflicts).toHaveLength(0) // No conflict with cancelled booking
  })
})

describe('Business Hours Validation', () => {
  test('should enforce business hour constraints', () => {
    const testDate = new Date('2024-08-01')
    
    // Valid time
    expect(canAccommodateService('10:00', 60, testDate)).toBe(true)
    
    // Too early
    expect(canAccommodateService('08:00', 60, testDate)).toBe(false)
    
    // Would end too late  
    expect(canAccommodateService('18:30', 60, testDate)).toBe(false)
    
    // Too close to closing (last booking policy)
    expect(canAccommodateService('18:30', 30, testDate)).toBe(false)
  })

  test('should validate appointment times comprehensively', () => {
    const today = new Date()
    const pastDate = new Date(today.getTime() - 24 * 60 * 60 * 1000) // Yesterday
    const futureDate = new Date(today.getTime() + 40 * 24 * 60 * 60 * 1000) // 40 days from now
    const validDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    
    // Past date
    const pastValidation = validateBookingTime(pastDate, '10:00', 60)
    expect(pastValidation.isValid).toBe(false)
    expect(pastValidation.errors).toContain('Cannot book appointments for past dates')
    
    // Too far future
    const futureValidation = validateBookingTime(futureDate, '10:00', 60)
    expect(futureValidation.isValid).toBe(false)
    expect(futureValidation.errors).toContain('Cannot book more than 30 days in advance')
    
    // Valid date and time
    const validValidation = validateBookingTime(validDate, '10:00', 60)
    expect(validValidation.isValid).toBe(true)
    expect(validValidation.errors).toHaveLength(0)
  })

  test('should provide warnings for limited availability days', () => {
    const sunday = new Date('2024-07-28') // Sunday
    const tuesday = new Date('2024-07-30') // Tuesday
    
    const sundayValidation = validateBookingTime(sunday, '10:00', 60)
    expect(sundayValidation.warnings).toContain('Sunday appointments have limited staff availability (Leonel only)')
    
    const tuesdayValidation = validateBookingTime(tuesday, '10:00', 60)
    expect(tuesdayValidation.warnings).toContain('Limited staff availability on Tuesdays and Thursdays (Selma and Tanisha unavailable)')
  })
})

describe('Comprehensive Booking Validation', () => {
  test('should validate complete booking request successfully', () => {
    const facialService = mockServices.find(s => s.category === 'facial')!
    const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
    const room1 = mockRooms.find(r => r.name === 'Room 1')!
    // Pick a Monday when Selma is available
    const validDate = new Date('2025-08-04') // Future Monday when Selma works
    
    const validation = validateBookingRequest(
      facialService,
      selma,
      room1,
      validDate,
      '10:00',
      []
    )
    
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
    expect(validation.conflicts).toHaveLength(0)
  })

  test('should reject invalid booking combinations', () => {
    // Body scrub service in Room 1 (invalid)
    const bodyScrubService = mockServices.find(s => s.category === 'body_scrub')!
    const selma = mockStaff.find(s => s.name === 'Selma Villaver')!
    const room1 = mockRooms.find(r => r.name === 'Room 1')!
    const validDate = new Date()
    validDate.setDate(validDate.getDate() + 7) // 7 days from now
    
    const validation = validateBookingRequest(
      bodyScrubService,
      selma,
      room1,
      validDate,
      '10:00',
      []
    )
    
    expect(validation.isValid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
    
    // Should include both staff capability and room requirement errors
    const errorString = validation.errors.join(' ')
    expect(errorString).toContain('not qualified to perform body_scrub')
    expect(errorString).toContain('Room 3')
  })

  test('should handle couples service validation', () => {
    const couplesService = mockServices.find(s => s.requires_couples_room)!
    const robyn = mockStaff.find(s => s.name === 'Robyn Camacho')!
    const room1 = mockRooms.find(r => r.name === 'Room 1')! // Single room
    const validDate = new Date()
    validDate.setDate(validDate.getDate() + 7) // 7 days from now
    
    const validation = validateBookingRequest(
      couplesService,
      robyn,
      room1,
      validDate,
      '10:00',
      []
    )
    
    expect(validation.isValid).toBe(false)
    expect(validation.errors.some(error => 
      error.includes('couples') || error.includes('capacity') || error.includes('Room 1') || error.includes('single occupancy')
    )).toBe(true)
  })
})

describe('Time Slot Generation', () => {
  test('should generate correct time slots', () => {
    const testDate = new Date('2024-08-01')
    const slots = generateTimeSlots(testDate)
    
    expect(slots).toContain('09:00')
    expect(slots).toContain('09:15')
    expect(slots).toContain('09:30')
    expect(slots[0]).toBe('09:00')
    
    // Should not include slots too close to closing
    expect(slots).not.toContain('18:45')
    expect(slots).not.toContain('19:00')
  })

  test('should consider service duration in slot generation', () => {
    const testDate = new Date('2024-08-01')
    const longServiceSlots = generateTimeSlots(testDate, 120) // 2-hour service
    const shortServiceSlots = generateTimeSlots(testDate, 30) // 30-min service
    
    // Long service should have fewer available slots
    expect(longServiceSlots.length).toBeLessThan(shortServiceSlots.length)
    
    // Long service shouldn't allow booking too late
    expect(longServiceSlots).not.toContain('17:30')
    expect(shortServiceSlots).toContain('17:30')
  })
})

describe('Edge Cases and Error Handling', () => {
  test('should handle null/undefined inputs gracefully', () => {
    // Test with null service
    const result = getOptimalRoom(null as any, undefined, mockRooms)
    expect(result.room).toBeNull()
    expect(result.errors).toContain('Service is required')

    // Test with null staff
    const capability = validateStaffCapability(null as any, mockServices[0])
    expect(capability.canPerform).toBe(false)
    expect(capability.reasons).toContain('No staff member specified')
  })

  test('should handle inactive staff/rooms/services', () => {
    const inactiveStaff = { ...mockStaff[0], is_active: false }
    const facialService = mockServices[0]
    
    const capability = validateStaffCapability(inactiveStaff, facialService)
    expect(capability.canPerform).toBe(false)
    expect(capability.reasons.some(reason => reason.includes('inactive'))).toBe(true)
  })

  test('should handle malformed schedule data', () => {
    const staffWithBadSchedule = {
      ...mockStaff[0],
      schedule: null
    }
    
    const availability = getStaffDayAvailability(staffWithBadSchedule, new Date())
    expect(availability.isAvailable).toBe(false)
    expect(availability.reasons.some(reason => reason.includes('no schedule'))).toBe(true)
  })
})