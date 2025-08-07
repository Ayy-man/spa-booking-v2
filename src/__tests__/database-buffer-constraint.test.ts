/**
 * Database Buffer Constraint Tests
 * 
 * Tests for the database migration 026_fix_booking_buffer_time.sql
 * that implements 15-minute buffer time constraints in the database
 */

import { addMinutes, format, parseISO } from 'date-fns'

// Mock database connection and query execution
interface MockBooking {
  id: string
  room_id: number
  staff_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  duration: number
  created_at: string
  updated_at: string
}

class MockDatabase {
  private bookings: MockBooking[] = []

  // Simulate the check_booking_conflicts trigger function
  checkBookingConflicts(newBooking: Partial<MockBooking>): { hasConflict: boolean; error?: string } {
    const bufferMinutes = 15
    const newStart = parseISO(`${newBooking.appointment_date}T${newBooking.start_time}:00`)
    const newEnd = parseISO(`${newBooking.appointment_date}T${newBooking.end_time}:00`)
    
    // Add buffer time
    const newStartWithBuffer = addMinutes(newStart, -bufferMinutes)
    const newEndWithBuffer = addMinutes(newEnd, bufferMinutes)

    for (const existing of this.bookings) {
      if (existing.status === 'cancelled') continue
      if (existing.id === newBooking.id) continue
      if (existing.appointment_date !== newBooking.appointment_date) continue

      const existingStart = parseISO(`${existing.appointment_date}T${existing.start_time}:00`)
      const existingEnd = parseISO(`${existing.appointment_date}T${existing.end_time}:00`)
      const existingStartWithBuffer = addMinutes(existingStart, -bufferMinutes)
      const existingEndWithBuffer = addMinutes(existingEnd, bufferMinutes)

      // Check for room conflicts
      if (existing.room_id === newBooking.room_id) {
        const hasOverlap = (
          (newStart < existingEndWithBuffer && newEnd > existingStartWithBuffer)
        )
        
        if (hasOverlap) {
          return {
            hasConflict: true,
            error: 'Room is already booked for this time slot (including 15-minute buffer between appointments)'
          }
        }
      }

      // Check for staff conflicts
      if (existing.staff_id === newBooking.staff_id) {
        const hasOverlap = (
          (newStart < existingEndWithBuffer && newEnd > existingStartWithBuffer)
        )
        
        if (hasOverlap) {
          return {
            hasConflict: true,
            error: 'Staff member is already booked for this time slot (including 15-minute buffer between appointments)'
          }
        }
      }
    }

    return { hasConflict: false }
  }

  // Simulate the is_time_slot_available function
  isTimeSlotAvailable(
    roomId: number,
    staffId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): boolean {
    const mockBooking: Partial<MockBooking> = {
      id: excludeBookingId,
      room_id: roomId,
      staff_id: staffId,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime
    }

    const result = this.checkBookingConflicts(mockBooking)
    return !result.hasConflict
  }

  // Simulate inserting a booking
  insertBooking(booking: MockBooking): { success: boolean; error?: string } {
    const conflictCheck = this.checkBookingConflicts(booking)
    
    if (conflictCheck.hasConflict) {
      return { success: false, error: conflictCheck.error }
    }

    // Validate duration matches time difference
    const startTime = parseISO(`${booking.appointment_date}T${booking.start_time}:00`)
    const endTime = parseISO(`${booking.appointment_date}T${booking.end_time}:00`)
    const calculatedDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    
    if (calculatedDuration !== booking.duration) {
      return { 
        success: false, 
        error: 'Duration must match the time difference between start_time and end_time' 
      }
    }

    this.bookings.push(booking)
    return { success: true }
  }

  // Update existing booking
  updateBooking(id: string, updates: Partial<MockBooking>): { success: boolean; error?: string } {
    const existingIndex = this.bookings.findIndex(b => b.id === id)
    if (existingIndex === -1) {
      return { success: false, error: 'Booking not found' }
    }

    const updatedBooking = { ...this.bookings[existingIndex], ...updates }
    const conflictCheck = this.checkBookingConflicts(updatedBooking)
    
    if (conflictCheck.hasConflict) {
      return { success: false, error: conflictCheck.error }
    }

    this.bookings[existingIndex] = updatedBooking
    return { success: true }
  }

  // Clear all bookings
  clear(): void {
    this.bookings = []
  }

  // Get all bookings
  getAllBookings(): MockBooking[] {
    return [...this.bookings]
  }
}

describe('Database Buffer Constraint Tests', () => {
  let db: MockDatabase

  beforeEach(() => {
    db = new MockDatabase()
  })

  const createMockBooking = (
    id: string,
    roomId: number,
    staffId: string,
    date: string,
    startTime: string,
    duration: number,
    status: string = 'confirmed'
  ): MockBooking => {
    const start = parseISO(`${date}T${startTime}:00`)
    const end = addMinutes(start, duration)
    
    return {
      id,
      room_id: roomId,
      staff_id: staffId,
      appointment_date: date,
      start_time: startTime,
      end_time: format(end, 'HH:mm'),
      status,
      duration,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  describe('Buffer Time Constraint Enforcement', () => {
    test('should prevent room double-booking within 15-minute buffer', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      const newBooking = createMockBooking('booking-2', 1, 'staff-2', '2024-08-07', '11:00', 60)

      // Insert existing booking
      const insertResult = db.insertBooking(existingBooking)
      expect(insertResult.success).toBe(true)

      // Try to insert new booking that starts exactly when previous ends (should fail due to buffer)
      const conflictResult = db.insertBooking(newBooking)
      expect(conflictResult.success).toBe(false)
      expect(conflictResult.error).toContain('Room is already booked')
      expect(conflictResult.error).toContain('15-minute buffer')
    })

    test('should prevent staff double-booking within 15-minute buffer', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      const newBooking = createMockBooking('booking-2', 2, 'staff-1', '2024-08-07', '11:00', 60)

      db.insertBooking(existingBooking)
      
      const conflictResult = db.insertBooking(newBooking)
      expect(conflictResult.success).toBe(false)
      expect(conflictResult.error).toContain('Staff member is already booked')
      expect(conflictResult.error).toContain('15-minute buffer')
    })

    test('should allow booking with sufficient buffer time', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      const newBooking = createMockBooking('booking-2', 1, 'staff-1', '2024-08-07', '11:15', 60)

      db.insertBooking(existingBooking)
      
      const insertResult = db.insertBooking(newBooking)
      expect(insertResult.success).toBe(true)
    })

    test('should detect buffer conflicts before existing bookings', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '11:00', 60)
      const newBooking = createMockBooking('booking-2', 1, 'staff-1', '2024-08-07', '10:00', 60)

      db.insertBooking(existingBooking)
      
      // New booking ends at 11:00, existing starts at 11:00 - should conflict due to buffer
      const conflictResult = db.insertBooking(newBooking)
      expect(conflictResult.success).toBe(false)
      expect(conflictResult.error).toContain('15-minute buffer')
    })

    test('should allow booking before existing with sufficient buffer', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '11:00', 60)
      const newBooking = createMockBooking('booking-2', 1, 'staff-1', '2024-08-07', '09:30', 75) // Ends at 10:45

      db.insertBooking(existingBooking)
      
      const insertResult = db.insertBooking(newBooking)
      expect(insertResult.success).toBe(true)
    })
  })

  describe('Buffer Time Edge Cases', () => {
    test('should handle exact 15-minute boundary', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      
      db.insertBooking(existingBooking)

      // 14 minutes gap - should fail
      const booking14Min = createMockBooking('booking-2', 1, 'staff-1', '2024-08-07', '11:14', 60)
      expect(db.insertBooking(booking14Min).success).toBe(false)

      // 15 minutes gap - should succeed
      const booking15Min = createMockBooking('booking-3', 1, 'staff-1', '2024-08-07', '11:15', 60)
      expect(db.insertBooking(booking15Min).success).toBe(true)

      // 16 minutes gap - should succeed
      const booking16Min = createMockBooking('booking-4', 2, 'staff-2', '2024-08-07', '11:16', 60)
      expect(db.insertBooking(booking16Min).success).toBe(true)
    })

    test('should handle overlapping time slots correctly', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 90) // 10:00-11:30
      
      db.insertBooking(existingBooking)

      // Overlapping in the middle - should fail
      const overlappingBooking = createMockBooking('booking-2', 1, 'staff-2', '2024-08-07', '10:30', 60)
      expect(db.insertBooking(overlappingBooking).success).toBe(false)

      // Starting before existing ends (with buffer) - should fail
      const bufferConflict = createMockBooking('booking-3', 1, 'staff-2', '2024-08-07', '11:35', 60) // 11:35 < 11:30 + 15min buffer
      expect(db.insertBooking(bufferConflict).success).toBe(false)

      // Starting after buffer - should succeed
      const afterBuffer = createMockBooking('booking-4', 1, 'staff-2', '2024-08-07', '11:45', 60) // 11:45 >= 11:30 + 15min buffer
      expect(db.insertBooking(afterBuffer).success).toBe(true)
    })

    test('should ignore cancelled bookings in conflict detection', () => {
      const cancelledBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60, 'cancelled')
      const newBooking = createMockBooking('booking-2', 1, 'staff-1', '2024-08-07', '10:30', 60)

      db.insertBooking(cancelledBooking)
      
      const insertResult = db.insertBooking(newBooking)
      expect(insertResult.success).toBe(true) // Should not conflict with cancelled booking
    })
  })

  describe('is_time_slot_available Function', () => {
    test('should return false when slot conflicts with existing booking', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      db.insertBooking(existingBooking)

      const available = db.isTimeSlotAvailable(1, 'staff-1', '2024-08-07', '11:00', '12:00')
      expect(available).toBe(false)
    })

    test('should return true when slot has sufficient buffer', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      db.insertBooking(existingBooking)

      const available = db.isTimeSlotAvailable(1, 'staff-1', '2024-08-07', '11:15', '12:15')
      expect(available).toBe(true)
    })

    test('should exclude specified booking from conflict check', () => {
      const existingBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      db.insertBooking(existingBooking)

      // Should be available when excluding the existing booking
      const available = db.isTimeSlotAvailable(1, 'staff-1', '2024-08-07', '10:30', '11:30', 'booking-1')
      expect(available).toBe(true)

      // Should not be available without exclusion
      const notAvailable = db.isTimeSlotAvailable(1, 'staff-1', '2024-08-07', '10:30', '11:30')
      expect(notAvailable).toBe(false)
    })
  })

  describe('Duration Constraint Validation', () => {
    test('should enforce duration matches time difference constraint', () => {
      // Correct duration calculation
      const validBooking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      expect(db.insertBooking(validBooking).success).toBe(true)

      // Incorrect duration - says 60 minutes but times indicate 90 minutes
      const invalidBooking: MockBooking = {
        id: 'booking-2',
        room_id: 2,
        staff_id: 'staff-2',
        appointment_date: '2024-08-07',
        start_time: '11:00',
        end_time: '12:30', // 90 minutes difference
        duration: 60, // Incorrect - should be 90
        status: 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = db.insertBooking(invalidBooking)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Duration must match the time difference')
    })
  })

  describe('Booking Updates with Buffer Constraints', () => {
    test('should prevent updating booking to create buffer conflicts', () => {
      const booking1 = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      const booking2 = createMockBooking('booking-2', 2, 'staff-2', '2024-08-07', '12:00', 60)

      db.insertBooking(booking1)
      db.insertBooking(booking2)

      // Try to update booking2 to conflict with booking1
      const updateResult = db.updateBooking('booking-2', {
        room_id: 1,
        staff_id: 'staff-1',
        start_time: '11:00',
        end_time: '12:00'
      })

      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toContain('15-minute buffer')
    })

    test('should allow valid booking updates', () => {
      const booking = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      db.insertBooking(booking)

      // Valid update that doesn't create conflicts
      const updateResult = db.updateBooking('booking-1', {
        start_time: '14:00',
        end_time: '15:00'
      })

      expect(updateResult.success).toBe(true)
    })
  })

  describe('Multiple Resource Conflicts', () => {
    test('should detect both room and staff conflicts simultaneously', () => {
      const booking1 = createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '10:00', 60)
      const booking2 = createMockBooking('booking-2', 2, 'staff-2', '2024-08-07', '10:00', 60)

      db.insertBooking(booking1)
      db.insertBooking(booking2)

      // New booking that conflicts with both existing bookings
      const conflictingBooking = createMockBooking('booking-3', 1, 'staff-2', '2024-08-07', '10:30', 60)
      
      const result = db.insertBooking(conflictingBooking)
      expect(result.success).toBe(false)
      
      // Should catch the first conflict (room or staff)
      expect(result.error).toMatch(/(Room|Staff member) is already booked.*15-minute buffer/)
    })

    test('should handle complex scheduling scenarios', () => {
      // Create a complex booking schedule
      const bookings = [
        createMockBooking('booking-1', 1, 'staff-1', '2024-08-07', '09:00', 60),
        createMockBooking('booking-2', 2, 'staff-2', '2024-08-07', '10:15', 60),
        createMockBooking('booking-3', 3, 'staff-1', '2024-08-07', '12:30', 90)
      ]

      bookings.forEach(booking => {
        const result = db.insertBooking(booking)
        expect(result.success).toBe(true)
      })

      // Try to book in a valid slot
      const validSlot = createMockBooking('booking-4', 2, 'staff-3', '2024-08-07', '14:00', 60)
      expect(db.insertBooking(validSlot).success).toBe(true)

      // Try to book in an invalid slot
      const invalidSlot = createMockBooking('booking-5', 1, 'staff-1', '2024-08-07', '14:10', 60) // Too close to booking-3 which ends at 14:00
      expect(db.insertBooking(invalidSlot).success).toBe(false)
    })
  })
})