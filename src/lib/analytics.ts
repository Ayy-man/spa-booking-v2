'use client'

import { track } from '@vercel/analytics'

// Custom analytics events for the booking flow
export const analytics = {
  // Service selection events
  serviceSelected: (serviceName: string, serviceCategory: string, price: number) => {
    track('service_selected', {
      service_name: serviceName,
      service_category: serviceCategory,
      price: price,
      timestamp: new Date().toISOString()
    })
  },

  // Date/time selection events
  dateTimeSelected: (date: string, time: string, serviceName: string) => {
    track('datetime_selected', {
      date: date,
      time: time,
      service_name: serviceName,
      timestamp: new Date().toISOString()
    })
  },

  // Staff selection events
  staffSelected: (staffName: string, serviceName: string) => {
    track('staff_selected', {
      staff_name: staffName,
      service_name: serviceName,
      timestamp: new Date().toISOString()
    })
  },

  // Customer info events
  customerInfoSubmitted: (isNewCustomer: boolean, hasPhone: boolean) => {
    track('customer_info_submitted', {
      is_new_customer: isNewCustomer,
      has_phone: hasPhone,
      timestamp: new Date().toISOString()
    })
  },

  // Booking confirmation events
  bookingConfirmed: (bookingId: string, totalPrice: number, serviceName: string, isCouples: boolean) => {
    track('booking_confirmed', {
      booking_id: bookingId,
      total_price: totalPrice,
      service_name: serviceName,
      is_couples: isCouples,
      timestamp: new Date().toISOString()
    })
  },

  // Payment events
  paymentInitiated: (isNewCustomer: boolean, amount: number) => {
    track('payment_initiated', {
      is_new_customer: isNewCustomer,
      amount: amount,
      timestamp: new Date().toISOString()
    })
  },

  // Error events
  bookingError: (errorType: string, errorMessage: string, step: string) => {
    track('booking_error', {
      error_type: errorType,
      error_message: errorMessage,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  // Navigation events
  pageViewed: (pageName: string, step: number) => {
    track('page_viewed', {
      page_name: pageName,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  // Couples booking events
  couplesBookingStarted: (primaryService: string, secondaryService: string, totalPrice: number) => {
    track('couples_booking_started', {
      primary_service: primaryService,
      secondary_service: secondaryService,
      total_price: totalPrice,
      timestamp: new Date().toISOString()
    })
  },

  // Form interaction events
  formFieldFocused: (fieldName: string, step: string) => {
    track('form_field_focused', {
      field_name: fieldName,
      step: step,
      timestamp: new Date().toISOString()
    })
  },

  formFieldCompleted: (fieldName: string, step: string) => {
    track('form_field_completed', {
      field_name: fieldName,
      step: step,
      timestamp: new Date().toISOString()
    })
  }
}

// Performance tracking
export const performance = {
  // Track page load times
  pageLoadTime: (pageName: string, loadTime: number) => {
    track('page_load_time', {
      page_name: pageName,
      load_time_ms: loadTime,
      timestamp: new Date().toISOString()
    })
  },

  // Track API response times
  apiResponseTime: (endpoint: string, responseTime: number, success: boolean) => {
    track('api_response_time', {
      endpoint: endpoint,
      response_time_ms: responseTime,
      success: success,
      timestamp: new Date().toISOString()
    })
  },

  // Track booking flow completion time
  bookingFlowTime: (totalTime: number, stepsCompleted: number) => {
    track('booking_flow_time', {
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
    track('step_time_spent', {
      step_name: stepName,
      time_spent_ms: timeSpent,
      timestamp: new Date().toISOString()
    })
  },

  // Track back button usage
  backButtonClicked: (fromStep: string, toStep: string) => {
    track('back_button_clicked', {
      from_step: fromStep,
      to_step: toStep,
      timestamp: new Date().toISOString()
    })
  },

  // Track form validation errors
  formValidationError: (fieldName: string, errorType: string, step: string) => {
    track('form_validation_error', {
      field_name: fieldName,
      error_type: errorType,
      step: step,
      timestamp: new Date().toISOString()
    })
  }
}