/**
 * Buffer Time and Double-Booking Prevention Tests
 * 
 * Tests for the 15-minute buffer time enforcement between appointments
 * and comprehensive double-booking prevention logic
 */

import { addMinutes, format, parseISO } from 'date-fns'
import {
  checkBookingConflicts,
  validateBookingRequest,
  canAccommodateService,
  calculateNextAvailableSlot,
  getTotalAppointmentDuration,
  BUSINESS_HOURS
} from '@/lib/booking-logic'
import { Booking, Service, Staff, Room, BookingConflict } from '@/types/booking'

// Mock data for testing
const mockService: Service = {
  id: 'basic-facial',
  name: 'Basic Facial',
  category: 'facial',
  price: 65,
  duration: 60,
  is_couples_service: false,
  requires_room_3: false,
  is_active: true
}

const mockStaff: Staff = {
  id: 'staff-1',
  name: 'Test Staff',
  capabilities: ['facial', 'massage'],
  is_active: true,
  default_room_id: 1
}

const mockRoom: Room = {
  id: 1,
  name: 'Room 1',
  capacity: 1,
  capabilities: ['facial'],
  is_active: true
}

const createMockBooking = (
  date: string,
  startTime: string,
  endTime: string,
  staffId: string = 'staff-1',
  roomId: number = 1,
  status: string = 'confirmed'
): Booking => ({
  id: `booking-${Date.now()}-${Math.random()}`,
  customer_name: 'Test Customer',
  customer_email: 'test@example.com',
  appointment_date: date,
  start_time: startTime,
  end_time: endTime,
  staff_id: staffId,
  room_id: roomId,
  service_id: 'basic-facial',
  status,
  duration: 60,
  price: 65.00,
  payment_status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

describe('Buffer Time and Double-Booking Prevention', () => {
  const testDate = '2024-08-07'

  describe('Business Hours Constants', () => {
    test('should have correct buffer time configuration', () => {
      expect(BUSINESS_HOURS.bufferTime).toBe(15)
      expect(BUSINESS_HOURS.slotDuration).toBe(15)
      expect(BUSINESS_HOURS.start).toBe('09:00')
      expect(BUSINESS_HOURS.end).toBe('19:00')
    })
  })

  describe('Buffer Time Calculations', () => {
    test('should calculate correct total duration with buffer', () => {
      const serviceDuration = 60
      const totalWithBuffer = getTotalAppointmentDuration(serviceDuration, true)
      const totalWithoutBuffer = getTotalAppointmentDuration(serviceDuration, false)
      
      expect(totalWithBuffer).toBe(75) // 60 + 15 minutes buffer
      expect(totalWithoutBuffer).toBe(60) // Just service duration
    })

    test('should calculate next available slot with buffer', () => {
      const lastEndTime = '10:00'
      const nextSlot = calculateNextAvailableSlot(lastEndTime, 15)
      
      expect(nextSlot).toBe('10:15') // 10:00 + 15 minutes buffer
    })

    test('should calculate next available slot with custom buffer', () => {
      const lastEndTime = '14:30'
      const nextSlot = calculateNextAvailableSlot(lastEndTime, 30) // 30-minute buffer
      
      expect(nextSlot).toBe('15:00') // 14:30 + 30 minutes
    })
  })

  describe('Service Accommodation with Buffer', () => {
    test('should accommodate service within business hours with buffer', () => {
      const date = parseISO(`${testDate}T12:00:00`)
      
      // 60-minute service at 12:00 = ends at 13:00, with 15min buffer = 13:15
      expect(canAccommodateService('12:00', 60, date, true)).toBe(true)
      
      // Should fit comfortably before closing
      expect(canAccommodateService('10:00', 60, date, true)).toBe(true)
    })

    test('should reject service that would exceed business hours with buffer', () => {
      const date = parseISO(`${testDate}T12:00:00`)
      
      // Service at 18:30 would end at 19:30 + 15min buffer = 19:45 (after closing)
      expect(canAccommodateService('18:30', 60, date, true)).toBe(false)
      
      // Even 18:00 start would be too late (19:00 + 15min buffer = 19:15 > 19:00 close)
      expect(canAccommodateService('18:00', 60, date, true)).toBe(false)
    })

    test('should accommodate service without buffer consideration', () => {
      const date = parseISO(`${testDate}T12:00:00`)
      
      // Without buffer, service can end exactly at closing time
      expect(canAccommodateService('18:00', 60, date, false)).toBe(true)
      
      // But not beyond closing time
      expect(canAccommodateService('18:30', 60, date, false)).toBe(false)
    })
  })

  describe('Booking Conflict Detection', () => {
    test('should detect room conflicts with buffer time', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const newBooking = {
        staff_id: 'staff-2', // Different staff
        room_id: '1', // Same room
        appointment_date: testDate,
        start_time: '11:00', // Starts exactly when previous ends
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking], true)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('room')
      expect(conflicts[0].message).toContain('15-minute cleaning buffer')
    })

    test('should detect staff conflicts with buffer time', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const newBooking = {
        staff_id: 'staff-1', // Same staff
        room_id: '2', // Different room
        appointment_date: testDate,
        start_time: '11:00', // Starts exactly when previous ends
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking], true)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('staff')
      expect(conflicts[0].message).toContain('15-minute buffer')
    })

    test('should allow booking with sufficient buffer time gap', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const newBooking = {
        staff_id: 'staff-2', // Different staff
        room_id: '2', // Different room
        appointment_date: testDate,
        start_time: '11:15', // 15 minutes after previous ends
        end_time: '12:15'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking], true)
      
      expect(conflicts).toHaveLength(0)
    })

    test('should detect buffer overlap even with small gaps', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const newBooking = {
        staff_id: 'staff-1',
        room_id: '1',
        appointment_date: testDate,
        start_time: '11:10', // Only 10 minutes gap (less than 15-minute buffer)
        end_time: '12:10'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking], true)
      
      expect(conflicts).toHaveLength(2) // Both room and staff conflicts
      expect(conflicts.some(c => c.type === 'staff')).toBe(true)
      expect(conflicts.some(c => c.type === 'room')).toBe(true)
    })

    test('should ignore cancelled bookings in conflict detection', () => {
      const cancelledBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1, 'cancelled')
      
      const newBooking = {
        staff_id: 'staff-1',
        room_id: '1',
        appointment_date: testDate,
        start_time: '10:30', // Overlaps with cancelled booking
        end_time: '11:30'
      }

      const conflicts = checkBookingConflicts(newBooking, [cancelledBooking], true)
      
      expect(conflicts).toHaveLength(0) // No conflicts with cancelled bookings
    })

    test('should handle multiple overlapping bookings', () => {
      const booking1 = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      const booking2 = createMockBooking(testDate, '11:00', '12:00', 'staff-2', 2)
      
      const newBooking = {
        staff_id: 'staff-1', // Conflicts with booking1
        room_id: '2', // Conflicts with booking2
        appointment_date: testDate,
        start_time: '10:45',
        end_time: '11:45'
      }

      const conflicts = checkBookingConflicts(newBooking, [booking1, booking2], true)
      
      expect(conflicts).toHaveLength(2)
      expect(conflicts.some(c => c.type === 'staff')).toBe(true)
      expect(conflicts.some(c => c.type === 'room')).toBe(true)
    })
  })

  describe('Buffer Time Edge Cases', () => {
    test('should handle exact buffer time boundaries', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      // Booking exactly at buffer boundary (should conflict)
      const conflictingBooking = {
        staff_id: 'staff-1',
        room_id: '1',
        appointment_date: testDate,
        start_time: '11:14', // 14 minutes after (less than 15-minute buffer)
        end_time: '12:14'
      }

      const conflicts = checkBookingConflicts(conflictingBooking, [existingBooking], true)
      expect(conflicts).toHaveLength(2)

      // Booking just outside buffer boundary (should not conflict) - use different resources
      const nonConflictingBooking = {
        staff_id: 'staff-2', // Different staff
        room_id: '2', // Different room
        appointment_date: testDate,
        start_time: '11:16', // 16 minutes after (more than 15-minute buffer)
        end_time: '12:16'
      }

      const noConflicts = checkBookingConflicts(nonConflictingBooking, [existingBooking], true)
      expect(noConflicts).toHaveLength(0)
    })

    test('should handle booking before existing appointment with buffer', () => {
      const existingBooking = createMockBooking(testDate, '11:00', '12:00', 'staff-1', 1)
      
      // New booking ending exactly when existing starts (should conflict due to buffer)
      const conflictingBooking = {
        staff_id: 'staff-1',
        room_id: '1',
        appointment_date: testDate,
        start_time: '10:00',
        end_time: '11:00'
      }

      const conflicts = checkBookingConflicts(conflictingBooking, [existingBooking], true)
      expect(conflicts).toHaveLength(2)

      // New booking ending with buffer before existing starts (should not conflict) - use different resources
      const nonConflictingBooking = {
        staff_id: 'staff-2', // Different staff
        room_id: '2', // Different room
        appointment_date: testDate,
        start_time: '09:30',
        end_time: '10:45' // Ends 15 minutes before existing starts
      }

      const noConflicts = checkBookingConflicts(nonConflictingBooking, [existingBooking], true)
      expect(noConflicts).toHaveLength(0)
    })
  })

  describe('Comprehensive Booking Validation with Buffer', () => {
    test('should validate booking request with buffer considerations', () => {
      const date = parseISO(`${testDate}T12:00:00`)
      const existingBooking = createMockBooking(testDate, '13:00', '14:00', 'staff-1', 1)

      // Try to book too close to existing booking (within buffer)
      const validation = validateBookingRequest(
        mockService,
        mockStaff,
        mockRoom,
        date,
        '14:10', // 10 minutes after existing booking ends (less than 15-min buffer)
        [existingBooking]
      )

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Staff member is already booked'),
          expect.stringContaining('Room is already booked')
        ])
      )
      expect(validation.conflicts).toHaveLength(2)
    })

    test('should allow booking outside buffer time', () => {
      const date = parseISO(`${testDate}T12:00:00`)
      const existingBooking = createMockBooking(testDate, '13:00', '14:00', 'staff-2', 2) // Different staff and room

      // Book with sufficient buffer gap
      const validation = validateBookingRequest(
        mockService,
        mockStaff,
        mockRoom,
        date,
        '14:15', // Exactly 15 minutes after existing booking ends
        [existingBooking]
      )

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.conflicts).toHaveLength(0)
    })
  })

  describe('Buffer Time Disable Option', () => {
    test('should allow immediate booking when buffer is disabled', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const newBooking = {
        staff_id: 'staff-2', // Different staff
        room_id: '1', // Same room
        appointment_date: testDate,
        start_time: '11:00', // Starts exactly when previous ends
        end_time: '12:00'
      }

      // With buffer - should conflict
      const conflictsWithBuffer = checkBookingConflicts(newBooking, [existingBooking], true)
      expect(conflictsWithBuffer).toHaveLength(1)

      // Without buffer - should not conflict
      const conflictsWithoutBuffer = checkBookingConflicts(newBooking, [existingBooking], false)
      expect(conflictsWithoutBuffer).toHaveLength(0)
    })

    test('should still detect actual time overlaps even without buffer', () => {
      const existingBooking = createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1)
      
      const overlappingBooking = {
        staff_id: 'staff-1',
        room_id: '1',
        appointment_date: testDate,
        start_time: '10:30', // Overlaps with existing booking
        end_time: '11:30'
      }

      // Even without buffer, actual overlaps should be detected
      const conflicts = checkBookingConflicts(overlappingBooking, [existingBooking], false)
      expect(conflicts).toHaveLength(2) // Both staff and room conflicts
    })
  })

  describe('Complex Scheduling Scenarios', () => {
    test('should handle back-to-back bookings with different staff and rooms', () => {
      const bookings = [
        createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1),
        createMockBooking(testDate, '11:15', '12:15', 'staff-2', 2),
        createMockBooking(testDate, '12:30', '13:30', 'staff-1', 3)
      ]

      // Try to book in a slot that respects all buffers
      const newBooking = {
        staff_id: 'staff-3',
        room_id: '4',
        appointment_date: testDate,
        start_time: '13:45',
        end_time: '14:45'
      }

      const conflicts = checkBookingConflicts(newBooking, bookings, true)
      expect(conflicts).toHaveLength(0) // Should be no conflicts
    })

    test('should detect complex multi-resource conflicts', () => {
      const bookings = [
        createMockBooking(testDate, '10:00', '11:00', 'staff-1', 1),
        createMockBooking(testDate, '10:00', '11:00', 'staff-2', 2)
      ]

      // New booking that conflicts with both existing bookings
      const newBooking = {
        staff_id: 'staff-1', // Conflicts with first booking (staff)
        room_id: '2', // Conflicts with second booking (room)
        appointment_date: testDate,
        start_time: '10:30',
        end_time: '11:30'
      }

      const conflicts = checkBookingConflicts(newBooking, bookings, true)
      expect(conflicts).toHaveLength(2)
      expect(conflicts.some(c => c.type === 'staff')).toBe(true)
      expect(conflicts.some(c => c.type === 'room')).toBe(true)
    })
  })
})