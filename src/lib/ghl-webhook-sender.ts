// GoHighLevel Webhook Sender Utility
// Simple utility to send data to GHL webhooks

import { BUSINESS_CONFIG, PAYMENT_CONFIG } from './business-config'

interface CustomerData {
  name: string
  email: string
  phone?: string
  isNewCustomer?: boolean
}

interface BookingData {
  service: string
  serviceId?: string
  serviceCategory: string
  date: string
  time: string
  duration: number
  price: number
  staff?: string
  staffId?: string
  room?: string
  roomId?: number
}

interface WebhookResponse {
  success: boolean
  error?: string
}

class GHLWebhookSender {
  private readonly webhookUrls = {
    newCustomer: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/57269a47-d804-4747-86d4-5a3f81013407',
    bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
    bookingUpdate: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/0946bcf5-c598-4817-a103-2b207e4d6bfc',
    showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4'
  }

  async sendNewCustomerWebhook(customer: CustomerData, booking: BookingData): Promise<WebhookResponse> {
    console.log('Sending new customer webhook to GHL:', { customer: customer.name, service: booking.service })
    try {
      const payload = {
        event: 'new_customer',
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          is_new_customer: customer.isNewCustomer || true,
          source: 'spa_booking_website',
          created_at: new Date().toISOString()
        },
        booking: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          date: booking.date,
          time: booking.time,
          duration: booking.duration,
          price: booking.price,
          currency: PAYMENT_CONFIG.currency,
          location: `${BUSINESS_CONFIG.name}, ${BUSINESS_CONFIG.location}`,
          booking_notes: customer.isNewCustomer ? 'First-time customer' : 'Returning customer'
        },
        preferences: {
          communication_preference: 'email',
          marketing_consent: true,
          special_requests: ''
        },
        system_data: {
          booking_id: `temp_booking_${Date.now()}`,
          session_id: `session_${Date.now()}`,
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          ip_address: 'unknown',
          referrer: typeof window !== 'undefined' ? window.location.href : 'direct'
        }
      }

      const response = await fetch(this.webhookUrls.newCustomer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        cache: 'no-cache'
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        return { success: false, error: errorText }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendBookingConfirmationWebhook(
    bookingId: string,
    customer: CustomerData,
    booking: BookingData,
    ghlContactId?: string
  ): Promise<WebhookResponse> {
    console.log('Sending booking confirmation webhook to GHL:', { bookingId, customer: customer.name })
    try {
      const payload = {
        event: 'booking_confirmed',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || '',
          is_new_customer: customer.isNewCustomer || false,
          total_bookings: customer.isNewCustomer ? 1 : 2 // This would be dynamic in real implementation
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || 0,
          date: booking.date,
          time: booking.time,
          duration: booking.duration,
          price: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: 'confirmed',
          confirmation_code: `CONF${Date.now()}`
        },
        location: {
          name: BUSINESS_CONFIG.name,
          address: BUSINESS_CONFIG.address,
          phone: BUSINESS_CONFIG.phone
        },
        payment: {
          method: 'online_payment',
          amount: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: 'paid',
          transaction_id: `txn_${Date.now()}`
        },
        system_data: {
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          booking_source: 'website',
          session_id: `session_${Date.now()}`
        }
      }

      const response = await fetch(this.webhookUrls.bookingConfirmation, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        cache: 'no-cache'
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        return { success: false, error: errorText }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendBookingUpdateWebhook(
    bookingId: string,
    customer: CustomerData,
    booking: BookingData,
    changes: {
      oldStatus: string
      newStatus: string
      oldDate?: string
      newDate?: string
      oldTime?: string
      newTime?: string
      reason?: string
      requestedBy?: string
    },
    ghlContactId?: string
  ): Promise<WebhookResponse> {
    try {
      const payload = {
        event: 'booking_updated',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || ''
        },
        changes: {
          old_status: changes.oldStatus,
          new_status: changes.newStatus,
          old_date: changes.oldDate || booking.date,
          new_date: changes.newDate || booking.date,
          old_time: changes.oldTime || booking.time,
          new_time: changes.newTime || booking.time,
          reason: changes.reason || 'No reason provided',
          requested_by: changes.requestedBy || 'system'
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || 0,
          date: changes.newDate || booking.date,
          time: changes.newTime || booking.time,
          duration: booking.duration,
          price: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: changes.newStatus
        },
        system_data: {
          updated_at: new Date().toISOString(),
          updated_by: changes.requestedBy || 'system',
          change_source: 'website',
          session_id: `session_${Date.now()}`
        }
      }

      const response = await fetch(this.webhookUrls.bookingUpdate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        cache: 'no-cache'
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        return { success: false, error: errorText }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendShowNoShowWebhook(
    bookingId: string,
    customer: CustomerData,
    booking: BookingData,
    status: 'show' | 'no_show',
    adminNotes?: string,
    ghlContactId?: string
  ): Promise<WebhookResponse> {
    console.log('Sending show/no-show webhook to GHL:', { bookingId, customer: customer.name, status })
    try {
      const payload = {
        event: 'appointment_attendance',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || '',
          is_new_customer: customer.isNewCustomer || false,
          total_bookings: customer.isNewCustomer ? 1 : 2 // This would be dynamic in real implementation
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || 0,
          date: booking.date,
          time: booking.time,
          duration: booking.duration,
          price: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: status === 'show' ? 'completed' : 'no_show'
        },
        attendance: {
          status: status,
          marked_at: new Date().toISOString(),
          marked_by: 'admin_panel',
          admin_notes: adminNotes || '',
          follow_up_required: status === 'no_show',
          follow_up_priority: status === 'no_show' ? 'high' : 'normal'
        },
        location: {
          name: BUSINESS_CONFIG.name,
          address: BUSINESS_CONFIG.address,
          phone: BUSINESS_CONFIG.phone
        },
        business_impact: {
          revenue_impact: status === 'show' ? booking.price : 0,
          time_slot_utilization: status === 'show' ? 'utilized' : 'wasted',
          staff_availability: status === 'show' ? 'occupied' : 'available',
          customer_satisfaction: status === 'show' ? 'positive' : 'negative'
        },
        system_data: {
          created_at: new Date().toISOString(),
          attendance_marked_at: new Date().toISOString(),
          booking_source: 'website',
          session_id: `session_${Date.now()}`,
          admin_session: `admin_${Date.now()}`
        }
      }

      const response = await fetch(this.webhookUrls.showNoShow, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        cache: 'no-cache'
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        return { success: false, error: errorText }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const ghlWebhookSender = new GHLWebhookSender() 