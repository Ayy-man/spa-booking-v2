/**
 * Buffer System Implementation Tests
 * 
 * Tests the 15-minute buffer system that prevents booking conflicts
 * by ensuring adequate time for room preparation and cleanup.
 */

import { checkBookingConflicts } from '@/lib/booking-logic'
import { addMinutes, parseISO, format } from 'date-fns'

// Mock booking data structure
interface MockBooking {
  id: string
  staff_id: string
  room_id: number
  appointment_date: string
  start_time: string
  end_time: string
  buffer_start?: string
  buffer_end?: string
  status: string
}

describe('Buffer System Implementation', () => {
  const testDate = '2025-01-15'
  
  // Helper function to create mock bookings with buffer times
  const createBookingWithBuffer = (
    startTime: string, 
    duration: number, 
    staffId: string = 'staff-1',
    roomId: number = 1,
    overrides: Partial<MockBooking> = {}
  ): MockBooking => {
    const start = parseISO(`${testDate}T${startTime}:00`)
    const end = addMinutes(start, duration)
    const bufferStart = addMinutes(start, -15)
    const bufferEnd = addMinutes(end, 15)
    
    // Ensure buffer times stay within business hours (9 AM - 8 PM)
    const businessStart = parseISO(`${testDate}T09:00:00`)
    const businessEnd = parseISO(`${testDate}T20:00:00`)
    
    const finalBufferStart = bufferStart < businessStart ? businessStart : bufferStart
    const finalBufferEnd = bufferEnd > businessEnd ? businessEnd : bufferEnd
    
    return {
      id: `booking-${Date.now()}-${Math.random()}`,
      staff_id: staffId,
      room_id: roomId,
      appointment_date: testDate,
      start_time: startTime,
      end_time: format(end, 'HH:mm'),
      buffer_start: format(finalBufferStart, 'HH:mm'),
      buffer_end: format(finalBufferEnd, 'HH:mm'),
      status: 'confirmed',
      ...overrides
    }
  }

  describe('Buffer Time Calculations', () => {
    it('should calculate correct buffer times for mid-day appointments', () => {
      const booking = createBookingWithBuffer('10:00', 60)
      
      expect(booking.buffer_start).toBe('09:45')
      expect(booking.buffer_end).toBe('11:15')
    })

    it('should clamp buffer start to business hours (9 AM)', () => {
      const booking = createBookingWithBuffer('09:00', 30)
      
      expect(booking.buffer_start).toBe('09:00') // Clamped to business start
      expect(booking.buffer_end).toBe('09:45')
    })

    it('should clamp buffer end to business hours (8 PM)', () => {
      const booking = createBookingWithBuffer('19:30', 30)
      
      expect(booking.buffer_start).toBe('19:15')
      expect(booking.buffer_end).toBe('20:00') // Clamped to business end
    })
  })

  describe('Buffer Conflict Detection', () => {
    it('should detect staff conflict when bookings overlap with buffer zones', () => {
      const existingBooking = createBookingWithBuffer('10:00', 60, 'staff-1')
      const newBooking = {
        staff_id: 'staff-1',
        room_id: 2,
        appointment_date: testDate,
        start_time: '11:00', // Starts exactly when existing booking ends
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking as any])
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('staff')
      expect(conflicts[0].message).toContain('including buffer zones')
    })

    it('should detect room conflict when bookings overlap with buffer zones', () => {
      const existingBooking = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      const newBooking = {
        staff_id: 'staff-2',
        room_id: 1,
        appointment_date: testDate,
        start_time: '11:00', // Same room, different staff
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking as any])
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('room')
      expect(conflicts[0].message).toContain('including buffer zones')
    })

    it('should allow bookings with sufficient buffer spacing', () => {
      const existingBooking = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      const newBooking = {
        staff_id: 'staff-1',
        room_id: 1,
        appointment_date: testDate,
        start_time: '11:30', // 15 minutes after buffer end (11:15)
        end_time: '12:30'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking as any])
      
      expect(conflicts).toHaveLength(0)
    })

    it('should allow different staff in different rooms without conflicts', () => {
      const existingBooking = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      const newBooking = {
        staff_id: 'staff-2',
        room_id: 2,
        appointment_date: testDate,
        start_time: '10:30', // Overlapping time but different staff and room
        end_time: '11:30'
      }

      const conflicts = checkBookingConflicts(newBooking, [existingBooking as any])
      
      expect(conflicts).toHaveLength(0)
    })

    it('should ignore cancelled bookings in conflict detection', () => {
      const cancelledBooking = createBookingWithBuffer('10:00', 60, 'staff-1', 1, {
        status: 'cancelled'
      })
      const newBooking = {
        staff_id: 'staff-1',
        room_id: 1,
        appointment_date: testDate,
        start_time: '10:30', // Would conflict if not cancelled
        end_time: '11:30'
      }

      const conflicts = checkBookingConflicts(newBooking, [cancelledBooking as any])
      
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('Buffer System Integration', () => {
    it('should prevent back-to-back bookings for the same staff', () => {
      const booking1 = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      const booking2 = {
        staff_id: 'staff-1',
        room_id: 2, // Different room
        appointment_date: testDate,
        start_time: '11:00', // Immediately after first booking
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(booking2, [booking1 as any])
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('staff')
    })

    it('should prevent back-to-back bookings for the same room', () => {
      const booking1 = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      const booking2 = {
        staff_id: 'staff-2', // Different staff
        room_id: 1,
        appointment_date: testDate,
        start_time: '11:00', // Immediately after first booking
        end_time: '12:00'
      }

      const conflicts = checkBookingConflicts(booking2, [booking1 as any])
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('room')
    })

    it('should allow bookings with 15-minute gap (respecting buffer)', () => {
      // First booking: 10:00-11:00 (buffer: 09:45-11:15)
      const booking1 = createBookingWithBuffer('10:00', 60, 'staff-1', 1)
      
      // Second booking: 11:15-12:15 (buffer: 11:00-12:30)
      // This should be allowed as it starts exactly when first booking's buffer ends
      const booking2 = {
        staff_id: 'staff-1',
        room_id: 1,
        appointment_date: testDate,
        start_time: '11:15',
        end_time: '12:15',
        buffer_start: '11:00',
        buffer_end: '12:30'
      }

      const conflicts = checkBookingConflicts(booking2, [booking1 as any])
      
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple existing bookings', () => {
      const booking1 = createBookingWithBuffer('09:00', 60, 'staff-1', 1)
      const booking2 = createBookingWithBuffer('11:00', 60, 'staff-1', 2)
      const booking3 = createBookingWithBuffer('14:00', 60, 'staff-2', 1)
      
      const newBooking = {
        staff_id: 'staff-1',
        room_id: 3,
        appointment_date: testDate,
        start_time: '12:30', // Would conflict with booking2's buffer
        end_time: '13:30'
      }

      const conflicts = checkBookingConflicts(newBooking, [booking1, booking2, booking3] as any)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('staff')
    })

    it('should handle bookings at business hour boundaries', () => {
      // Early morning booking
      const earlyBooking = createBookingWithBuffer('09:00', 30, 'staff-1', 1)
      expect(earlyBooking.buffer_start).toBe('09:00') // Clamped to business start
      
      // Late evening booking
      const lateBooking = createBookingWithBuffer('19:30', 30, 'staff-2', 2)
      expect(lateBooking.buffer_end).toBe('20:00') // Clamped to business end
    })
  })
})