'use client'

import { track } from '@vercel/analytics'

// Safe tracking function that won't break the app if analytics is blocked
const safeTrack = (event: string, properties?: any) => {
  try {
    track(event, properties)
  } catch (error) {
    // Silently fail if analytics is blocked by ad blockers
    console.debug('Analytics blocked:', error)
  }
}

// Custom analytics events for the booking flow
export const analytics = {
  // Service selection events
  serviceSelected: (serviceName: string, serviceCategory: string, price: number) => {
    safeTrack('service_selected', {
      service_name: serviceName,
      service_category: serviceCategory,
      price: price,
      timestamp: new Date().toISOString()
    })
  },

  // Date/time selection events
  dateTimeSelected: (date: string, time: string, serviceName: string) => {
    safeTrack('datetime_selected', {
      date: date,
      time: time,
      service_name: serviceName,
      timestamp: new Date().toISOString()
    })
  },

  // Staff selection events
  staffSelected: (staffName: string, serviceName: string) => {
    safeTrack('staff_selected', {
      staff_name: staffName,
      service_name: serviceName,
      timestamp: new Date().toISOString()
    })
  },

  // Customer info events
  customerInfoSubmitted: (isNewCustomer: boolean, hasPhone: boolean) => {
    safeTrack('customer_info_submitted', {
      is_new_customer: isNewCustomer,
      has_phone: hasPhone,
      timestamp: new Date().toISOString()
    })
  },

  // Booking confirmation events
  bookingConfirmed: (bookingId: string, totalPrice: number, serviceName: string, isCouples: boolean) => {
    safeTrack('booking_confirmed', {
      booking_id: bookingId,
      total_price: totalPrice,
      service_name: serviceName,
      is_couples: isCouples,
      timestamp: new Date().toISOString()
    })
  },

  // Payment events
  paymentInitiated: (isNewCustomer: boolean, amount: number) => {
    safeTrack('payment_initiated', {
      is_new_customer: isNewCustomer,
      amount: amount,
      timestamp: new Date().toISOString()
    })
  },

  // Error events
  bookingError: (errorType: string, errorMessage: string, step: string) => {
    safeTrack('booking_error', {
      error_type: errorType,
      error_message: errorMessage,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  // Navigation events
  pageViewed: (pageName: string, step: number) => {
    safeTrack('page_viewed', {
      page_name: pageName,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  // Couples booking events
  couplesBookingStarted: (primaryService: string, secondaryService: string, totalPrice: number) => {
    safeTrack('couples_booking_started', {
      primary_service: primaryService,
      secondary_service: secondaryService,
      total_price: totalPrice,
      timestamp: new Date().toISOString()
    })
  },

  // Form interaction events
  formFieldFocused: (fieldName: string, step: string) => {
    safeTrack('form_field_focused', {
      field_name: fieldName,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  formFieldCompleted: (fieldName: string, step: string) => {
    safeTrack('form_field_completed', {
      field_name: fieldName,
      step: step,
      timestamp: new Date().toISOString()
    })
  }
}

// Utility function for checking if a booking is a special staff request
export function isSpecialStaffRequest(booking: any): boolean {
  // Check if customer specifically requested this staff member
  // (as opposed to selecting "Any Available" which would be staff_id: 'any-available')
  return booking.staff_id !== 'any-available' && booking.staff_id !== null && booking.staff_id !== 'any'
}

// Performance tracking
export const performance = {
  // Track page load times
  pageLoadTime: (pageName: string, loadTime: number) => {
    safeTrack('page_load_time', {
      page_name: pageName,
      load_time_ms: loadTime,
      timestamp: new Date().toISOString()
    })
  },

  // Track API response times
  apiResponseTime: (endpoint: string, responseTime: number, success: boolean) => {
    safeTrack('api_response_time', {
      endpoint: endpoint,
      response_time_ms: responseTime,
      success: success,
      timestamp: new Date().toISOString()
    })
  },

  // Track booking flow completion time
  bookingFlowTime: (totalTime: number, stepsCompleted: number) => {
    safeTrack('booking_flow_time', {
      total_time_ms: totalTime,
      steps_completed: stepsCompleted,
      timestamp: new Date().toISOString()
    })
  }
}

// User behavior tracking
export const userBehavior = {
  // Track time spent on each step
  stepTimeSpent: (stepName: string, timeSpent: number) => {
    safeTrack('step_time_spent', {
      step_name: stepName,
      time_spent_ms: timeSpent,
      timestamp: new Date().toISOString()
    })
  },

  // Track back button usage
  backButtonClicked: (fromStep: string, toStep: string) => {
    safeTrack('back_button_clicked', {
      from_step: fromStep,
      to_step: toStep,
      timestamp: new Date().toISOString()
    })
  },

  // Track form validation errors
  formValidationError: (fieldName: string, errorType: string, step: string) => {
    safeTrack('form_validation_error', {
      field_name: fieldName,
      error_type: errorType,
      step: step,
      timestamp: new Date().toISOString()
    })
  }
}