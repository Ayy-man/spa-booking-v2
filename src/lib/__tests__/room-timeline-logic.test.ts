/**
 * Unit tests for room timeline logic
 * Tests room assignment, booking slot management, and utilization calculations
 */

import { BookingWithRelations } from '@/types/booking'

// Extract logic functions from room timeline component for testing
// These are the key business logic functions that should be unit tested

/**
 * Get booking for a specific room and time slot
 * Extracted from RoomTimeline component logic
 */
function getBookingForSlot(
  bookings: BookingWithRelations[],
  roomId: string,
  timeString: string
): BookingWithRelations | null {
  return bookings.find(booking => {
    if (booking.room_id !== roomId) return false
    
    const bookingStart = booking.start_time.slice(0, 5) // HH:MM format
    const bookingEnd = booking.end_time.slice(0, 5)
    
    return timeString >= bookingStart && timeString < bookingEnd
  }) || null
}

/**
 * Calculate room utilization percentage
 * Extracted from RoomTimeline component logic
 */
function getRoomUtilization(bookings: BookingWithRelations[], roomId: string): number {
  const BUSINESS_HOURS = { start: 8, end: 20 } // 8 AM to 8 PM
  
  const roomBookings = bookings.filter(b => b.room_id === roomId)
  const totalBookedMinutes = roomBookings.reduce((total, booking) => total + booking.duration, 0)
  const totalBusinessMinutes = (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60
  return Math.round((totalBookedMinutes / totalBusinessMinutes) * 100)
}

/**
 * Validate room compatibility for service
 * Based on business rules from room timeline drag/drop logic
 */
function validateRoomCompatibility(
  serviceName: string,
  room: { id: string; name: string; has_body_scrub_equipment: boolean; is_couples_room: boolean }
): { isCompatible: boolean; reason?: string } {
  const lowerServiceName = serviceName.toLowerCase()
  const isBodyScrub = lowerServiceName.includes('scrub') || lowerServiceName.includes('salt')
  const isCouplesService = ['couples', 'couple', 'duo', 'double', 'partner'].some(keyword => 
    lowerServiceName.includes(keyword)
  )

  // Body scrubs can only be done in rooms with body scrub equipment
  if (isBodyScrub && !room.has_body_scrub_equipment) {
    return {
      isCompatible: false,
      reason: 'Body scrub services can only be performed in Room 3'
    }
  }

  // Couples services need couples rooms
  if (isCouplesService && !room.is_couples_room) {
    return {
      isCompatible: false,
      reason: 'Couples services require rooms with capacity for two people'
    }
  }

  return { isCompatible: true }
}

/**
 * Check for booking conflicts across duration
 * Based on room timeline conflict detection logic
 */
function hasBookingConflict(
  bookings: BookingWithRelations[],
  roomId: string,
  startTime: string,
  duration: number,
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBooking?: BookingWithRelations } {
  const SLOT_DURATION = 15 // 15 minutes
  
  const checkSlots = []
  const startDateTime = new Date(`2000-01-01T${startTime}:00`)
  
  for (let i = 0; i < duration; i += SLOT_DURATION) {
    const checkTime = new Date(startDateTime.getTime() + i * 60000)
    const checkTimeString = checkTime.toTimeString().slice(0, 5)
    checkSlots.push(checkTimeString)
    
    const conflictBooking = getBookingForSlot(bookings, roomId, checkTimeString)
    if (conflictBooking && conflictBooking.id !== excludeBookingId) {
      return { hasConflict: true, conflictingBooking: conflictBooking }
    }
  }

  return { hasConflict: false }
}

/**
 * Validate business hours constraint
 */
function validateBusinessHours(startTime: string, duration: number): { isValid: boolean; reason?: string } {
  const BUSINESS_HOURS = { start: 8, end: 20 } // 8 AM to 8 PM
  
  const startDateTime = new Date(`2000-01-01T${startTime}:00`)
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000)
  
  const startHour = startDateTime.getHours()
  const endHour = endDateTime.getHours()
  const endMinute = endDateTime.getMinutes()
  
  if (startHour < BUSINESS_HOURS.start) {
    return { isValid: false, reason: 'Booking cannot start before business hours (8:00 AM)' }
  }
  
  if (endHour > BUSINESS_HOURS.end || (endHour === BUSINESS_HOURS.end && endMinute > 0)) {
    return { isValid: false, reason: 'Booking cannot extend beyond business hours (8:00 PM)' }
  }
  
  return { isValid: true }
}

// Mock data for testing
const mockBookings: BookingWithRelations[] = [
  {
    id: 'booking-1',
    room_id: 'room-1',
    staff_id: 'staff-1',
    service_id: 'service-1',
    start_time: '09:00:00',
    end_time: '10:00:00',
    duration: 60,
    appointment_date: '2022-01-01',
    status: 'confirmed',
    customer_name: 'John Doe',
    customer_email: 'john@test.com',
    customer_phone: '555-0123',
    final_price: 85,
    service: {
      id: 'service-1',
      name: 'Basic Facial',
      category: 'facial',
      duration: 60
    },
    staff: {
      id: 'staff-1',
      name: 'Selma Villaver'
    },
    room: {
      id: 'room-1',
      name: 'Room 1'
    }
  } as BookingWithRelations,
  {
    id: 'booking-2',
    room_id: 'room-3',
    staff_id: 'staff-2',
    service_id: 'service-2',
    start_time: '14:00:00',
    end_time: '14:45:00',
    duration: 45,
    appointment_date: '2022-01-01',
    status: 'confirmed',
    customer_name: 'Jane Smith',
    customer_email: 'jane@test.com',
    customer_phone: '555-0456',
    final_price: 65,
    service: {
      id: 'service-2',
      name: 'Dead Sea Salt Body Scrub',
      category: 'body_scrub',
      duration: 45
    },
    staff: {
      id: 'staff-2',
      name: 'Robyn Camacho'
    },
    room: {
      id: 'room-3',
      name: 'Room 3'
    }
  } as BookingWithRelations,
  {
    id: 'booking-3',
    room_id: 'room-3',
    staff_id: 'staff-2',
    service_id: 'service-3',
    start_time: '16:00:00',
    end_time: '17:30:00',
    duration: 90,
    appointment_date: '2022-01-01',
    status: 'confirmed',
    customer_name: 'Bob Johnson',
    customer_email: 'bob@test.com',
    customer_phone: '555-0789',
    final_price: 130,
    service: {
      id: 'service-3',
      name: 'Couples Relaxation Massage',
      category: 'package',
      duration: 90
    },
    staff: {
      id: 'staff-2',
      name: 'Robyn Camacho'
    },
    room: {
      id: 'room-3',
      name: 'Room 3'
    }
  } as BookingWithRelations
]

const mockRooms = [
  {
    id: 'room-1',
    name: 'Room 1',
    has_body_scrub_equipment: false,
    is_couples_room: false
  },
  {
    id: 'room-2',
    name: 'Room 2',
    has_body_scrub_equipment: false,
    is_couples_room: true
  },
  {
    id: 'room-3',
    name: 'Room 3',
    has_body_scrub_equipment: true,
    is_couples_room: true
  }
]

describe('Room Timeline Logic', () => {
  describe('getBookingForSlot', () => {
    it('should find booking that covers the specified time slot', () => {
      const booking = getBookingForSlot(mockBookings, 'room-1', '09:30')
      expect(booking).toBeTruthy()
      expect(booking?.id).toBe('booking-1')
      expect(booking?.service.name).toBe('Basic Facial')
    })

    it('should return null when no booking covers the time slot', () => {
      const booking = getBookingForSlot(mockBookings, 'room-1', '11:00')
      expect(booking).toBeNull()
    })

    it('should return null for wrong room', () => {
      const booking = getBookingForSlot(mockBookings, 'room-2', '09:30')
      expect(booking).toBeNull()
    })

    it('should handle exact start time', () => {
      const booking = getBookingForSlot(mockBookings, 'room-1', '09:00')
      expect(booking?.id).toBe('booking-1')
    })

    it('should not include exact end time', () => {
      const booking = getBookingForSlot(mockBookings, 'room-1', '10:00')
      expect(booking).toBeNull()
    })

    it('should handle multiple bookings in same room', () => {
      const afternoonBooking = getBookingForSlot(mockBookings, 'room-3', '14:30')
      expect(afternoonBooking?.id).toBe('booking-2')
      expect(afternoonBooking?.service.name).toBe('Dead Sea Salt Body Scrub')

      const eveningBooking = getBookingForSlot(mockBookings, 'room-3', '16:30')
      expect(eveningBooking?.id).toBe('booking-3')
      expect(eveningBooking?.service.name).toBe('Couples Relaxation Massage')
    })

    it('should handle edge case times', () => {
      // Just before booking-2 ends
      const beforeEnd = getBookingForSlot(mockBookings, 'room-3', '14:44')
      expect(beforeEnd?.id).toBe('booking-2')

      // Exactly when booking-2 ends (should not find it)
      const atEnd = getBookingForSlot(mockBookings, 'room-3', '14:45')
      expect(atEnd).toBeNull()
    })

    it('should handle empty bookings array', () => {
      const booking = getBookingForSlot([], 'room-1', '09:00')
      expect(booking).toBeNull()
    })
  })

  describe('getRoomUtilization', () => {
    it('should calculate correct utilization for room with bookings', () => {
      // Room 1 has 1 booking of 60 minutes
      // Total business hours: 12 hours = 720 minutes
      // Utilization: 60/720 = 8.33% ≈ 8%
      const utilization = getRoomUtilization(mockBookings, 'room-1')
      expect(utilization).toBe(8)
    })

    it('should calculate correct utilization for room with multiple bookings', () => {
      // Room 3 has 2 bookings: 45 + 90 = 135 minutes
      // Total business hours: 12 hours = 720 minutes
      // Utilization: 135/720 = 18.75% ≈ 19%
      const utilization = getRoomUtilization(mockBookings, 'room-3')
      expect(utilization).toBe(19)
    })

    it('should return 0 for room with no bookings', () => {
      const utilization = getRoomUtilization(mockBookings, 'room-2')
      expect(utilization).toBe(0)
    })

    it('should return 0 for non-existent room', () => {
      const utilization = getRoomUtilization(mockBookings, 'non-existent-room')
      expect(utilization).toBe(0)
    })

    it('should handle empty bookings array', () => {
      const utilization = getRoomUtilization([], 'room-1')
      expect(utilization).toBe(0)
    })

    it('should calculate 100% utilization correctly', () => {
      const fullBookings = Array.from({ length: 12 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-full-${i}`,
        duration: 60,
        start_time: `${8 + i}:00:00`,
        end_time: `${9 + i}:00:00`
      }))

      const utilization = getRoomUtilization(fullBookings, 'room-1')
      expect(utilization).toBe(100)
    })

    it('should handle bookings with fractional hours', () => {
      const fractionalBookings = [
        { ...mockBookings[0], duration: 45, room_id: 'room-test' }, // 0.75 hours
        { ...mockBookings[0], duration: 30, room_id: 'room-test' }  // 0.5 hours
      ]

      // Total: 75 minutes, Business hours: 720 minutes
      // Utilization: 75/720 = 10.42% ≈ 10%
      const utilization = getRoomUtilization(fractionalBookings, 'room-test')
      expect(utilization).toBe(10)
    })
  })

  describe('validateRoomCompatibility', () => {
    describe('Body Scrub Services', () => {
      it('should allow body scrub in Room 3 (has equipment)', () => {
        const result = validateRoomCompatibility('Dead Sea Salt Body Scrub', mockRooms[2])
        expect(result.isCompatible).toBe(true)
      })

      it('should reject body scrub in Room 1 (no equipment)', () => {
        const result = validateRoomCompatibility('Dead Sea Salt Body Scrub', mockRooms[0])
        expect(result.isCompatible).toBe(false)
        expect(result.reason).toContain('Room 3')
      })

      it('should handle case insensitive body scrub detection', () => {
        const result = validateRoomCompatibility('EXFOLIATING SALT SCRUB', mockRooms[0])
        expect(result.isCompatible).toBe(false)
      })

      it('should detect various body scrub service names', () => {
        const bodyScrubNames = [
          'Body Scrub Treatment',
          'Salt Scrub Therapy',
          'Exfoliating Body Scrub',
          'Dead Sea Scrub'
        ]

        bodyScrubNames.forEach(name => {
          const result = validateRoomCompatibility(name, mockRooms[0])
          expect(result.isCompatible).toBe(false)
        })
      })
    })

    describe('Couples Services', () => {
      it('should allow couples service in couples room', () => {
        const result = validateRoomCompatibility('Couples Massage', mockRooms[1])
        expect(result.isCompatible).toBe(true)
      })

      it('should reject couples service in single room', () => {
        const result = validateRoomCompatibility('Couples Massage', mockRooms[0])
        expect(result.isCompatible).toBe(false)
        expect(result.reason).toContain('capacity for two people')
      })

      it('should detect various couples service names', () => {
        const couplesNames = [
          'Couples Relaxation Package',
          'Partner Massage',
          'Duo Facial Treatment',
          'Double Therapy Session'
        ]

        couplesNames.forEach(name => {
          const result = validateRoomCompatibility(name, mockRooms[0])
          expect(result.isCompatible).toBe(false)
        })
      })

      it('should allow couples service in Room 3 (premium couples room)', () => {
        const result = validateRoomCompatibility('Couples Massage', mockRooms[2])
        expect(result.isCompatible).toBe(true)
      })
    })

    describe('Regular Services', () => {
      it('should allow regular services in any room', () => {
        const regularServices = [
          'Basic Facial',
          'Swedish Massage',
          'Manicure',
          'Pedicure'
        ]

        regularServices.forEach(service => {
          mockRooms.forEach(room => {
            const result = validateRoomCompatibility(service, room)
            expect(result.isCompatible).toBe(true)
          })
        })
      })
    })

    describe('Special Cases', () => {
      it('should prioritize body scrub requirement over couples requirement', () => {
        // A couples body scrub should still require Room 3 (equipment)
        const result1 = validateRoomCompatibility('Couples Body Scrub', mockRooms[1]) // Room 2: couples but no equipment
        expect(result1.isCompatible).toBe(false)
        expect(result1.reason).toContain('Room 3')

        const result2 = validateRoomCompatibility('Couples Body Scrub', mockRooms[2]) // Room 3: has both
        expect(result2.isCompatible).toBe(true)
      })

      it('should handle empty or invalid service names', () => {
        const edgeCases = ['', '   ', 'xyz123', null as any, undefined as any]
        
        edgeCases.forEach(service => {
          mockRooms.forEach(room => {
            expect(() => validateRoomCompatibility(service, room)).not.toThrow()
            const result = validateRoomCompatibility(service, room)
            expect(result.isCompatible).toBe(true) // Default to compatible for unknown services
          })
        })
      })
    })
  })

  describe('hasBookingConflict', () => {
    it('should detect direct time overlap conflict', () => {
      const result = hasBookingConflict(mockBookings, 'room-1', '09:30', 60)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingBooking?.id).toBe('booking-1')
    })

    it('should detect partial overlap at start', () => {
      const result = hasBookingConflict(mockBookings, 'room-1', '08:30', 60)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingBooking?.id).toBe('booking-1')
    })

    it('should detect partial overlap at end', () => {
      const result = hasBookingConflict(mockBookings, 'room-1', '09:45', 60)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingBooking?.id).toBe('booking-1')
    })

    it('should not detect conflict when times do not overlap', () => {
      const result = hasBookingConflict(mockBookings, 'room-1', '10:00', 60)
      expect(result.hasConflict).toBe(false)
      expect(result.conflictingBooking).toBeUndefined()
    })

    it('should exclude specific booking from conflict check', () => {
      const result = hasBookingConflict(mockBookings, 'room-1', '09:00', 60, 'booking-1')
      expect(result.hasConflict).toBe(false)
    })

    it('should handle long duration bookings correctly', () => {
      const result = hasBookingConflict(mockBookings, 'room-3', '15:30', 120) // 2 hours
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingBooking?.id).toBe('booking-3')
    })

    it('should handle 15-minute slot precision', () => {
      // Test with 15-minute increments
      const result1 = hasBookingConflict(mockBookings, 'room-3', '14:00', 15)
      expect(result1.hasConflict).toBe(true) // Overlaps with booking-2

      const result2 = hasBookingConflict(mockBookings, 'room-3', '14:45', 15)
      expect(result2.hasConflict).toBe(false) // Just after booking-2 ends
    })

    it('should handle edge case at exact boundaries', () => {
      // Booking exactly when another ends should not conflict
      const result = hasBookingConflict(mockBookings, 'room-3', '14:45', 30)
      expect(result.hasConflict).toBe(false)
    })

    it('should handle empty bookings array', () => {
      const result = hasBookingConflict([], 'room-1', '09:00', 60)
      expect(result.hasConflict).toBe(false)
    })

    it('should handle multiple short bookings in sequence', () => {
      const sequentialBookings = [
        { ...mockBookings[0], id: 'seq-1', start_time: '08:00:00', end_time: '08:15:00', duration: 15 },
        { ...mockBookings[0], id: 'seq-2', start_time: '08:15:00', end_time: '08:30:00', duration: 15 },
        { ...mockBookings[0], id: 'seq-3', start_time: '08:30:00', end_time: '08:45:00', duration: 15 }
      ]

      // Should not conflict with exactly sequential bookings
      const result1 = hasBookingConflict(sequentialBookings, 'room-1', '08:45', 15)
      expect(result1.hasConflict).toBe(false)

      // Should conflict with overlapping booking
      const result2 = hasBookingConflict(sequentialBookings, 'room-1', '08:10', 30)
      expect(result2.hasConflict).toBe(true)
    })
  })

  describe('validateBusinessHours', () => {
    it('should allow booking within business hours', () => {
      const result = validateBusinessHours('10:00', 60)
      expect(result.isValid).toBe(true)
    })

    it('should reject booking starting before business hours', () => {
      const result = validateBusinessHours('07:00', 60)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('before business hours')
    })

    it('should reject booking ending after business hours', () => {
      const result = validateBusinessHours('19:30', 60)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('beyond business hours')
    })

    it('should handle exact business hour boundaries', () => {
      // Start exactly at opening
      const result1 = validateBusinessHours('08:00', 60)
      expect(result1.isValid).toBe(true)

      // End exactly at closing
      const result2 = validateBusinessHours('19:00', 60)
      expect(result2.isValid).toBe(true)

      // End one minute past closing
      const result3 = validateBusinessHours('19:59', 2)
      expect(result3.isValid).toBe(false)
    })

    it('should handle long duration bookings', () => {
      // 6-hour booking starting at 8 AM should end at 2 PM (valid)
      const result1 = validateBusinessHours('08:00', 360)
      expect(result1.isValid).toBe(true)

      // 6-hour booking starting at 3 PM should end at 9 PM (invalid)
      const result2 = validateBusinessHours('15:00', 360)
      expect(result2.isValid).toBe(false)
    })

    it('should handle midnight and edge times', () => {
      const result1 = validateBusinessHours('00:00', 60)
      expect(result1.isValid).toBe(false)

      const result2 = validateBusinessHours('23:00', 60)
      expect(result2.isValid).toBe(false)
    })

    it('should handle 24-hour time format edge cases', () => {
      const result1 = validateBusinessHours('07:59', 1)
      expect(result1.isValid).toBe(false)

      const result2 = validateBusinessHours('08:00', 1)
      expect(result2.isValid).toBe(true)

      const result3 = validateBusinessHours('19:59', 1)
      expect(result3.isValid).toBe(true)

      const result4 = validateBusinessHours('20:00', 1)
      expect(result4.isValid).toBe(false)
    })

    it('should handle zero and negative durations', () => {
      const result1 = validateBusinessHours('10:00', 0)
      expect(result1.isValid).toBe(true)

      // Negative duration should still validate start time
      const result2 = validateBusinessHours('07:00', -60)
      expect(result2.isValid).toBe(false)
    })
  })

  // Integration tests combining multiple functions
  describe('Integration Tests', () => {
    it('should handle complete room assignment validation flow', () => {
      const serviceName = 'Couples Body Scrub'
      const startTime = '15:00'
      const duration = 60

      // Step 1: Check room compatibility
      const room1Compat = validateRoomCompatibility(serviceName, mockRooms[0])
      const room3Compat = validateRoomCompatibility(serviceName, mockRooms[2])
      
      expect(room1Compat.isCompatible).toBe(false)
      expect(room3Compat.isCompatible).toBe(true)

      // Step 2: Check for conflicts in compatible room
      const conflict = hasBookingConflict(mockBookings, 'room-3', startTime, duration)
      expect(conflict.hasConflict).toBe(true) // Conflicts with booking-3

      // Step 3: Check business hours
      const businessHours = validateBusinessHours(startTime, duration)
      expect(businessHours.isValid).toBe(true)
    })

    it('should validate successful booking scenario', () => {
      const serviceName = 'Swedish Massage'
      const startTime = '11:00'
      const duration = 90

      // Check all rooms for compatibility
      const compatibilities = mockRooms.map(room => validateRoomCompatibility(serviceName, room))
      expect(compatibilities.every(c => c.isCompatible)).toBe(true)

      // Check for conflicts in each room
      const conflicts = mockRooms.map(room => hasBookingConflict(mockBookings, room.id, startTime, duration))
      expect(conflicts.some(c => !c.hasConflict)).toBe(true) // At least one room available

      // Check business hours
      const businessHours = validateBusinessHours(startTime, duration)
      expect(businessHours.isValid).toBe(true)
    })

    it('should handle complex multi-room utilization calculation', () => {
      const allRoomUtilizations = mockRooms.map(room => ({
        room: room.name,
        utilization: getRoomUtilization(mockBookings, room.id)
      }))

      const totalUtilization = allRoomUtilizations.reduce((sum, room) => sum + room.utilization, 0)
      const averageUtilization = Math.round(totalUtilization / mockRooms.length)

      expect(allRoomUtilizations).toEqual([
        { room: 'Room 1', utilization: 8 },
        { room: 'Room 2', utilization: 0 },
        { room: 'Room 3', utilization: 19 }
      ])
      expect(averageUtilization).toBe(9) // (8 + 0 + 19) / 3 ≈ 9
    })

    it('should handle peak time analysis', () => {
      // Check utilization during peak times (morning and afternoon)
      const peakTimeSlots = ['09:00', '10:00', '14:00', '15:00', '16:00']
      
      const peakAnalysis = peakTimeSlots.map(timeSlot => ({
        time: timeSlot,
        occupiedRooms: mockRooms.filter(room => 
          getBookingForSlot(mockBookings, room.id, timeSlot) !== null
        ).length
      }))

      expect(peakAnalysis).toEqual([
        { time: '09:00', occupiedRooms: 1 }, // Room 1 occupied
        { time: '10:00', occupiedRooms: 0 }, // No rooms occupied
        { time: '14:00', occupiedRooms: 1 }, // Room 3 occupied
        { time: '15:00', occupiedRooms: 0 }, // No rooms occupied
        { time: '16:00', occupiedRooms: 1 }  // Room 3 occupied
      ])
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large number of bookings efficiently', () => {
      const largeBookingsArray = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBookings[0],
        id: `large-booking-${i}`,
        room_id: `room-${i % 10}`,
        start_time: `${8 + (i % 12)}:00:00`,
        end_time: `${9 + (i % 12)}:00:00`
      }))

      const start = performance.now()
      getRoomUtilization(largeBookingsArray, 'room-1')
      const end = performance.now()

      expect(end - start).toBeLessThan(50) // Should complete in less than 50ms
    })

    it('should handle malformed booking data gracefully', () => {
      const malformedBookings = [
        { ...mockBookings[0], start_time: null },
        { ...mockBookings[0], end_time: '' },
        { ...mockBookings[0], duration: null },
        { ...mockBookings[0], room_id: undefined }
      ] as any[]

      expect(() => {
        getRoomUtilization(malformedBookings, 'room-1')
        getBookingForSlot(malformedBookings, 'room-1', '09:00')
      }).not.toThrow()
    })

    it('should handle edge case time formats', () => {
      const edgeTimeFormats = [
        '09:00:00.000',
        '9:00',
        '09:00:00',
        '9:00:00'
      ]

      // The current implementation expects HH:MM format after slice(0, 5)
      edgeTimeFormats.forEach(timeFormat => {
        const testBooking = {
          ...mockBookings[0],
          start_time: timeFormat,
          end_time: '10:00:00'
        }

        expect(() => {
          getBookingForSlot([testBooking], 'room-1', '09:30')
        }).not.toThrow()
      })
    })
  })
})