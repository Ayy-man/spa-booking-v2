/**
 * Centralized booking state management
 * Handles persistent storage of booking data across the entire flow
 */

export interface BookingState {
  // Navigation
  currentStep?: number
  
  // Service selection
  bookingData?: {
    isCouplesBooking: boolean
    primaryService: ServiceData
    secondaryService?: ServiceData
    totalPrice: number
    totalDuration: number
  }
  selectedService?: ServiceData
  
  // Add-ons
  selectedAddons?: AddonData[]
  addonsTotal?: {
    price: number
    duration: number
  }
  
  // Date and time
  selectedDate?: string
  selectedTime?: string
  
  // Staff selection  
  selectedStaff?: string
  secondaryStaff?: string
  
  // Customer info
  customerInfo?: {
    name: string
    email: string
    phone?: string
    isNewCustomer: boolean
    specialRequests?: string
    marketingConsent?: boolean
  }
  
  // Payment
  paymentType?: 'full' | 'deposit' | 'location'
  
  // Waiver
  waiverCompleted?: boolean
  completedWaiverType?: string
  waiverId?: string
  
  // Metadata
  sessionId?: string
  timestamp?: number
  lastUpdated?: number
}

interface ServiceData {
  id?: string
  name: string
  price: number
  duration: number
  category?: string
  description?: string
}

export interface AddonData {
  id: string
  name: string
  price: number
  duration: number
  quantity?: number
  category?: string
  description?: string
}

const STORAGE_KEY = 'spa_booking_state'
const SESSION_KEY = 'spa_booking_session'
const STATE_EXPIRY_HOURS = 24

class BookingStateManager {
  /**
   * Generate a unique session ID for tracking bookings
   */
  private generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if stored state has expired
   */
  private isExpired(timestamp?: number): boolean {
    if (!timestamp) return false
    const expiryTime = timestamp + (STATE_EXPIRY_HOURS * 60 * 60 * 1000)
    return Date.now() > expiryTime
  }

  /**
   * Save booking state to both localStorage and sessionStorage
   */
  saveBookingState(updates: Partial<BookingState>): BookingState {
    try {
      // Load existing state
      const currentState = this.loadBookingState() || {}
      
      // Merge updates with current state
      const newState: BookingState = {
        ...currentState,
        ...updates,
        lastUpdated: Date.now()
      }
      
      // Initialize session ID and timestamp if not present
      if (!newState.sessionId) {
        newState.sessionId = this.generateSessionId()
        newState.timestamp = Date.now()
      }
      
      // Save to both storage types
      const stateString = JSON.stringify(newState)
      localStorage.setItem(STORAGE_KEY, stateString)
      sessionStorage.setItem(SESSION_KEY, stateString)
      
      // Also save individual keys for backward compatibility
      this.saveCompatibilityKeys(newState)
      
      // State saved successfully
      return newState
      
    } catch (error) {
      console.error('[BookingStateManager] Error saving state:', error)
      // Attempt to save to sessionStorage only as fallback
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updates))
      } catch {}
      return updates as BookingState
    }
  }

  /**
   * Save individual localStorage keys for backward compatibility
   */
  private saveCompatibilityKeys(state: BookingState): void {
    try {
      // Save individual keys that existing code expects
      if (state.bookingData) {
        localStorage.setItem('bookingData', JSON.stringify(state.bookingData))
      }
      if (state.selectedService) {
        localStorage.setItem('selectedService', JSON.stringify(state.selectedService))
      }
      if (state.selectedDate) {
        localStorage.setItem('selectedDate', state.selectedDate)
      }
      if (state.selectedTime) {
        localStorage.setItem('selectedTime', state.selectedTime)
      }
      if (state.selectedStaff) {
        localStorage.setItem('selectedStaff', state.selectedStaff)
      }
      if (state.secondaryStaff) {
        localStorage.setItem('secondaryStaff', state.secondaryStaff)
      }
      if (state.customerInfo) {
        localStorage.setItem('customerInfo', JSON.stringify(state.customerInfo))
      }
      if (state.paymentType) {
        localStorage.setItem('paymentType', state.paymentType)
      }
      if (state.waiverCompleted !== undefined) {
        localStorage.setItem('waiverCompleted', String(state.waiverCompleted))
      }
      if (state.completedWaiverType) {
        localStorage.setItem('completedWaiverType', state.completedWaiverType)
      }
      if (state.waiverId) {
        localStorage.setItem('waiverId', state.waiverId)
      }
    } catch (error) {
      console.error('[BookingStateManager] Error saving compatibility keys:', error)
    }
  }

  /**
   * Load booking state from storage
   */
  loadBookingState(): BookingState | null {
    try {
      // Try localStorage first
      let stateString = localStorage.getItem(STORAGE_KEY)
      
      // Fallback to sessionStorage
      if (!stateString) {
        stateString = sessionStorage.getItem(SESSION_KEY)
      }
      
      if (stateString) {
        const state = JSON.parse(stateString) as BookingState
        
        // Check if state has expired
        if (this.isExpired(state.timestamp)) {
          // State expired, clearing
          this.clearBookingState()
          return null
        }
        
        return state
      }
      
      // Try to recover from individual keys if unified state not found
      return this.recoverFromLegacyKeys()
      
    } catch (error) {
      console.error('[BookingStateManager] Error loading state:', error)
      // Attempt recovery from legacy keys
      return this.recoverFromLegacyKeys()
    }
  }

  /**
   * Recover state from individual localStorage keys (backward compatibility)
   */
  private recoverFromLegacyKeys(): BookingState | null {
    try {
      const state: BookingState = {}
      
      // Recover bookingData
      const bookingDataStr = localStorage.getItem('bookingData')
      if (bookingDataStr) {
        state.bookingData = JSON.parse(bookingDataStr)
      }
      
      // Recover selectedService
      const selectedServiceStr = localStorage.getItem('selectedService')
      if (selectedServiceStr) {
        state.selectedService = JSON.parse(selectedServiceStr)
      }
      
      // Recover date and time
      const selectedDate = localStorage.getItem('selectedDate')
      if (selectedDate) {
        state.selectedDate = selectedDate
      }
      
      const selectedTime = localStorage.getItem('selectedTime')
      if (selectedTime) {
        state.selectedTime = selectedTime
      }
      
      // Recover staff
      const selectedStaff = localStorage.getItem('selectedStaff')
      if (selectedStaff) {
        state.selectedStaff = selectedStaff
      }
      
      const secondaryStaff = localStorage.getItem('secondaryStaff')
      if (secondaryStaff) {
        state.secondaryStaff = secondaryStaff
      }
      
      // Recover customer info
      const customerInfoStr = localStorage.getItem('customerInfo')
      if (customerInfoStr) {
        state.customerInfo = JSON.parse(customerInfoStr)
      }
      
      // Recover payment type
      const paymentType = localStorage.getItem('paymentType')
      if (paymentType) {
        state.paymentType = paymentType as 'full' | 'deposit' | 'location'
      }
      
      // Recover waiver info
      const waiverCompleted = localStorage.getItem('waiverCompleted')
      if (waiverCompleted) {
        state.waiverCompleted = waiverCompleted === 'true'
      }
      
      const completedWaiverType = localStorage.getItem('completedWaiverType')
      if (completedWaiverType) {
        state.completedWaiverType = completedWaiverType
      }
      
      const waiverId = localStorage.getItem('waiverId')
      if (waiverId) {
        state.waiverId = waiverId
      }
      
      // If we recovered any data, save it in the new format
      if (Object.keys(state).length > 0) {
        // Recovered from legacy keys
        state.sessionId = this.generateSessionId()
        state.timestamp = Date.now()
        state.lastUpdated = Date.now()
        
        // Save in new format
        const stateString = JSON.stringify(state)
        localStorage.setItem(STORAGE_KEY, stateString)
        sessionStorage.setItem(SESSION_KEY, stateString)
        
        return state
      }
      
      return null
      
    } catch (error) {
      console.error('[BookingStateManager] Error recovering from legacy keys:', error)
      return null
    }
  }

  /**
   * Clear all booking state
   */
  clearBookingState(): void {
    try {
      // Clear unified state
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(SESSION_KEY)
      
      // Clear individual keys for backward compatibility
      const keysToRemove = [
        'bookingData',
        'selectedService',
        'selectedDate',
        'selectedTime',
        'selectedStaff',
        'secondaryStaff',
        'customerInfo',
        'paymentType',
        'waiverCompleted',
        'completedWaiverType',
        'waiverId',
        'lastBooking'
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      // State cleared
      
    } catch (error) {
      console.error('[BookingStateManager] Error clearing state:', error)
    }
  }

  /**
   * Get specific field from booking state
   */
  getField<K extends keyof BookingState>(field: K): BookingState[K] | undefined {
    const state = this.loadBookingState()
    return state?.[field]
  }

  /**
   * Update specific field in booking state
   */
  setField<K extends keyof BookingState>(field: K, value: BookingState[K]): void {
    this.saveBookingState({ [field]: value })
  }

  /**
   * Check if booking state exists and is valid
   */
  hasValidState(): boolean {
    const state = this.loadBookingState()
    return state !== null && !this.isExpired(state.timestamp)
  }

  /**
   * Get session ID for current booking
   */
  getSessionId(): string | undefined {
    const state = this.loadBookingState()
    return state?.sessionId
  }

  /**
   * Recover state using session ID (for payment returns)
   */
  recoverBySessionId(sessionId: string): BookingState | null {
    try {
      // First try to load normally
      const state = this.loadBookingState()
      
      // Verify session ID matches
      if (state && state.sessionId === sessionId) {
        // State recovered by session ID
        return state
      }
      
      // If no match, attempt recovery from legacy keys
      const recoveredState = this.recoverFromLegacyKeys()
      if (recoveredState) {
        // Update with the session ID for future reference
        recoveredState.sessionId = sessionId
        this.saveBookingState(recoveredState)
        return recoveredState
      }
      
      console.warn('[BookingStateManager] Could not recover state for session:', sessionId)
      return null
      
    } catch (error) {
      console.error('[BookingStateManager] Error recovering by session ID:', error)
      return null
    }
  }
}

// Export singleton instance
export const bookingStateManager = new BookingStateManager()

// Export convenience functions
export const saveBookingState = (updates: Partial<BookingState>) => 
  bookingStateManager.saveBookingState(updates)

export const loadBookingState = () => 
  bookingStateManager.loadBookingState()

export const clearBookingState = () => 
  bookingStateManager.clearBookingState()

export const getBookingField = <K extends keyof BookingState>(field: K) => 
  bookingStateManager.getField(field)

export const setBookingField = <K extends keyof BookingState>(field: K, value: BookingState[K]) => 
  bookingStateManager.setField(field, value)

export const hasValidBookingState = () => 
  bookingStateManager.hasValidState()

export const getBookingSessionId = () => 
  bookingStateManager.getSessionId()

export const recoverBookingBySessionId = (sessionId: string) => 
  bookingStateManager.recoverBySessionId(sessionId)