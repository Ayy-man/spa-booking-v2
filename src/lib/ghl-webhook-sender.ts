// GoHighLevel Webhook Sender Utility
// Simple utility to send data to GHL webhooks

import { BUSINESS_CONFIG, PAYMENT_CONFIG } from './business-config'

interface CustomerData {
  name: string
  email: string
  phone?: string
  isNewCustomer?: boolean
  marketingConsent?: boolean
}

interface BookingData {
  service: string
  serviceId?: string
  serviceCategory: string
  ghlCategory?: string
  date: string
  time: string
  duration: number
  price: number
  requiresOnSitePricing?: boolean
  staff?: string
  staffId?: string
  room?: string
  roomId?: string
  addons?: Array<{
    id: string
    name: string
    price: number
    duration: number
    quantity?: number
  }>
  addonsTotal?: {
    price: number
    duration: number
  }
}

interface WebhookResponse {
  success: boolean
  error?: string
}

class GHLWebhookSender {
  private readonly webhookUrls = {
    bookingConfirmation: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/ad60157f-9851-4392-b9ad-cf28c139f881',
    showNoShow: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/3d204c22-6f87-4b9d-84a5-3aa8dd2119c4',
    walkIn: 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/7768c4e4-e124-46ee-a439-52bb2d9da84e'
  }

  async sendBookingConfirmationWebhook(
    bookingId: string,
    customer: CustomerData,
    booking: BookingData,
    ghlContactId?: string,
    paymentDetails?: {
      verified: boolean
      transaction_id: string
      payment_method: string
      payment_provider: string
    }
  ): Promise<WebhookResponse> {
    try {
      // Format normalized date and time
      const normalizedTime = this.formatNormalizedDateTime(booking.date, booking.time)
      
      const payload = {
        event: 'booking_confirmed',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || '',
          is_new_customer: customer.isNewCustomer || false,
          total_bookings: 0 // Will be populated dynamically in future
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          ghl_category: booking.ghlCategory || booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || '',
          date: booking.date,
          time: booking.time,
          normalized_time: normalizedTime,
          duration: booking.duration,
          price: booking.requiresOnSitePricing ? 0 : booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: 'confirmed',
          confirmation_code: `CONF-${bookingId.slice(0, 8).toUpperCase()}`,
          addons: booking.addons || [],
          addons_total: booking.addonsTotal || { price: 0, duration: 0 },
          total_price: booking.requiresOnSitePricing ? 0 : (booking.price + (booking.addonsTotal?.price || 0)),
          requires_on_site_pricing: booking.requiresOnSitePricing || false,
          price_note: booking.requiresOnSitePricing ? 'Price to be determined at spa' : undefined,
          total_duration: booking.duration + (booking.addonsTotal?.duration || 0)
        },
        location: {
          name: BUSINESS_CONFIG.name,
          address: BUSINESS_CONFIG.address,
          phone: BUSINESS_CONFIG.phone
        },
        payment: {
          method: booking.requiresOnSitePricing ? 'pay_on_location' : (paymentDetails?.payment_method || 'online_payment'),
          amount: booking.requiresOnSitePricing ? 0 : (booking.price + (booking.addonsTotal?.price || 0)),
          currency: PAYMENT_CONFIG.currency,
          status: booking.requiresOnSitePricing ? 'pending' : (paymentDetails?.verified ? 'verified_paid' : 'pending_verification'),
          transaction_id: paymentDetails?.transaction_id || `pending_${Date.now()}`,
          provider: paymentDetails?.payment_provider || 'unknown',
          verified: paymentDetails?.verified || false,
          verified_at: paymentDetails?.verified ? new Date().toISOString() : null
        },
        system_data: {
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          booking_source: 'website',
          session_id: `session_${Date.now()}`
        }
      }

      // Send to GoHighLevel webhook first
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

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GoHighLevel webhook failed:', errorText)
        // Continue to send to Railway even if GHL fails
      }

      // Also send to Railway webhook for n8n processing
      try {
        const railwayPayload = {
          ...payload,
          spa_name: BUSINESS_CONFIG.name,
          recipient_email: 'happyskinhappyyou@gmail.com',
          timestamp: new Date().toISOString(),
          source: 'booking_confirmation'
        }

        const railwayResponse = await fetch('https://primary-production-66f3.up.railway.app/webhook/bacbd069-d26d-4e74-a318-4a0442689bbf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `${BUSINESS_CONFIG.name.replace(/\s+/g, '-')}-Booking-App/1.0`,
          },
          body: JSON.stringify(railwayPayload),
          mode: 'cors',
          cache: 'no-cache'
        })

        if (!railwayResponse.ok) {
          const railwayError = await railwayResponse.text()
          console.error('Railway webhook failed:', railwayError)
        }
      } catch (railwayError) {
        console.error('Error sending to Railway webhook:', railwayError)
        // Don't fail the whole operation if Railway webhook fails
      }

      // Return success if at least GoHighLevel succeeded
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
    try {
      // Format normalized date and time
      const normalizedTime = this.formatNormalizedDateTime(booking.date, booking.time)
      
      const payload = {
        event: 'appointment_attendance',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || '',
          is_new_customer: customer.isNewCustomer || false,
          total_bookings: 0 // Will be populated dynamically in future
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          ghl_category: booking.ghlCategory || booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || '',
          date: booking.date,
          time: booking.time,
          normalized_time: normalizedTime,
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

  async sendWalkInWebhook(
    bookingId: string,
    customer: CustomerData,
    booking: BookingData,
    isImmediate: boolean = false,
    ghlContactId?: string
  ): Promise<WebhookResponse> {
    try {
      // Format normalized date and time
      const normalizedTime = this.formatNormalizedDateTime(booking.date, booking.time)
      
      const payload = {
        event: 'walk_in_booking',
        booking_id: bookingId,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          ghl_contact_id: ghlContactId || '',
          is_new_customer: true, // Walk-ins are typically new customers
          source: 'admin_walk_in'
        },
        appointment: {
          service: booking.service,
          service_id: booking.serviceId || '',
          service_category: booking.serviceCategory,
          ghl_category: booking.ghlCategory || booking.serviceCategory,
          service_description: `${booking.service} treatment`,
          staff: booking.staff || 'Any Available',
          staff_id: booking.staffId || '',
          room: booking.room || 'TBD',
          room_id: booking.roomId || '',
          date: booking.date,
          time: booking.time,
          normalized_time: normalizedTime,
          duration: booking.duration,
          price: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: 'confirmed',
          booking_type: isImmediate ? 'immediate_walk_in' : 'scheduled_walk_in',
          confirmation_code: `WALKIN${Date.now()}`
        },
        location: {
          name: BUSINESS_CONFIG.name,
          address: BUSINESS_CONFIG.address,
          phone: BUSINESS_CONFIG.phone
        },
        payment: {
          method: 'walk_in_payment',
          amount: booking.price,
          currency: PAYMENT_CONFIG.currency,
          status: 'pending', // Walk-ins typically pay at the time of service
          transaction_id: `walkin_${Date.now()}`
        },
        system_data: {
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          booking_source: 'admin_panel',
          session_id: `admin_session_${Date.now()}`,
          walk_in_type: isImmediate ? 'immediate' : 'scheduled'
        }
      }

      const response = await fetch(this.webhookUrls.walkIn, {
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

  /**
   * Format date and time into a human-readable string
   * @param date - Date string (e.g., "2025-08-05")
   * @param time - Time string (e.g., "10:30")
   * @returns Formatted string like "Monday, August 5, 2025 at 10:30 AM"
   */
  private formatNormalizedDateTime(date: string, time: string): string {
    try {
      // Validate inputs
      if (!date || !time) {
        console.warn('formatNormalizedDateTime: Missing date or time', { date, time })
        return `${date || 'Unknown Date'} at ${time || 'Unknown Time'}`
      }

      // Handle different date formats
      let year: number, month: number, day: number
      
      if (date.includes('T') || date.includes('Z')) {
        // Format: ISO string like "2025-08-05T00:00:00.000Z"
        const parsedDate = new Date(date)
        if (isNaN(parsedDate.getTime())) {
          console.warn('formatNormalizedDateTime: Invalid ISO date format', { date })
          return `${date} at ${time}`
        }
        year = parsedDate.getFullYear()
        month = parsedDate.getMonth() + 1
        day = parsedDate.getDate()
      } else if (date.includes('-')) {
        // Format: "2025-08-05"
        [year, month, day] = date.split('-').map(Number)
      } else if (date.includes('/')) {
        // Format: "08/05/2025"
        [month, day, year] = date.split('/').map(Number)
      } else {
        // Try to parse as any other date format
        const parsedDate = new Date(date)
        if (isNaN(parsedDate.getTime())) {
          console.warn('formatNormalizedDateTime: Invalid date format', { date })
          return `${date} at ${time}`
        }
        year = parsedDate.getFullYear()
        month = parsedDate.getMonth() + 1
        day = parsedDate.getDate()
      }

      // Handle different time formats
      let hour: number, minute: number
      
      if (time.includes(':')) {
        // Format: "10:30" or "14:30"
        [hour, minute] = time.split(':').map(Number)
      } else if (time.includes(' ')) {
        // Format: "10:30 AM" or "2:30 PM"
        const timeParts = time.split(' ')
        const [timeStr, period] = timeParts
        const [h, m] = timeStr.split(':').map(Number)
        hour = period?.toUpperCase() === 'PM' && h !== 12 ? h + 12 : h
        minute = m
      } else {
        console.warn('formatNormalizedDateTime: Invalid time format', { time })
        return `${date} at ${time}`
      }

      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
        console.warn('formatNormalizedDateTime: Invalid parsed values', { year, month, day, hour, minute })
        return `${date} at ${time}`
      }

      // Create a Date object (month is 0-indexed in JavaScript Date)
      const appointmentDate = new Date(year, month - 1, day, hour, minute)
      
      // Validate the created date
      if (isNaN(appointmentDate.getTime())) {
        console.warn('formatNormalizedDateTime: Invalid date object created', { year, month, day, hour, minute })
        return `${date} at ${time}`
      }
      
      // Format the date
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
      
      // Format the time
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
      
      const formattedDate = appointmentDate.toLocaleDateString('en-US', dateOptions)
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', timeOptions)
      
      return `${formattedDate} at ${formattedTime}`
    } catch (error) {
      console.error('formatNormalizedDateTime: Error formatting date/time', { date, time, error })
      // Fallback to simple format if parsing fails
      return `${date || 'Unknown Date'} at ${time || 'Unknown Time'}`
    }
  }
}

// Export singleton instance
export const ghlWebhookSender = new GHLWebhookSender() 