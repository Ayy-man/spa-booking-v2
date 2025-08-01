/**
 * Unit tests for GHL Webhook Sender
 * Tests payload structure and fetch calls with comprehensive mocking
 */

import { ghlWebhookSender } from '../ghl-webhook-sender'

// Mock the business config
jest.mock('../business-config', () => ({
  BUSINESS_CONFIG: {
    name: 'Test Dermal Clinic',
    location: 'Test Location',
    address: 'Test Address, Test City 12345',
    phone: '+1-555-TEST',
    email: 'test@dermalclinic.com',
    website: 'https://testdermalclinic.com'
  },
  PAYMENT_CONFIG: {
    currency: 'USD',
    newCustomerDeposit: 25
  }
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock window object for browser-specific code
const mockWindow = {
  navigator: { userAgent: 'Test User Agent' },
  location: { href: 'https://test.com/booking' }
}
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

describe('GHL Webhook Sender', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Reset Date.now mock
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000) // 2022-01-01T00:00:00.000Z
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2022-01-01T00:00:00.000Z')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sendNewCustomerWebhook', () => {
    const mockCustomer = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      isNewCustomer: true
    }

    const mockBooking = {
      service: 'Basic Facial',
      serviceId: 'service-123',
      serviceCategory: 'facial',
      date: '2022-01-15',
      time: '10:00',
      duration: 60,
      price: 85
    }

    it('should send successful webhook with correct payload structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendNewCustomerWebhook(mockCustomer, mockBooking)

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407')
      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Dermal-Clinic-Booking-App/1.0'
      })

      const payload = JSON.parse(options.body)
      expect(payload).toMatchObject({
        event: 'new_customer',
        customer: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123',
          is_new_customer: true,
          source: 'spa_booking_website',
          created_at: '2022-01-01T00:00:00.000Z'
        },
        booking: {
          service: 'Basic Facial',
          service_id: 'service-123',
          service_category: 'facial',
          service_description: 'Basic Facial treatment',
          date: '2022-01-15',
          time: '10:00',
          duration: 60,
          price: 85,
          currency: 'USD',
          location: 'Test Dermal Clinic, Test Location',
          booking_notes: 'First-time customer'
        },
        preferences: {
          communication_preference: 'email',
          marketing_consent: true,
          special_requests: ''
        },
        system_data: {
          booking_id: 'temp_booking_1640995200000',
          session_id: 'session_1640995200000',
          user_agent: 'Test User Agent',
          ip_address: 'unknown',
          referrer: 'https://test.com/booking'
        }
      })
    })

    it('should handle webhook failure with error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Webhook failed'
      })

      const result = await ghlWebhookSender.sendNewCustomerWebhook(mockCustomer, mockBooking)

      expect(result).toEqual({
        success: false,
        error: 'Webhook failed'
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await ghlWebhookSender.sendNewCustomerWebhook(mockCustomer, mockBooking)

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      })
    })

    it('should handle customer without phone number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const customerWithoutPhone = { ...mockCustomer }
      delete customerWithoutPhone.phone

      const result = await ghlWebhookSender.sendNewCustomerWebhook(customerWithoutPhone, mockBooking)

      expect(result.success).toBe(true)
      
      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.customer.phone).toBe('')
    })

    it('should handle returning customer correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const returningCustomer = { ...mockCustomer, isNewCustomer: false }

      await ghlWebhookSender.sendNewCustomerWebhook(returningCustomer, mockBooking)

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.customer.is_new_customer).toBe(false)
      expect(payload.booking.booking_notes).toBe('Returning customer')
    })

    it('should work in server environment without window object', async () => {
      // Temporarily remove window object
      const originalWindow = global.window
      delete (global as any).window

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendNewCustomerWebhook(mockCustomer, mockBooking)

      expect(result.success).toBe(true)
      
      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.system_data.user_agent).toBe('server')
      expect(payload.system_data.referrer).toBe('direct')

      // Restore window object
      global.window = originalWindow
    })
  })

  describe('sendBookingConfirmationWebhook', () => {
    const mockCustomer = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1-555-0456',
      isNewCustomer: false
    }

    const mockBooking = {
      service: 'Couples Massage',
      serviceId: 'service-456',
      serviceCategory: 'massage',
      date: '2022-01-20',
      time: '14:00',
      duration: 90,
      price: 150,
      staff: 'Robyn Camacho',
      staffId: 'staff-456',
      room: 'Room 3',
      roomId: 'room-3'
    }

    it('should send booking confirmation with complete payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendBookingConfirmationWebhook(
        'booking-123',
        mockCustomer,
        mockBooking,
        'ghl-contact-789'
      )

      expect(result).toEqual({ success: true })

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload).toMatchObject({
        event: 'booking_confirmed',
        booking_id: 'booking-123',
        customer: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1-555-0456',
          ghl_contact_id: 'ghl-contact-789',
          is_new_customer: false,
          total_bookings: 2
        },
        appointment: {
          service: 'Couples Massage',
          service_id: 'service-456',
          service_category: 'massage',
          service_description: 'Couples Massage treatment',
          staff: 'Robyn Camacho',
          staff_id: 'staff-456',
          room: 'Room 3',
          room_id: 'room-3',
          date: '2022-01-20',
          time: '14:00',
          duration: 90,
          price: 150,
          currency: 'USD',
          status: 'confirmed',
          confirmation_code: 'CONF1640995200000'
        },
        location: {
          name: 'Test Dermal Clinic',
          address: 'Test Address, Test City 12345',
          phone: '+1-555-TEST'
        },
        payment: {
          method: 'online_payment',
          amount: 150,
          currency: 'USD',
          status: 'paid',
          transaction_id: 'txn_1640995200000'
        },
        system_data: {
          created_at: '2022-01-01T00:00:00.000Z',
          confirmed_at: '2022-01-01T00:00:00.000Z',
          booking_source: 'website',
          session_id: 'session_1640995200000'
        }
      })
    })

    it('should handle booking without staff/room assignment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const bookingWithoutStaffRoom = { ...mockBooking }
      delete bookingWithoutStaffRoom.staff
      delete bookingWithoutStaffRoom.staffId
      delete bookingWithoutStaffRoom.room
      delete bookingWithoutStaffRoom.roomId

      await ghlWebhookSender.sendBookingConfirmationWebhook(
        'booking-123',
        mockCustomer,
        bookingWithoutStaffRoom
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.appointment.staff).toBe('Any Available')
      expect(payload.appointment.staff_id).toBe('')
      expect(payload.appointment.room).toBe('TBD')
      expect(payload.appointment.room_id).toBe('')
      expect(payload.customer.ghl_contact_id).toBe('')
    })

    it('should handle new customer booking confirmation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const newCustomer = { ...mockCustomer, isNewCustomer: true }

      await ghlWebhookSender.sendBookingConfirmationWebhook(
        'booking-123',
        newCustomer,
        mockBooking
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.customer.is_new_customer).toBe(true)
      expect(payload.customer.total_bookings).toBe(1)
    })
  })

  describe('sendBookingUpdateWebhook', () => {
    const mockCustomer = {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1-555-0789'
    }

    const mockBooking = {
      service: 'Body Scrub',
      serviceId: 'service-789',
      serviceCategory: 'body_scrub',
      date: '2022-01-25',
      time: '16:00',
      duration: 45,
      price: 75
    }

    const mockChanges = {
      oldStatus: 'confirmed',
      newStatus: 'rescheduled',
      oldDate: '2022-01-25',
      newDate: '2022-01-26',
      oldTime: '16:00',
      newTime: '10:00',
      reason: 'Customer requested change',
      requestedBy: 'customer'
    }

    it('should send booking update with change details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendBookingUpdateWebhook(
        'booking-456',
        mockCustomer,
        mockBooking,
        mockChanges,
        'ghl-contact-456'
      )

      expect(result).toEqual({ success: true })

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload).toMatchObject({
        event: 'booking_updated',
        booking_id: 'booking-456',
        customer: {
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          phone: '+1-555-0789',
          ghl_contact_id: 'ghl-contact-456'
        },
        changes: {
          old_status: 'confirmed',
          new_status: 'rescheduled',
          old_date: '2022-01-25',
          new_date: '2022-01-26',
          old_time: '16:00',
          new_time: '10:00',
          reason: 'Customer requested change',
          requested_by: 'customer'
        },
        appointment: {
          service: 'Body Scrub',
          service_id: 'service-789',
          service_category: 'body_scrub',
          date: '2022-01-26', // Updated date
          time: '10:00', // Updated time
          status: 'rescheduled'
        },
        system_data: {
          updated_at: '2022-01-01T00:00:00.000Z',
          updated_by: 'customer',
          change_source: 'website',
          session_id: 'session_1640995200000'
        }
      })
    })

    it('should handle status-only changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const statusOnlyChanges = {
        oldStatus: 'confirmed',
        newStatus: 'cancelled'
      }

      await ghlWebhookSender.sendBookingUpdateWebhook(
        'booking-456',
        mockCustomer,
        mockBooking,
        statusOnlyChanges
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.changes).toMatchObject({
        old_status: 'confirmed',
        new_status: 'cancelled',
        old_date: '2022-01-25', // From booking
        new_date: '2022-01-25', // Same as booking
        old_time: '16:00', // From booking
        new_time: '16:00', // Same as booking
        reason: 'No reason provided',
        requested_by: 'system'
      })
    })

    it('should use default values for missing fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const minimalChanges = {
        oldStatus: 'pending',
        newStatus: 'confirmed'
      }

      await ghlWebhookSender.sendBookingUpdateWebhook(
        'booking-456',
        mockCustomer,
        mockBooking,
        minimalChanges
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.customer.ghl_contact_id).toBe('')
      expect(payload.changes.reason).toBe('No reason provided')
      expect(payload.changes.requested_by).toBe('system')
    })
  })

  describe('sendShowNoShowWebhook', () => {
    const mockCustomer = {
      name: 'Alice Brown',
      email: 'alice.brown@example.com',
      phone: '+1-555-0321',
      isNewCustomer: false
    }

    const mockBooking = {
      service: 'Anti-Aging Facial',
      serviceId: 'service-321',
      serviceCategory: 'facial',
      date: '2022-01-30',
      time: '11:00',
      duration: 75,
      price: 120,
      staff: 'Selma Villaver',
      staffId: 'staff-321',
      room: 'Room 1',
      roomId: 'room-1'
    }

    it('should send show webhook with positive attendance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-789',
        mockCustomer,
        mockBooking,
        'show',
        'Customer arrived on time',
        'ghl-contact-789'
      )

      expect(result).toEqual({ success: true })

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload).toMatchObject({
        event: 'appointment_attendance',
        booking_id: 'booking-789',
        appointment: {
          status: 'completed'
        },
        attendance: {
          status: 'show',
          marked_at: '2022-01-01T00:00:00.000Z',
          marked_by: 'admin_panel',
          admin_notes: 'Customer arrived on time',
          follow_up_required: false,
          follow_up_priority: 'normal'
        },
        business_impact: {
          revenue_impact: 120,
          time_slot_utilization: 'utilized',
          staff_availability: 'occupied',
          customer_satisfaction: 'positive'
        }
      })
    })

    it('should send no-show webhook with negative impact', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const result = await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-789',
        mockCustomer,
        mockBooking,
        'no_show',
        'Customer did not arrive or call'
      )

      expect(result).toEqual({ success: true })

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.appointment.status).toBe('no_show')
      expect(payload.attendance).toMatchObject({
        status: 'no_show',
        follow_up_required: true,
        follow_up_priority: 'high'
      })
      expect(payload.business_impact).toMatchObject({
        revenue_impact: 0,
        time_slot_utilization: 'wasted',
        staff_availability: 'available',
        customer_satisfaction: 'negative'
      })
    })

    it('should handle webhook without admin notes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-789',
        mockCustomer,
        mockBooking,
        'show'
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.attendance.admin_notes).toBe('')
      expect(payload.customer.ghl_contact_id).toBe('')
    })

    it('should handle new customer show/no-show correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const newCustomer = { ...mockCustomer, isNewCustomer: true }

      await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-789',
        newCustomer,
        mockBooking,
        'no_show'
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(payload.customer.is_new_customer).toBe(true)
      expect(payload.customer.total_bookings).toBe(1)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error')

      const result = await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@test.com' },
        { service: 'Test', serviceCategory: 'test', date: '2022-01-01', time: '10:00', duration: 60, price: 100 }
      )

      expect(result).toEqual({
        success: false,
        error: 'Unknown error'
      })
    })

    it('should handle fetch timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@test.com' },
        { service: 'Test', serviceCategory: 'test', date: '2022-01-01', time: '10:00', duration: 60, price: 100 }
      )

      expect(result).toEqual({
        success: false,
        error: 'Request timeout'
      })
    })

    it('should handle malformed response text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => { throw new Error('Failed to read response') }
      })

      const result = await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@test.com' },
        { service: 'Test', serviceCategory: 'test', date: '2022-01-01', time: '10:00', duration: 60, price: 100 }
      )

      expect(result).toEqual({
        success: false,
        error: 'Failed to read response'
      })
    })

    it('should handle very large payloads gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      const largeCustomer = {
        name: 'A'.repeat(1000),
        email: 'test@example.com',
        phone: '+1-555-0123'
      }

      const largeBooking = {
        service: 'B'.repeat(1000),
        serviceCategory: 'test',
        date: '2022-01-01',
        time: '10:00',
        duration: 60,
        price: 100
      }

      const result = await ghlWebhookSender.sendNewCustomerWebhook(largeCustomer, largeBooking)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should validate webhook URLs are correctly configured', () => {
      // Access private property through type assertion for testing
      const sender = ghlWebhookSender as any
      const urls = sender.webhookUrls

      expect(urls.newCustomer).toContain('webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407')
      expect(urls.bookingConfirmation).toContain('webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881')
      expect(urls.bookingUpdate).toContain('webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc')
      expect(urls.showNoShow).toContain('webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4')
    })
  })

  describe('Payload Validation', () => {
    it('should ensure all required fields are present in new customer payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Success'
      })

      await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@test.com' },
        { service: 'Test', serviceCategory: 'test', date: '2022-01-01', time: '10:00', duration: 60, price: 100 }
      )

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
      
      // Validate required top-level fields
      expect(payload).toHaveProperty('event')
      expect(payload).toHaveProperty('customer')
      expect(payload).toHaveProperty('booking')
      expect(payload).toHaveProperty('preferences')
      expect(payload).toHaveProperty('system_data')

      // Validate customer fields
      expect(payload.customer).toHaveProperty('name')
      expect(payload.customer).toHaveProperty('email')
      expect(payload.customer).toHaveProperty('phone')
      expect(payload.customer).toHaveProperty('is_new_customer')
      expect(payload.customer).toHaveProperty('source')
      expect(payload.customer).toHaveProperty('created_at')

      // Validate booking fields
      expect(payload.booking).toHaveProperty('service')
      expect(payload.booking).toHaveProperty('date')
      expect(payload.booking).toHaveProperty('time')
      expect(payload.booking).toHaveProperty('duration')
      expect(payload.booking).toHaveProperty('price')
      expect(payload.booking).toHaveProperty('currency')
    })

    it('should ensure consistent timestamp formatting across all webhooks', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'Success'
      })

      const testData = {
        customer: { name: 'Test', email: 'test@test.com' },
        booking: { service: 'Test', serviceCategory: 'test', date: '2022-01-01', time: '10:00', duration: 60, price: 100 }
      }

      // Test all webhook types
      await ghlWebhookSender.sendNewCustomerWebhook(testData.customer, testData.booking)
      await ghlWebhookSender.sendBookingConfirmationWebhook('booking-1', testData.customer, testData.booking)
      await ghlWebhookSender.sendBookingUpdateWebhook('booking-1', testData.customer, testData.booking, { oldStatus: 'pending', newStatus: 'confirmed' })
      await ghlWebhookSender.sendShowNoShowWebhook('booking-1', testData.customer, testData.booking, 'show')

      // Check that all calls use consistent timestamp format
      const calls = mockFetch.mock.calls
      calls.forEach(([, options]) => {
        const payload = JSON.parse(options.body)
        
        // Find timestamp fields and validate ISO format
        const timestampFields = JSON.stringify(payload).match(/"[^"]*":\s*"[^"]*T[^"]*Z"/g) || []
        timestampFields.forEach(field => {
          const timestamp = field.split(':')[1].replace(/"/g, '').trim()
          expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      })
    })
  })
})