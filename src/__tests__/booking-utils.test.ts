import {
  isSpecialStaffRequest,
  isCouplesService,
  getBookingDuration,
  getServiceRoomRestriction,
  formatBookingTime,
  getBookingStatusColor
} from '@/lib/booking-utils'

describe('booking-utils', () => {
  describe('isSpecialStaffRequest', () => {
    it('should return true for specific staff requests', () => {
      const booking = { staff_id: 'staff-123' }
      expect(isSpecialStaffRequest(booking)).toBe(true)
    })

    it('should return false for any-available staff requests', () => {
      const booking = { staff_id: 'any-available' }
      expect(isSpecialStaffRequest(booking)).toBe(false)
    })

    it('should return false for null staff_id', () => {
      const booking = { staff_id: null }
      expect(isSpecialStaffRequest(booking)).toBe(false)
    })

    it('should return false for "any" staff_id', () => {
      const booking = { staff_id: 'any' }
      expect(isSpecialStaffRequest(booking)).toBe(false)
    })
  })

  describe('isCouplesService', () => {
    it('should return true for services with "couples" keyword', () => {
      expect(isCouplesService('Couples Massage')).toBe(true)
      expect(isCouplesService('couples facial')).toBe(true)
    })

    it('should return true for services with "couple" keyword', () => {
      expect(isCouplesService('Couple Relaxation')).toBe(true)
    })

    it('should return true for services with "duo" keyword', () => {
      expect(isCouplesService('Duo Treatment')).toBe(true)
    })

    it('should return false for regular services', () => {
      expect(isCouplesService('Deep Cleansing Facial')).toBe(false)
      expect(isCouplesService('Relaxation Massage')).toBe(false)
    })
  })

  describe('getBookingDuration', () => {
    it('should return 60 minutes for facial services', () => {
      expect(getBookingDuration('Deep Cleansing Facial')).toBe(60)
      expect(getBookingDuration('Hydrating Facial')).toBe(75)
    })

    it('should return 90 minutes for massage services', () => {
      expect(getBookingDuration('Relaxation Massage')).toBe(90)
      expect(getBookingDuration('couples massage')).toBe(90)
    })

    it('should return 45 minutes for body scrub services', () => {
      expect(getBookingDuration('Body Scrub Treatment')).toBe(45)
    })

    it('should return 60 minutes for unknown services', () => {
      expect(getBookingDuration('Unknown Service')).toBe(60)
    })
  })

  describe('getServiceRoomRestriction', () => {
    it('should return "Room 3" for body scrub services', () => {
      expect(getServiceRoomRestriction('Body Scrub Treatment')).toBe('Room 3')
      expect(getServiceRoomRestriction('body scrub')).toBe('Room 3')
    })

    it('should return "Room 1 or 2" for couples services', () => {
      expect(getServiceRoomRestriction('Couples Massage')).toBe('Room 1 or 2')
      expect(getServiceRoomRestriction('Duo Treatment')).toBe('Room 1 or 2')
    })

    it('should return null for regular services', () => {
      expect(getServiceRoomRestriction('Deep Cleansing Facial')).toBe(null)
      expect(getServiceRoomRestriction('Regular Massage')).toBe(null)
    })
  })

  describe('formatBookingTime', () => {
    it('should format 24-hour time to 12-hour format', () => {
      expect(formatBookingTime('14:30')).toBe('2:30 PM')
      expect(formatBookingTime('09:00')).toBe('9:00 AM')
      expect(formatBookingTime('12:00')).toBe('12:00 PM')
      expect(formatBookingTime('00:00')).toBe('12:00 AM')
    })

    it('should handle invalid time format gracefully', () => {
      expect(formatBookingTime('invalid')).toBe('invalid')
    })
  })

  describe('getBookingStatusColor', () => {
    it('should return correct colors for booking statuses', () => {
      expect(getBookingStatusColor('confirmed')).toBe('bg-green-100 text-green-800')
      expect(getBookingStatusColor('pending')).toBe('bg-yellow-100 text-yellow-800')
      expect(getBookingStatusColor('cancelled')).toBe('bg-red-100 text-red-800')
      expect(getBookingStatusColor('completed')).toBe('bg-blue-100 text-blue-800')
      expect(getBookingStatusColor('no_show')).toBe('bg-gray-100 text-gray-800')
    })

    it('should return default color for unknown status', () => {
      expect(getBookingStatusColor('unknown')).toBe('bg-gray-100 text-gray-800')
    })
  })
})