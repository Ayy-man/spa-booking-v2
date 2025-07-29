/**
 * Comprehensive tests for BookingValidator component
 * Tests real-world booking validation scenarios and business rules
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import BookingValidator from '../BookingValidator'
import { Service, Staff, Room } from '@/types/booking'

// Mock the booking logic functions
jest.mock('@/lib/booking-logic', () => ({
  validateBookingRequest: jest.fn(),
  getOptimalRoom: jest.fn(),
  validateStaffCapability: jest.fn(),
  getStaffDayAvailability: jest.fn(),
  formatErrorMessage: jest.fn((message) => message),
}))

const mockBookingLogic = require('@/lib/booking-logic')

describe('BookingValidator Component', () => {
  // Mock data
  const mockService: Service = {
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
  }

  const mockStaff: Staff = {
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
  }

  const mockRoom: Room = {
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
  }

  const mockDate = new Date('2024-08-05') // Monday
  const mockTime = '10:00'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    test('should show placeholder when booking details incomplete', () => {
      render(
        <BookingValidator
          service={null}
          staff={null}
          room={null}
          date={null}
          time={null}
        />
      )

      expect(screen.getByText(/complete your booking selection/i)).toBeInTheDocument()
    })

    test('should render validation results when all data provided', () => {
      // Setup mocks for successful validation
      mockBookingLogic.validateBookingRequest.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        conflicts: []
      })

      mockBookingLogic.getOptimalRoom.mockReturnValue({
        room: mockRoom,
        reason: 'Optimal room assignment',
        errors: []
      })

      mockBookingLogic.validateStaffCapability.mockReturnValue({
        canPerform: true,
        reasons: []
      })

      mockBookingLogic.getStaffDayAvailability.mockReturnValue({
        isAvailable: true,
        reasons: [],
        dayName: 'Monday'
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/booking validation passed/i)).toBeInTheDocument()
      expect(screen.getByText(/business rules for basic facial/i)).toBeInTheDocument()
      expect(screen.getByText(/staff constraints for selma villaver/i)).toBeInTheDocument()
    })
  })

  describe('Body Scrub Service Validation', () => {
    test('should enforce Room 3 requirement for body scrub services', () => {
      const bodyScrubService: Service = {
        ...mockService,
        name: 'Dead Sea Salt Body Scrub',
        category: 'body_scrub',
        requires_body_scrub_room: true
      }

      mockBookingLogic.validateBookingRequest.mockReturnValue({
        isValid: false,
        errors: ['Room 3 is required for body scrub services'],
        warnings: [],
        conflicts: []
      })

      mockBookingLogic.getOptimalRoom.mockReturnValue({
        room: null,
        reason: 'Room 3 required but unavailable',
        errors: ['Room 3 is required for body scrub services but is currently unavailable']
      })

      render(
        <BookingValidator
          service={bodyScrubService}
          staff={mockStaff}
          room={mockRoom} // Room 1, not Room 3
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/booking validation failed/i)).toBeInTheDocument()
      expect(screen.getByText(/room 3 is required for body scrub services/i)).toBeInTheDocument()
      expect(screen.getByText(/body scrub services can only be performed in room 3/i)).toBeInTheDocument()
    })
  })

  describe('Couples Service Validation', () => {
    test('should show couples room requirements', () => {
      const couplesService: Service = {
        ...mockService,
        name: 'Couples Massage Package',
        requires_couples_room: true,
        is_package: true
      }

      render(
        <BookingValidator
          service={couplesService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/couples services require room 2 or room 3/i)).toBeInTheDocument()
      expect(screen.getByText(/room 3 is preferred for couples services/i)).toBeInTheDocument()
    })
  })

  describe('Staff Capability Validation', () => {
    test('should show staff capability errors', () => {
      const bodyScrubService: Service = {
        ...mockService,
        category: 'body_scrub'
      }

      mockBookingLogic.validateStaffCapability.mockReturnValue({
        canPerform: false,
        reasons: ['Selma Villaver is not qualified to perform body_scrub services']
      })

      render(
        <BookingValidator
          service={bodyScrubService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/not qualified/i)).toBeInTheDocument()
      expect(screen.getByText(/selma specializes in facial treatments only/i)).toBeInTheDocument()
    })

    test('should show staff schedule constraints', () => {
      const leonelStaff: Staff = {
        ...mockStaff,
        name: 'Leonel Sidon',
        can_perform_services: ['massage', 'body_treatment']
      }

      render(
        <BookingValidator
          service={mockService}
          staff={leonelStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/leonel works sundays only/i)).toBeInTheDocument()
    })
  })

  describe('Staff Availability Validation', () => {
    test('should show staff unavailability on off days', () => {
      const tuesday = new Date('2024-08-06') // Tuesday

      mockBookingLogic.getStaffDayAvailability.mockReturnValue({
        isAvailable: false,
        reasons: ['Selma Villaver is off on Tuesdays and Thursdays'],
        dayName: 'Tuesday'
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={tuesday}
          time={mockTime}
        />
      )

      expect(screen.getByText(/unavailable/i)).toBeInTheDocument()
      expect(screen.getByText(/selma villaver is off on tuesdays and thursdays/i)).toBeInTheDocument()
    })
  })

  describe('Room Assignment Analysis', () => {
    test('should show optimal room assignment', () => {
      mockBookingLogic.getOptimalRoom.mockReturnValue({
        room: mockRoom,
        reason: "Selma Villaver's default room (Room 1)",
        errors: []
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/optimal/i)).toBeInTheDocument()
      expect(screen.getByText(/selma villaver's default room/i)).toBeInTheDocument()
    })

    test('should show suboptimal room assignment', () => {
      const room2: Room = {
        ...mockRoom,
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Room 2'
      }

      mockBookingLogic.getOptimalRoom.mockReturnValue({
        room: mockRoom, // Still recommends Room 1
        reason: "Selma Villaver's default room (Room 1)",
        errors: []
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={room2} // User selected Room 2
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/suboptimal/i)).toBeInTheDocument()
    })
  })

  describe('Booking Summary', () => {
    test('should display complete booking summary', () => {
      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/booking summary/i)).toBeInTheDocument()
      expect(screen.getByText(/basic facial \(30 minutes\)/i)).toBeInTheDocument()
      expect(screen.getByText(/selma villaver/i)).toBeInTheDocument()
      expect(screen.getByText(/room 1/i)).toBeInTheDocument()
      expect(screen.getByText(/monday, august 5, 2024/i)).toBeInTheDocument()
      expect(screen.getByText(/10:00/i)).toBeInTheDocument()
      expect(screen.getByText(/\$65/i)).toBeInTheDocument()
    })
  })

  describe('Validation Callback', () => {
    test('should call onValidationChange when validation updates', () => {
      const mockCallback = jest.fn()

      mockBookingLogic.validateBookingRequest.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Some warning'],
        conflicts: []
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
          onValidationChange={mockCallback}
        />
      )

      expect(mockCallback).toHaveBeenCalledWith(true, [], ['Some warning'])
    })
  })

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', () => {
      mockBookingLogic.validateBookingRequest.mockReturnValue({
        isValid: false,
        errors: ['Multiple booking errors occurred'],
        warnings: [],
        conflicts: []
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/booking validation failed/i)).toBeInTheDocument()
      expect(screen.getByText(/multiple booking errors occurred/i)).toBeInTheDocument()
    })

    test('should handle warnings appropriately', () => {
      mockBookingLogic.validateBookingRequest.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Limited staff availability on this day'],
        conflicts: []
      })

      render(
        <BookingValidator
          service={mockService}
          staff={mockStaff}
          room={mockRoom}
          date={mockDate}
          time={mockTime}
        />
      )

      expect(screen.getByText(/important notes/i)).toBeInTheDocument()
      expect(screen.getByText(/limited staff availability on this day/i)).toBeInTheDocument()
    })
  })
})