/**
 * BookingStateManager v2 - Clean state management for spa booking flow
 * 
 * Business Model:
 * - ANY service can be booked as single OR couples
 * - Customer chooses booking type explicitly
 * - No service is inherently "couples only"
 */

// Core interfaces
export interface Service {
  id: string
  name: string
  category: string
  duration: number
  price: number
  description?: string
  requires_room_3?: boolean
}

export interface Staff {
  id: string
  name: string
  specialties?: string[]
  default_room_id?: number
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
  notes?: string
  isNewCustomer: boolean
}

// Main booking state interface
export interface BookingState {
  // Core booking type - MUST be set first
  bookingType: 'single' | 'couples'
  
  // Service selection
  service: Service | null
  secondaryService?: Service | null  // Only for couples
  
  // Date and time
  date: string | null  // Format: YYYY-MM-DD
  time: string | null  // Format: HH:MM
  
  // Staff selection
  staff: Staff | null
  secondaryStaff?: Staff | null  // Only for couples
  
  // Customer information
  customer: CustomerInfo | null
  
  // Payment info (optional, mostly handled separately)
  paymentType?: 'deposit' | 'pay_on_location'
  
  // Metadata
  createdAt: string
  updatedAt: string
  sessionId: string
}

// Validation types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// Storage keys
const STORAGE_KEY = 'spa_booking_state_v2'
const SESSION_KEY = 'spa_booking_session'

/**
 * BookingStateManager - Handles all booking state operations
 */
export class BookingStateManager {
  private state: BookingState
  
  constructor() {
    this.state = this.loadState() || this.createInitialState()
  }
  
  /**
   * Create a fresh initial state
   */
  private createInitialState(): BookingState {
    return {
      bookingType: 'single',  // Default to single booking
      service: null,
      secondaryService: null,
      date: null,
      time: null,
      staff: null,
      secondaryStaff: null,
      customer: null,
      paymentType: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionId: this.generateSessionId()
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
  
  /**
   * Load state from sessionStorage
   */
  private loadState(): BookingState | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      
      // Validate loaded state
      if (!this.isValidStoredState(parsed)) {
        console.warn('[BookingStateManager] Invalid stored state, creating new')
        return null
      }
      
      return parsed
    } catch (error) {
      console.error('[BookingStateManager] Failed to load state:', error)
      return null
    }
  }
  
  /**
   * Validate stored state structure
   */
  private isValidStoredState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      ['single', 'couples'].includes(state.bookingType) &&
      typeof state.sessionId === 'string'
    )
  }
  
  /**
   * Save state to sessionStorage
   */
  private saveState(): void {
    try {
      this.state.updatedAt = new Date().toISOString()
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch (error) {
      console.error('[BookingStateManager] Failed to save state:', error)
    }
  }
  
  /**
   * Set booking type (single or couples)
   */
  setBookingType(type: 'single' | 'couples'): void {
    this.state.bookingType = type
    
    // Clear couples-specific fields if switching to single
    if (type === 'single') {
      this.state.secondaryService = null
      this.state.secondaryStaff = null
    }
    
    this.saveState()
  }
  
  /**
   * Set primary service
   */
  setService(service: Service): void {
    this.state.service = service
    this.saveState()
  }
  
  /**
   * Set secondary service (couples only)
   */
  setSecondaryService(service: Service | null): void {
    if (this.state.bookingType !== 'couples') {
      console.warn('[BookingStateManager] Cannot set secondary service for single booking')
      return
    }
    this.state.secondaryService = service
    this.saveState()
  }
  
  /**
   * Set date and time
   */
  setDateTime(date: string, time: string): void {
    this.state.date = date
    this.state.time = time
    this.saveState()
  }
  
  /**
   * Set primary staff
   */
  setStaff(staff: Staff): void {
    this.state.staff = staff
    this.saveState()
  }
  
  /**
   * Set secondary staff (couples only)
   */
  setSecondaryStaff(staff: Staff | null): void {
    if (this.state.bookingType !== 'couples') {
      console.warn('[BookingStateManager] Cannot set secondary staff for single booking')
      return
    }
    this.state.secondaryStaff = staff
    this.saveState()
  }
  
  /**
   * Set customer information
   */
  setCustomer(customer: CustomerInfo): void {
    this.state.customer = customer
    this.saveState()
  }
  
  /**
   * Set payment type
   */
  setPaymentType(type: 'deposit' | 'pay_on_location'): void {
    this.state.paymentType = type
    this.saveState()
  }
  
  /**
   * Get current state
   */
  getState(): BookingState {
    return { ...this.state }
  }
  
  /**
   * Check if ready for a specific step
   */
  canProceedTo(step: string): ValidationResult {
    const errors: string[] = []
    
    switch (step) {
      case 'date-time':
        if (!this.state.service) errors.push('Please select a service')
        if (this.state.bookingType === 'couples' && !this.state.secondaryService) {
          errors.push('Please select service for second person')
        }
        break
        
      case 'staff':
      case 'staff-couples':
        if (!this.state.service) errors.push('Service not selected')
        if (!this.state.date) errors.push('Date not selected')
        if (!this.state.time) errors.push('Time not selected')
        break
        
      case 'customer-info':
        if (!this.state.service) errors.push('Service not selected')
        if (!this.state.date) errors.push('Date not selected')
        if (!this.state.time) errors.push('Time not selected')
        if (!this.state.staff) errors.push('Staff not selected')
        if (this.state.bookingType === 'couples' && !this.state.secondaryService) {
          errors.push('Service for second person not selected')
        }
        if (this.state.bookingType === 'couples' && !this.state.secondaryStaff) {
          errors.push('Staff for second person not selected')
        }
        break
        
      case 'payment':
      case 'confirmation':
      case 'confirmation-couples':
        if (!this.state.customer) errors.push('Customer information not provided')
        break
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Validate entire booking state
   */
  validateComplete(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Required fields for all bookings
    if (!this.state.service) errors.push('Service is required')
    if (!this.state.date) errors.push('Date is required')
    if (!this.state.time) errors.push('Time is required')
    if (!this.state.staff) errors.push('Staff is required')
    if (!this.state.customer) errors.push('Customer information is required')
    
    // Couples-specific validation
    if (this.state.bookingType === 'couples') {
      if (!this.state.secondaryService) {
        errors.push('Second service is required for couples booking')
      }
      if (!this.state.secondaryStaff) {
        errors.push('Second staff member is required for couples booking')
      }
    } else {
      // Single booking shouldn't have couples fields
      if (this.state.secondaryService) {
        warnings.push('Secondary service set for single booking')
      }
      if (this.state.secondaryStaff) {
        warnings.push('Secondary staff set for single booking')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
  
  /**
   * Clear all state and start fresh
   */
  reset(): void {
    this.state = this.createInitialState()
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  }
  
  /**
   * Get the next page in the flow
   */
  getNextPage(currentPage: string): string {
    const isCouples = this.state.bookingType === 'couples'
    
    const flowMap: Record<string, string> = {
      '/booking': '/booking/date-time',
      '/booking/date-time': isCouples ? '/booking/staff-couples' : '/booking/staff',
      '/booking/staff': '/booking/customer-info',
      '/booking/staff-couples': '/booking/customer-info',
      '/booking/customer-info': this.state.customer?.isNewCustomer 
        ? '/booking/payment-gateway'
        : (isCouples ? '/booking/confirmation-couples' : '/booking/payment-selection'),
      '/booking/payment-selection': '/booking/confirmation',
      '/booking/payment-gateway': isCouples ? '/booking/confirmation-couples' : '/booking/confirmation'
    }
    
    return flowMap[currentPage] || '/booking'
  }
  
  /**
   * Prepare data for API submission
   */
  prepareBookingData() {
    const validation = this.validateComplete()
    if (!validation.isValid) {
      throw new Error(`Invalid booking state: ${validation.errors.join(', ')}`)
    }
    
    if (this.state.bookingType === 'couples') {
      // Return array of two bookings for couples
      return [
        {
          service_id: this.state.service!.id,
          appointment_date: this.state.date,
          start_time: this.state.time,
          staff_id: this.state.staff!.id,
          customer_name: this.state.customer!.name,
          customer_email: this.state.customer!.email,
          customer_phone: this.state.customer!.phone,
          booking_type: 'couple' as const,
          payment_option: this.state.paymentType || 'deposit',
          notes: this.state.customer!.notes
        },
        {
          service_id: this.state.secondaryService!.id,
          appointment_date: this.state.date,
          start_time: this.state.time,
          staff_id: this.state.secondaryStaff!.id,
          customer_name: this.state.customer!.name,
          customer_email: this.state.customer!.email,
          customer_phone: this.state.customer!.phone,
          booking_type: 'couple' as const,
          payment_option: this.state.paymentType || 'deposit',
          notes: this.state.customer!.notes
        }
      ]
    } else {
      // Single booking
      return {
        service_id: this.state.service!.id,
        appointment_date: this.state.date,
        start_time: this.state.time,
        staff_id: this.state.staff!.id,
        customer_name: this.state.customer!.name,
        customer_email: this.state.customer!.email,
        customer_phone: this.state.customer!.phone,
        booking_type: 'single' as const,
        payment_option: this.state.paymentType || 'deposit',
        notes: this.state.customer!.notes
      }
    }
  }
}

// Export singleton instance
export const bookingStateManager = new BookingStateManager()

// Helper function for components
export function useBookingState() {
  return {
    state: bookingStateManager.getState(),
    setBookingType: (type: 'single' | 'couples') => bookingStateManager.setBookingType(type),
    setService: (service: Service) => bookingStateManager.setService(service),
    setSecondaryService: (service: Service | null) => bookingStateManager.setSecondaryService(service),
    setDateTime: (date: string, time: string) => bookingStateManager.setDateTime(date, time),
    setStaff: (staff: Staff) => bookingStateManager.setStaff(staff),
    setSecondaryStaff: (staff: Staff | null) => bookingStateManager.setSecondaryStaff(staff),
    setCustomer: (customer: CustomerInfo) => bookingStateManager.setCustomer(customer),
    setPaymentType: (type: 'deposit' | 'pay_on_location') => bookingStateManager.setPaymentType(type),
    canProceedTo: (step: string) => bookingStateManager.canProceedTo(step),
    validateComplete: () => bookingStateManager.validateComplete(),
    reset: () => bookingStateManager.reset(),
    getNextPage: (currentPage: string) => bookingStateManager.getNextPage(currentPage),
    prepareBookingData: () => bookingStateManager.prepareBookingData()
  }
}