// GoHighLevel API Client
// Handles direct API integration with GoHighLevel CRM

interface GHLContact {
  id?: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  name: string
  tags?: string[]
  customFields?: Record<string, any>
  source?: string
  locationId?: string
}

interface GHLApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class GHLApiClient {
  private readonly apiUrl = 'https://services.leadconnectorhq.com'
  private readonly apiToken: string
  private readonly locationId: string

  constructor() {
    this.apiToken = process.env.GHL_API_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_TOKEN || ''
    this.locationId = process.env.GHL_LOCATION_ID || '95mKGfnKeJoUlG853dqQ'
    
    if (!this.apiToken) {
      console.warn('GHL API Token not configured - GHL contact sync disabled')
    }
  }

  /**
   * Create or update a contact in GoHighLevel
   */
  async createOrUpdateContact(
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
    customFields?: Record<string, any>,
    tags?: string[]
  ): Promise<GHLApiResponse> {
    if (!this.apiToken) {
      return { 
        success: false, 
        error: 'GHL API Token not configured' 
      }
    }

    try {
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(email)
      
      if (existingContact.success && existingContact.data) {
        // Update existing contact
        return await this.updateContact(
          existingContact.data.id!,
          { firstName, lastName, phone, customFields, tags }
        )
      } else {
        // Create new contact
        return await this.createContact({
          email,
          firstName,
          lastName,
          phone,
          customFields,
          tags
        })
      }
    } catch (error) {
      console.error('Error creating/updating GHL contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Find a contact by email address
   */
  private async findContactByEmail(email: string): Promise<GHLApiResponse<GHLContact>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/contacts/v1/contacts/search?email=${encodeURIComponent(email)}&locationId=${this.locationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL contact search failed:', response.status, errorText)
        return {
          success: false,
          error: `Search failed: ${response.status}`
        }
      }

      const data = await response.json()
      
      // GHL returns an array of contacts
      if (data.contacts && data.contacts.length > 0) {
        return {
          success: true,
          data: data.contacts[0]
        }
      }

      return {
        success: false,
        message: 'Contact not found'
      }
    } catch (error) {
      console.error('Error searching for GHL contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }
    }
  }

  /**
   * Create a new contact in GoHighLevel
   */
  private async createContact(contactData: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    customFields?: Record<string, any>
    tags?: string[]
  }): Promise<GHLApiResponse<GHLContact>> {
    try {
      const payload = {
        email: contactData.email,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        name: `${contactData.firstName} ${contactData.lastName}`,
        phone: contactData.phone || '',
        tags: contactData.tags || [],
        customField: contactData.customFields || {},
        source: 'Spa Booking System',
        locationId: this.locationId
      }

      const response = await fetch(
        `${this.apiUrl}/contacts/v1/contacts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL contact creation failed:', response.status, errorText)
        return {
          success: false,
          error: `Creation failed: ${response.status}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: data.contact || data
      }
    } catch (error) {
      console.error('Error creating GHL contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Creation failed'
      }
    }
  }

  /**
   * Update an existing contact in GoHighLevel
   */
  private async updateContact(
    contactId: string,
    updates: {
      firstName?: string
      lastName?: string
      phone?: string
      customFields?: Record<string, any>
      tags?: string[]
    }
  ): Promise<GHLApiResponse<GHLContact>> {
    try {
      const payload: any = {}
      
      if (updates.firstName) payload.firstName = updates.firstName
      if (updates.lastName) payload.lastName = updates.lastName
      if (updates.phone) payload.phone = updates.phone
      if (updates.customFields) payload.customField = updates.customFields
      if (updates.tags) payload.tags = updates.tags
      
      // Update full name if names provided
      if (updates.firstName || updates.lastName) {
        payload.name = `${updates.firstName || ''} ${updates.lastName || ''}`.trim()
      }

      const response = await fetch(
        `${this.apiUrl}/contacts/v1/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL contact update failed:', response.status, errorText)
        return {
          success: false,
          error: `Update failed: ${response.status}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: data.contact || data
      }
    } catch (error) {
      console.error('Error updating GHL contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }
    }
  }

  /**
   * Add tags to a contact
   */
  async addTagsToContact(contactId: string, tags: string[]): Promise<GHLApiResponse> {
    if (!this.apiToken) {
      return { 
        success: false, 
        error: 'GHL API Token not configured' 
      }
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/contacts/v1/contacts/${contactId}/tags`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({ tags })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to add tags to GHL contact:', response.status, errorText)
        return {
          success: false,
          error: `Failed to add tags: ${response.status}`
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error adding tags to GHL contact:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add tags'
      }
    }
  }

  /**
   * Sync booking payment confirmation to GoHighLevel
   */
  async syncBookingPayment(
    customerEmail: string,
    customerName: string,
    customerPhone: string | undefined,
    bookingData: {
      bookingId: string
      service: string
      serviceCategory: string
      appointmentDate: string
      appointmentTime: string
      staffName?: string
      totalAmount: number
      paymentStatus: 'paid' | 'pending' | 'failed'
      transactionId?: string
    }
  ): Promise<GHLApiResponse> {
    if (!this.apiToken) {
      // GHL API Token not configured - skipping contact sync
      return { success: false, error: 'API not configured' }
    }

    try {
      const [firstName, ...lastNameParts] = customerName.split(' ')
      const lastName = lastNameParts.join(' ')

      // Prepare custom fields
      const customFields = {
        booking_id: bookingData.bookingId,
        last_service: bookingData.service,
        last_service_category: bookingData.serviceCategory,
        last_appointment_date: bookingData.appointmentDate,
        last_appointment_time: bookingData.appointmentTime,
        last_payment_amount: bookingData.totalAmount.toString(),
        last_payment_status: bookingData.paymentStatus,
        last_transaction_id: bookingData.transactionId || '',
        total_lifetime_value: bookingData.totalAmount.toString() // Would need to calculate from history
      }

      // Prepare tags based on booking
      const tags = [
        'spa-customer',
        `service-${bookingData.serviceCategory.toLowerCase().replace(/\s+/g, '-')}`,
        bookingData.paymentStatus === 'paid' ? 'payment-confirmed' : 'payment-pending'
      ]

      // Add staff tag if available
      if (bookingData.staffName) {
        tags.push(`staff-${bookingData.staffName.toLowerCase().replace(/\s+/g, '-')}`)
      }

      // Create or update contact
      const result = await this.createOrUpdateContact(
        customerEmail,
        firstName,
        lastName || '',
        customerPhone,
        customFields,
        tags
      )

      if (!result.success) {
        // Failed to sync booking payment to GHL
        // Keep error for monitoring but don't expose in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to sync booking payment to GHL:', result.error)
        }
      }

      return result
    } catch (error) {
      console.error('Error syncing booking payment to GHL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }
}

// Export singleton instance
export const ghlApiClient = new GHLApiClient()

// Export class for testing
export { GHLApiClient }