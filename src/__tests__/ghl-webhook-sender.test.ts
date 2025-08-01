import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Mock fetch
global.fetch = jest.fn()

describe('GHLWebhookSender', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('sendNewCustomerWebhook', () => {
    it('should send correct payload for new customer webhook', async () => {
      const mockResponse = { ok: true, text: jest.fn().mockResolvedValue('Success') }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const customerData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        isNewCustomer: true
      }

      const bookingData = {
        service: 'Deep Cleansing Facial',
        serviceCategory: 'facial',
        date: '2024-01-15',
        time: '14:00',
        duration: 60,
        price: 150
      }

      const result = await ghlWebhookSender.sendNewCustomerWebhook(customerData, bookingData)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('new_customer')
        })
      )

      // Verify payload structure
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.event).toBe('new_customer')
      expect(payload.customer.name).toBe('John Doe')
      expect(payload.customer.email).toBe('john@example.com')
      expect(payload.booking.service).toBe('Deep Cleansing Facial')
      expect(payload.booking.price).toBe(150)
    })

    it('should handle webhook failure gracefully', async () => {
      const mockResponse = { 
        ok: false, 
        text: jest.fn().mockResolvedValue('Webhook failed') 
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@example.com', isNewCustomer: true },
        { service: 'Test Service', serviceCategory: 'test', date: '2024-01-15', time: '14:00', duration: 60, price: 100 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook failed')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await ghlWebhookSender.sendNewCustomerWebhook(
        { name: 'Test', email: 'test@example.com', isNewCustomer: true },
        { service: 'Test Service', serviceCategory: 'test', date: '2024-01-15', time: '14:00', duration: 60, price: 100 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('sendBookingConfirmationWebhook', () => {
    it('should send correct payload for booking confirmation', async () => {
      const mockResponse = { ok: true, text: jest.fn().mockResolvedValue('Success') }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await ghlWebhookSender.sendBookingConfirmationWebhook(
        'booking-123',
        { name: 'Jane Doe', email: 'jane@example.com', phone: '+1-555-0124' },
        { 
          service: 'Relaxation Massage', 
          serviceCategory: 'massage',
          date: '2024-01-16',
          time: '15:00',
          duration: 90,
          price: 200,
          staff: 'Sarah Thompson',
          room: 'Room 2'
        }
      )

      expect(result.success).toBe(true)
      
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.event).toBe('booking_confirmed')
      expect(payload.booking_id).toBe('booking-123')
      expect(payload.customer.name).toBe('Jane Doe')
      expect(payload.appointment.service).toBe('Relaxation Massage')
      expect(payload.appointment.staff).toBe('Sarah Thompson')
      expect(payload.appointment.room).toBe('Room 2')
    })
  })

  describe('sendShowNoShowWebhook', () => {
    it('should send correct payload for show attendance', async () => {
      const mockResponse = { ok: true, text: jest.fn().mockResolvedValue('Success') }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-456',
        { name: 'Bob Smith', email: 'bob@example.com', phone: '+1-555-0125' },
        {
          service: 'Body Scrub',
          serviceCategory: 'body_treatment',
          date: '2024-01-17',
          time: '11:00',
          duration: 45,
          price: 120,
          staff: 'Tanisha Johnson',
          room: 'Room 3'
        },
        'show',
        'Customer arrived on time'
      )

      expect(result.success).toBe(true)
      
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.event).toBe('appointment_attendance')
      expect(payload.booking_id).toBe('booking-456')
      expect(payload.attendance.status).toBe('show')
      expect(payload.attendance.admin_notes).toBe('Customer arrived on time')
      expect(payload.appointment.status).toBe('completed')
      expect(payload.business_impact.revenue_impact).toBe(120)
    })

    it('should send correct payload for no-show attendance', async () => {
      const mockResponse = { ok: true, text: jest.fn().mockResolvedValue('Success') }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await ghlWebhookSender.sendShowNoShowWebhook(
        'booking-789',
        { name: 'Alice Johnson', email: 'alice@example.com' },
        {
          service: 'Anti-Aging Facial',
          serviceCategory: 'facial',
          date: '2024-01-18',
          time: '10:00',
          duration: 90,
          price: 250
        },
        'no_show',
        'Customer did not arrive'
      )

      expect(result.success).toBe(true)
      
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.attendance.status).toBe('no_show')
      expect(payload.appointment.status).toBe('no_show')
      expect(payload.business_impact.revenue_impact).toBe(0)
      expect(payload.attendance.follow_up_required).toBe(true)
    })
  })
})