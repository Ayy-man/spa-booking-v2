/**
 * Comprehensive test suite for couples booking fixes
 * Tests all scenarios identified in the bug reports
 */

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import {
  resolveStaffForBooking,
  resolveStaffForCouplesBooking,
  calculateIndividualBookingTimes,
  getOptimalCouplesRoom,
  checkStaffTimeAvailability
} from '@/lib/booking-utils'
import { checkBookingConflicts } from '@/lib/booking-logic'
import { COUPLES_ROOM_CONFIG, STAFF_ASSIGNMENT_CONFIG } from '@/lib/business-config'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null })),
            neq: jest.fn(() => ({ data: [], error: null }))
          })),
          neq: jest.fn(() => ({ data: [], error: null })),
          gte: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({ data: [], error: null }))
            }))
          })),
          in: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => ({ data: null, error: null }))
  }
}))

describe('Couples Booking Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Staff Resolution', () => {
    it('should resolve "any" staff to actual staff member', async () => {
      // Mock staff data
      const mockStaff = [
        { id: 'selma', name: 'Selma Villaver', capabilities: ['facials'], work_days: [0,1,2,3,4,5,6], is_active: true },
        { id: 'robyn', name: 'Robyn Camacho', capabilities: ['facials', 'massages'], work_days: [0,3,4,5,6], is_active: true }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            neq: jest.fn(() => ({ data: mockStaff, error: null }))
          }))
        }))
      })

      const result = await resolveStaffForBooking(
        'any',
        'Basic Facial',
        '2025-08-15',
        '10:00',
        60
      )

      expect(result.isResolved).toBe(true)
      expect(result.originalId).toBe('any')
      expect(['selma', 'robyn']).toContain(result.id)
    })

    it('should validate specific staff can perform service', async () => {
      const mockStaff = {
        id: 'selma',
        name: 'Selma Villaver',
        capabilities: ['facials'],
        work_days: [0,1,2,3,4,5,6],
        is_active: true
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockStaff, error: null }))
            }))
          }))
        }))
      })

      const result = await resolveStaffForBooking(
        'selma',
        'Basic Facial',
        '2025-08-15',
        '10:00',
        60
      )

      expect(result.isResolved).toBe(true)
      expect(result.id).toBe('selma')
      expect(result.name).toBe('Selma Villaver')
    })

    it('should reject same staff for couples booking', async () => {
      const mockStaff = {
        id: 'selma',
        name: 'Selma Villaver',
        capabilities: ['facials'],
        work_days: [0,1,2,3,4,5,6],
        is_active: true
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockStaff, error: null }))
            }))
          }))
        }))
      })

      const result = await resolveStaffForCouplesBooking(
        'selma',
        'selma', // Same staff
        'Basic Facial',
        'Basic Facial',
        '2025-08-15',
        '10:00',
        60,
        60
      )

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Cannot book the same staff member')
    })

    it('should allow different staff for couples booking', async () => {
      const mockSelma = {
        id: 'selma',
        name: 'Selma Villaver',
        capabilities: ['facials'],
        work_days: [0,1,2,3,4,5,6],
        is_active: true
      }

      const mockRobyn = {
        id: 'robyn',
        name: 'Robyn Camacho',
        capabilities: ['facials', 'massages'],
        work_days: [0,3,4,5,6],
        is_active: true
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn((field, value) => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => {
                const staff = value === 'selma' ? mockSelma : mockRobyn
                return { data: staff, error: null }
              })
            })),
            neq: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))

      const result = await resolveStaffForCouplesBooking(
        'selma',
        'robyn',
        'Basic Facial',
        'Basic Facial',
        '2025-08-15',
        '10:00',
        60,
        60
      )

      expect(result.isValid).toBe(true)
      expect(result.primaryStaff.name).toBe('Selma Villaver')
      expect(result.secondaryStaff.name).toBe('Robyn Camacho')
    })
  })

  describe('Duration Calculation', () => {
    it('should calculate individual booking times correctly', () => {
      const result = calculateIndividualBookingTimes('10:00', 30, 60)

      expect(result.primary.startTime).toBe('10:00')
      expect(result.primary.endTime).toBe('10:30')
      expect(result.primary.duration).toBe(30)

      expect(result.secondary.startTime).toBe('10:00')
      expect(result.secondary.endTime).toBe('11:00')
      expect(result.secondary.duration).toBe(60)
    })

    it('should handle same duration services', () => {
      const result = calculateIndividualBookingTimes('14:30', 45, 45)

      expect(result.primary.endTime).toBe('15:15')
      expect(result.secondary.endTime).toBe('15:15')
      expect(result.primary.duration).toBe(45)
      expect(result.secondary.duration).toBe(45)
    })

    it('should handle different duration services correctly', () => {
      const result = calculateIndividualBookingTimes('09:00', 90, 30)

      expect(result.primary.endTime).toBe('10:30') // 90 minutes
      expect(result.secondary.endTime).toBe('09:30') // 30 minutes
      expect(result.primary.duration).toBe(90)
      expect(result.secondary.duration).toBe(30)
    })
  })

  describe('Room Assignment', () => {
    it('should prefer room 3 over room 2 for couples', async () => {
      const mockRooms = [
        { id: 2, name: 'Room 2', capacity: 2, is_active: true },
        { id: 3, name: 'Room 3', capacity: 2, is_active: true }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              in: jest.fn(() => ({
                order: jest.fn(() => ({ data: mockRooms, error: null }))
              }))
            }))
          })),
          eq: jest.fn(() => ({
            neq: jest.fn(() => ({ data: [], error: null })) // No existing bookings
          }))
        }))
      })

      const result = await getOptimalCouplesRoom('2025-08-15', '10:00', 60)

      expect(result.isValid).toBe(true)
      expect(result.roomId).toBe(3) // Should prefer room 3
      expect(result.reason).toContain('preferred couples room')
    })

    it('should fallback to room 2 if room 3 unavailable', async () => {
      const mockRooms = [
        { id: 2, name: 'Room 2', capacity: 2, is_active: true }
      ]

      const { supabase } = require('@/lib/supabase')
      let callCount = 0
      supabase.from.mockImplementation((table) => {
        if (table === 'rooms') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  in: jest.fn(() => ({
                    order: jest.fn(() => ({ data: mockRooms, error: null }))
                  }))
                })),
                eq: jest.fn(() => {
                  callCount++
                  if (callCount === 1) {
                    // Room 3 has conflicts
                    return ({ data: [{ id: 'conflict' }], error: null })
                  } else {
                    // Room 2 is available
                    return ({ data: [], error: null })
                  }
                })
              }))
            }))
          }
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              neq: jest.fn(() => ({ data: [], error: null }))
            }))
          }))
        }
      })

      const result = await getOptimalCouplesRoom('2025-08-15', '10:00', 60)

      expect(result.isValid).toBe(true)
      expect(result.roomId).toBe(2) // Should fallback to room 2
    })

    it('should reject if no couples rooms available', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              in: jest.fn(() => ({
                order: jest.fn(() => ({ data: [], error: null })) // No rooms found
              }))
            })),
            eq: jest.fn(() => ({ data: [{ id: 'conflict' }], error: null })) // All rooms have conflicts
          }))
        }))
      })

      const result = await getOptimalCouplesRoom('2025-08-15', '10:00', 60)

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('No couples rooms available')
    })
  })

  describe('Conflict Detection', () => {
    it('should not flag conflict for different staff members', () => {
      const newBooking = {
        staff_id: 'selma',
        room_id: '2',
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00'
      }

      const existingBookings = [{
        staff_id: 'robyn', // Different staff
        room_id: 2,
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00',
        status: 'confirmed'
      }]

      const conflicts = checkBookingConflicts(newBooking, existingBookings)
      
      // Should only have room conflict, not staff conflict
      const staffConflicts = conflicts.filter(c => c.type === 'staff')
      expect(staffConflicts).toHaveLength(0)
    })

    it('should flag conflict for same staff member', () => {
      const newBooking = {
        staff_id: 'selma',
        room_id: '1',
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00'
      }

      const existingBookings = [{
        staff_id: 'selma', // Same staff
        room_id: 2,
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00',
        status: 'confirmed'
      }]

      const conflicts = checkBookingConflicts(newBooking, existingBookings)
      
      const staffConflicts = conflicts.filter(c => c.type === 'staff')
      expect(staffConflicts).toHaveLength(1)
      expect(staffConflicts[0].message).toContain('already booked for this time slot')
    })

    it('should not flag conflict when "any" staff is involved', () => {
      const newBooking = {
        staff_id: STAFF_ASSIGNMENT_CONFIG.anyStaffId,
        room_id: '2',
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00'
      }

      const existingBookings = [{
        staff_id: 'selma',
        room_id: 3,
        appointment_date: '2025-08-15',
        start_time: '10:00',
        end_time: '11:00',
        status: 'confirmed'
      }]

      const conflicts = checkBookingConflicts(newBooking, existingBookings)
      
      const staffConflicts = conflicts.filter(c => c.type === 'staff')
      expect(staffConflicts).toHaveLength(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle couples booking with same service, different staff', async () => {
      const mockStaff = [
        { id: 'selma', name: 'Selma Villaver', capabilities: ['facials'], work_days: [0,1,2,3,4,5,6], is_active: true },
        { id: 'robyn', name: 'Robyn Camacho', capabilities: ['facials'], work_days: [0,3,4,5,6], is_active: true }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn((field, value) => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => {
                const staff = mockStaff.find(s => s.id === value)
                return { data: staff, error: null }
              })
            })),
            neq: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))

      const result = await resolveStaffForCouplesBooking(
        'selma',
        'robyn',
        'Basic Facial',
        'Basic Facial', // Same service
        '2025-08-15',
        '10:00',
        60,
        60 // Same duration
      )

      expect(result.isValid).toBe(true)
      expect(result.primaryStaff.id).toBe('selma')
      expect(result.secondaryStaff.id).toBe('robyn')
    })

    it('should handle couples booking with different services, different staff', async () => {
      const mockSelma = {
        id: 'selma',
        name: 'Selma Villaver',
        capabilities: ['facials'],
        work_days: [0,1,2,3,4,5,6],
        is_active: true
      }

      const mockRobyn = {
        id: 'robyn',
        name: 'Robyn Camacho',
        capabilities: ['facials', 'massages'],
        work_days: [0,3,4,5,6],
        is_active: true
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn((field, value) => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => {
                const staff = value === 'selma' ? mockSelma : mockRobyn
                return { data: staff, error: null }
              })
            })),
            neq: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))

      const result = await resolveStaffForCouplesBooking(
        'selma',
        'robyn',
        'Basic Facial',
        'Deep Tissue Massage', // Different service
        '2025-08-15',
        '10:00',
        60,
        90 // Different duration
      )

      expect(result.isValid).toBe(true)
      expect(result.primaryStaff.id).toBe('selma')
      expect(result.secondaryStaff.id).toBe('robyn')
    })

    it('should calculate correct individual times for different service durations', () => {
      const times = calculateIndividualBookingTimes('10:00', 30, 90)
      
      expect(times.primary.duration).toBe(30)
      expect(times.primary.endTime).toBe('10:30')
      
      expect(times.secondary.duration).toBe(90)
      expect(times.secondary.endTime).toBe('11:30')
      
      // Both start at same time for couples
      expect(times.primary.startTime).toBe('10:00')
      expect(times.secondary.startTime).toBe('10:00')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle "any" staff when no staff available', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            neq: jest.fn(() => ({ data: [], error: null })) // No staff available
          }))
        }))
      })

      const result = await resolveStaffForBooking(
        'any',
        'Basic Facial',
        '2025-08-15',
        '10:00',
        60
      )

      expect(result.isResolved).toBe(false)
      expect(result.error).toContain('No staff members available')
    })

    it('should handle staff capability mismatch', async () => {
      const mockStaff = {
        id: 'selma',
        name: 'Selma Villaver',
        capabilities: ['facials'], // Cannot perform massages
        work_days: [0,1,2,3,4,5,6],
        is_active: true
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockStaff, error: null }))
            }))
          }))
        }))
      })

      const result = await resolveStaffForBooking(
        'selma',
        'Deep Tissue Massage', // Service staff cannot perform
        '2025-08-15',
        '10:00',
        90
      )

      expect(result.isResolved).toBe(false)
      expect(result.error).toContain('cannot perform')
    })
  })

  describe('Configuration Validation', () => {
    it('should use correct couples room preferences', () => {
      expect(COUPLES_ROOM_CONFIG.preferredCouplesRoomIds).toEqual([3, 2])
      expect(COUPLES_ROOM_CONFIG.minimumCapacity).toBe(2)
    })

    it('should use correct staff assignment configuration', () => {
      expect(STAFF_ASSIGNMENT_CONFIG.anyStaffId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      expect(STAFF_ASSIGNMENT_CONFIG.anyStaffAlias).toBe('any')
      expect(STAFF_ASSIGNMENT_CONFIG.requireDifferentStaffForCouples).toBe(true)
    })
  })
})