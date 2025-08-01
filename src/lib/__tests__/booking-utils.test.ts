/**
 * Unit tests for booking utility functions
 * Tests all critical booking utility functions with comprehensive edge cases
 */

import {
  isSpecialStaffRequest,
  isCouplesService,
  getBookingDuration,
  getServiceRoomRestriction,
  formatBookingTime,
  getBookingStatusColor
} from '../booking-utils'

describe('Booking Utilities', () => {
  describe('isSpecialStaffRequest', () => {
    it('should return true for specific staff ID requests', () => {
      const booking = { staff_id: 'staff-123' }
      expect(isSpecialStaffRequest(booking)).toBe(true)
    })

    it('should return false for any-available staff requests', () => {
      const anyAvailableVariants = [
        { staff_id: 'any-available' },
        { staff_id: 'any' },
        { staff_id: null },
      ]

      anyAvailableVariants.forEach(booking => {
        expect(isSpecialStaffRequest(booking)).toBe(false)
      })
    })

    it('should handle empty and undefined staff_id', () => {
      const edgeCases = [
        { staff_id: '' },
        { staff_id: undefined },
        {},
        null,
        undefined
      ]

      edgeCases.forEach(booking => {
        expect(isSpecialStaffRequest(booking)).toBe(false)
      })
    })

    it('should return true for UUID-like staff IDs', () => {
      const booking = { staff_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
      expect(isSpecialStaffRequest(booking)).toBe(true)
    })

    it('should return true for numeric staff IDs', () => {
      const booking = { staff_id: '12345' }
      expect(isSpecialStaffRequest(booking)).toBe(true)
    })
  })

  describe('isCouplesService', () => {
    it('should identify couples services correctly', () => {
      const couplesServices = [
        'Couples Massage',
        'couple spa treatment',
        'Duo Relaxation Package',
        'Double Facial Experience',
        'Partner Wellness Session'
      ]

      couplesServices.forEach(serviceName => {
        expect(isCouplesService(serviceName)).toBe(true)
      })
    })

    it('should not identify single services as couples', () => {
      const singleServices = [
        'Basic Facial',
        'Swedish Massage',
        'Body Scrub',
        'Manicure',
        'Pedicure',
        'Hot Stone Therapy'
      ]

      singleServices.forEach(serviceName => {
        expect(isCouplesService(serviceName)).toBe(false)
      })
    })

    it('should handle case sensitivity correctly', () => {
      const caseSensitiveTests = [
        'COUPLES MASSAGE',
        'couples massage',
        'CoUpLeS mAsSaGe',
        'COUPLE spa',
        'DUO treatment'
      ]

      caseSensitiveTests.forEach(serviceName => {
        expect(isCouplesService(serviceName)).toBe(true)
      })
    })

    it('should handle edge cases and invalid inputs', () => {
      const edgeCases = [
        '',
        '   ',
        null as any,
        undefined as any,
        123 as any
      ]

      edgeCases.forEach(serviceName => {
        expect(() => isCouplesService(serviceName)).not.toThrow()
        expect(isCouplesService(serviceName)).toBe(false)
      })
    })

    it('should detect partial matches correctly', () => {
      expect(isCouplesService('Relaxing Couples Experience')).toBe(true)
      expect(isCouplesService('Duo Therapy Session for Partners')).toBe(true)
      expect(isCouplesService('Single Person Treatment')).toBe(false)
    })
  })

  describe('getBookingDuration', () => {
    it('should return correct durations for known services', () => {
      const serviceTests = [
        { service: 'Basic Facial', expectedDuration: 60 },
        { service: 'Deep Cleansing Facial', expectedDuration: 75 },
        { service: 'Hydrating Facial', expectedDuration: 60 },
        { service: 'Anti-Aging Facial', expectedDuration: 90 },
        { service: 'Swedish Massage', expectedDuration: 90 },
        { service: 'Deep Tissue Massage', expectedDuration: 90 },
        { service: 'Body Scrub Treatment', expectedDuration: 45 },
        { service: 'Couples Massage Session', expectedDuration: 90 }
      ]

      serviceTests.forEach(({ service, expectedDuration }) => {
        expect(getBookingDuration(service)).toBe(expectedDuration)
      })
    })

    it('should handle case insensitive matching', () => {
      expect(getBookingDuration('FACIAL TREATMENT')).toBe(60)
      expect(getBookingDuration('massage therapy')).toBe(90)
      expect(getBookingDuration('BODY SCRUB')).toBe(45)
    })

    it('should return default duration for unknown services', () => {
      const unknownServices = [
        'Unknown Service',
        'Made Up Treatment',
        'New Spa Service',
        ''
      ]

      unknownServices.forEach(service => {
        expect(getBookingDuration(service)).toBe(60) // Default duration
      })
    })

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        null as any,
        undefined as any,
        123 as any,
        {} as any,
        [] as any
      ]

      edgeCases.forEach(service => {
        expect(() => getBookingDuration(service)).not.toThrow()
        expect(getBookingDuration(service)).toBe(60) // Default duration
      })
    })

    it('should prioritize specific matches over generic ones', () => {
      // Should match "deep cleansing facial" (75 min) not just "facial" (60 min)
      expect(getBookingDuration('Deep Cleansing Facial Treatment')).toBe(75)
      expect(getBookingDuration('Anti-Aging Facial Package')).toBe(90)
    })
  })

  describe('getServiceRoomRestriction', () => {
    it('should identify body scrub room restrictions', () => {
      const bodyScrubServices = [
        'Dead Sea Salt Body Scrub',
        'Exfoliating Body Scrub',
        'body scrub treatment',
        'Salt Scrub Therapy'
      ]

      bodyScrubServices.forEach(service => {
        expect(getServiceRoomRestriction(service)).toBe('Room 3')
      })
    })

    it('should identify couples service room restrictions', () => {
      const couplesServices = [
        'Couples Massage',
        'Duo Facial Package',
        'Partner Relaxation',
        'Double Treatment Session'
      ]

      couplesServices.forEach(service => {
        expect(getServiceRoomRestriction(service)).toBe('Room 1 or 2')
      })
    })

    it('should return null for services without restrictions', () => {
      const regularServices = [
        'Basic Facial',
        'Swedish Massage',
        'Manicure',
        'Pedicure',
        'Eyebrow Waxing'
      ]

      regularServices.forEach(service => {
        expect(getServiceRoomRestriction(service)).toBeNull()
      })
    })

    it('should handle case sensitivity correctly', () => {
      expect(getServiceRoomRestriction('BODY SCRUB')).toBe('Room 3')
      expect(getServiceRoomRestriction('couples massage')).toBe('Room 1 or 2')
      expect(getServiceRoomRestriction('CoUpLeS tReAtMeNt')).toBe('Room 1 or 2')
    })

    it('should prioritize body scrub over couples for services that are both', () => {
      // A couples body scrub should still require Room 3 (has equipment)
      expect(getServiceRoomRestriction('Couples Body Scrub Experience')).toBe('Room 3')
    })

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        '',
        '   ',
        null as any,
        undefined as any,
        123 as any
      ]

      edgeCases.forEach(service => {
        expect(() => getServiceRoomRestriction(service)).not.toThrow()
        expect(getServiceRoomRestriction(service)).toBeNull()
      })
    })
  })

  describe('formatBookingTime', () => {
    it('should format 24-hour time to 12-hour format correctly', () => {
      const timeTests = [
        { input: '09:00', expected: '9:00 AM' },
        { input: '09:30', expected: '9:30 AM' },
        { input: '12:00', expected: '12:00 PM' },
        { input: '12:30', expected: '12:30 PM' },
        { input: '13:00', expected: '1:00 PM' },
        { input: '15:45', expected: '3:45 PM' },
        { input: '18:30', expected: '6:30 PM' },
        { input: '00:00', expected: '12:00 AM' },
        { input: '23:59', expected: '11:59 PM' }
      ]

      timeTests.forEach(({ input, expected }) => {
        expect(formatBookingTime(input)).toBe(expected)
      })
    })

    it('should handle edge times correctly', () => {
      expect(formatBookingTime('00:30')).toBe('12:30 AM') // Midnight hour
      expect(formatBookingTime('12:01')).toBe('12:01 PM') // Just past noon
      expect(formatBookingTime('11:59')).toBe('11:59 AM') // Just before noon
    })

    it('should handle invalid time formats gracefully', () => {
      const invalidTimes = [
        'invalid-time',
        '25:00',
        '12:75',
        '',
        'abc:def',
        '12',
        ':30'
      ]

      invalidTimes.forEach(time => {
        expect(formatBookingTime(time)).toBe(time) // Returns original string
      })
    })

    it('should handle edge cases without throwing', () => {
      const edgeCases = [
        null as any,
        undefined as any,
        123 as any,
        {} as any
      ]

      edgeCases.forEach(time => {
        expect(() => formatBookingTime(time)).not.toThrow()
        expect(formatBookingTime(time)).toBe(time)
      })
    })
  })

  describe('getBookingStatusColor', () => {
    it('should return correct colors for known statuses', () => {
      const statusTests = [
        { status: 'confirmed', expected: 'bg-green-100 text-green-800' },
        { status: 'pending', expected: 'bg-yellow-100 text-yellow-800' },
        { status: 'cancelled', expected: 'bg-red-100 text-red-800' },
        { status: 'completed', expected: 'bg-blue-100 text-blue-800' },
        { status: 'no_show', expected: 'bg-gray-100 text-gray-800' }
      ]

      statusTests.forEach(({ status, expected }) => {
        expect(getBookingStatusColor(status)).toBe(expected)
      })
    })

    it('should return default color for unknown statuses', () => {
      const unknownStatuses = [
        'unknown',
        'in_progress',
        'rescheduled',
        'draft',
        ''
      ]

      unknownStatuses.forEach(status => {
        expect(getBookingStatusColor(status)).toBe('bg-gray-100 text-gray-800')
      })
    })

    it('should handle case sensitivity', () => {
      // Should be case sensitive - unknown status should return default
      expect(getBookingStatusColor('CONFIRMED')).toBe('bg-gray-100 text-gray-800')
      expect(getBookingStatusColor('Pending')).toBe('bg-gray-100 text-gray-800')
    })

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        null as any,
        undefined as any,
        123 as any,
        {} as any
      ]

      edgeCases.forEach(status => {
        expect(() => getBookingStatusColor(status)).not.toThrow()
        expect(getBookingStatusColor(status)).toBe('bg-gray-100 text-gray-800')
      })
    })
  })

  // Integration tests combining multiple functions
  describe('Integration Tests', () => {
    it('should correctly identify and restrict couples body scrub services', () => {
      const service = 'Couples Dead Sea Body Scrub'
      
      expect(isCouplesService(service)).toBe(true)
      expect(getServiceRoomRestriction(service)).toBe('Room 3') // Body scrub takes precedence
      expect(getBookingDuration(service)).toBe(45) // Body scrub duration
    })

    it('should handle typical booking workflow', () => {
      const booking = {
        staff_id: 'staff-123',
        service: 'Couples Relaxation Massage',
        status: 'confirmed',
        time: '14:30'
      }

      expect(isSpecialStaffRequest(booking)).toBe(true)
      expect(isCouplesService(booking.service)).toBe(true)
      expect(getServiceRoomRestriction(booking.service)).toBe('Room 1 or 2')
      expect(getBookingDuration(booking.service)).toBe(90)
      expect(getBookingStatusColor(booking.status)).toBe('bg-green-100 text-green-800')
      expect(formatBookingTime(booking.time)).toBe('2:30 PM')
    })

    it('should handle edge case booking with minimal data', () => {
      const booking = {
        staff_id: 'any-available',
        service: '',
        status: 'unknown',
        time: 'invalid'
      }

      expect(isSpecialStaffRequest(booking)).toBe(false)
      expect(isCouplesService(booking.service)).toBe(false)
      expect(getServiceRoomRestriction(booking.service)).toBeNull()
      expect(getBookingDuration(booking.service)).toBe(60) // Default
      expect(getBookingStatusColor(booking.status)).toBe('bg-gray-100 text-gray-800')
      expect(formatBookingTime(booking.time)).toBe('invalid')
    })
  })

  // Performance and boundary tests
  describe('Performance and Boundary Tests', () => {
    it('should handle very long service names efficiently', () => {
      const longServiceName = 'A'.repeat(1000) + ' Couples Massage ' + 'B'.repeat(1000)
      
      const start = performance.now()
      const result = isCouplesService(longServiceName)
      const end = performance.now()
      
      expect(result).toBe(true)
      expect(end - start).toBeLessThan(10) // Should complete in less than 10ms
    })

    it('should handle special characters in service names', () => {
      const specialCharServices = [
        'Couples Massage & Facial Package',
        'Body Scrub (Premium)',
        'Facial Treatment - Deep Cleansing',
        'Massage + Hot Stones',
        'Relaxation @ Spa'
      ]

      specialCharServices.forEach(service => {
        expect(() => {
          isCouplesService(service)
          getBookingDuration(service)
          getServiceRoomRestriction(service)
        }).not.toThrow()
      })
    })

    it('should handle unicode and international characters', () => {
      const unicodeServices = [
        'Masaje de Parejas', // Spanish
        'Couple Massäge', // German umlaut
        '夫婦マッサージ', // Japanese
        'Массаж для пар' // Russian
      ]

      unicodeServices.forEach(service => {
        expect(() => {
          isCouplesService(service)
          getBookingDuration(service)
          getServiceRoomRestriction(service)
        }).not.toThrow()
      })
    })
  })
})