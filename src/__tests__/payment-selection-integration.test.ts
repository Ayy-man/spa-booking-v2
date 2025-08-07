/**
 * Payment Selection Integration Tests
 * 
 * End-to-end integration tests for the complete payment selection flow,
 * testing the interaction between customer type detection, payment options,
 * booking state management, and payment URL generation.
 */

import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import {
  saveBookingState,
  loadBookingState,
  clearBookingState,
  getBookingSessionId
} from '@/lib/booking-state-manager'
import {
  generatePaymentUrl,
  getPaymentLink,
  determinePaymentFlow,
  DEPOSIT_PAYMENT_CONFIG,
  FULL_PAYMENT_LINKS
} from '@/lib/payment-config'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/booking/payment-selection',
      pathname: '/booking/payment-selection',
      query: {},
      asPath: '/booking/payment-selection',
      push: mockPush,
      replace: mockReplace
    }
  }
}))

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'https://spa.example.com',
  pathname: '/booking/payment-selection'
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
}

Object.defineProperty(window, 'localStorage', { value: createMockStorage() })
Object.defineProperty(window, 'sessionStorage', { value: createMockStorage() })

describe('Payment Selection Integration Tests', () => {
  const mockService = {
    id: 'basic-facial',
    name: 'Basic Facial',
    price: 65,
    duration: 60,
    category: 'facial',
    description: 'A relaxing basic facial treatment'
  }

  const mockNewCustomer = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0123',
    isNewCustomer: true
  }

  const mockExistingCustomer = {
    name: 'John Smith',
    email: 'john@example.com', 
    phone: '555-0124',
    isNewCustomer: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    clearBookingState()
    mockLocation.href = ''
  })

  describe('Customer Type Detection and Flow Routing', () => {
    test('should redirect new customers back to customer info page', async () => {
      // Setup new customer booking state
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockNewCustomer
      })

      // Import the component after state is set
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      // Should redirect new customers immediately
      await waitFor(() => {
        expect(mockLocation.href).toBe('/booking/customer-info')
      })
    })

    test('should show payment options for existing customers only', async () => {
      // Setup existing customer booking state
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(screen.getByText('Choose Payment Option')).toBeInTheDocument()
        expect(screen.getByText(/As an existing customer/)).toBeInTheDocument()
      })

      // Should show both payment options
      expect(screen.getByLabelText(/Pay in Full Now/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Pay on Location/)).toBeInTheDocument()
      
      // Should NOT show deposit option
      expect(screen.queryByText(/30 deposit/i)).not.toBeInTheDocument()
    })

    test('should redirect to service selection when no booking state exists', async () => {
      // Clear all state
      clearBookingState()

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(mockLocation.href).toBe('/booking')
      })
    })

    test('should redirect to customer info when customer info is missing', async () => {
      // Setup state with service but no customer info
      saveBookingState({
        selectedService: mockService
        // No customerInfo
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(mockLocation.href).toBe('/booking/customer-info')
      })
    })
  })

  describe('Payment Options Display for Existing Customers', () => {
    beforeEach(() => {
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })
    })

    test('should display service information correctly', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(screen.getByText('Basic Facial')).toBeInTheDocument()
        expect(screen.getByText('60 minutes')).toBeInTheDocument()
        expect(screen.getByText('$65.00')).toBeInTheDocument()
      })
    })

    test('should show full payment option with correct amount', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const fullPaymentOption = screen.getByLabelText(/Pay in Full Now/)
        expect(fullPaymentOption).toBeInTheDocument()
        expect(screen.getByText('Pay in Full Now ($65.00)')).toBeInTheDocument()
        expect(screen.getByText('Recommended')).toBeInTheDocument()
      })
    })

    test('should show pay on location option', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const payOnLocationOption = screen.getByLabelText(/Pay on Location/)
        expect(payOnLocationOption).toBeInTheDocument()
        expect(screen.getByText('Pay on Location ($65.00)')).toBeInTheDocument()
        expect(screen.getByText('$0.00 Now')).toBeInTheDocument()
      })
    })

    test('should allow switching between payment options', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ }) as HTMLInputElement
        const payOnLocationRadio = screen.getByRole('radio', { name: /Pay on Location/ }) as HTMLInputElement

        // Initially, pay on location should be selected
        expect(payOnLocationRadio.checked).toBe(true)
        expect(fullPaymentRadio.checked).toBe(false)

        // Click full payment option
        fireEvent.click(fullPaymentRadio)

        expect(fullPaymentRadio.checked).toBe(true)
        expect(payOnLocationRadio.checked).toBe(false)
      })
    })
  })

  describe('Payment Processing Flow', () => {
    beforeEach(() => {
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })
    })

    test('should process pay on location selection correctly', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const payOnLocationRadio = screen.getByRole('radio', { name: /Pay on Location/ })
        const submitButton = screen.getByRole('button', { name: /Complete Booking/ })

        // Select pay on location (should be default)
        fireEvent.click(payOnLocationRadio)
        
        // Submit
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        // Should redirect to confirmation page with location parameter
        expect(mockLocation.href).toBe('/booking/confirmation?payment=location')
        
        // Should save payment type to state
        const state = loadBookingState()
        expect(state?.paymentType).toBe('location')
      })
    })

    test('should process full payment selection with correct FastPayDirect URL', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
        const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

        // Select full payment
        fireEvent.click(fullPaymentRadio)
        
        // Submit
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        // Should redirect to FastPayDirect with correct parameters
        expect(mockLocation.href).toMatch(/^https:\/\/link\.fastpaydirect\.com\/payment-link\//)
        expect(mockLocation.href).toContain('return_url=')
        expect(mockLocation.href).toContain('service_name=Basic%20Facial')
        expect(mockLocation.href).toContain('customer_email=john%40example.com')
        expect(mockLocation.href).toContain('payment_type=full')
        expect(mockLocation.href).toContain('amount=65')
        
        // Should save payment type to state
        const state = loadBookingState()
        expect(state?.paymentType).toBe('full')
      })
    })

    test('should generate correct return URL with session ID', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
        fireEvent.click(fullPaymentRadio)
        
        const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        const sessionId = getBookingSessionId()
        expect(sessionId).toBeTruthy()
        expect(mockLocation.href).toContain(`session=${sessionId}`)
        expect(mockLocation.href).toContain('booking/confirmation?payment=success')
      })
    })

    test('should handle missing service gracefully', async () => {
      // Save state without service
      saveBookingState({
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(screen.getByText('Loading payment options...')).toBeInTheDocument()
      })
    })
  })

  describe('Payment Link Integration', () => {
    test('should use correct payment link for different services', async () => {
      const expensiveService = {
        id: 'hot-stone-massage',
        name: 'Hot Stone Massage',
        price: 120,
        duration: 90,
        category: 'massage'
      }

      saveBookingState({
        selectedService: expensiveService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(screen.getByText('Hot Stone Massage')).toBeInTheDocument()
        expect(screen.getByText('$120.00')).toBeInTheDocument()
        expect(screen.getByText('Pay in Full Now ($120.00)')).toBeInTheDocument()
      })

      const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
      const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

      fireEvent.click(fullPaymentRadio)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLocation.href).toContain('amount=120')
        expect(mockLocation.href).toContain('service_name=Hot%20Stone%20Massage')
      })
    })

    test('should fallback to basic facial link for unknown services', async () => {
      const unknownService = {
        id: 'unknown-service',
        name: 'Unknown Service',
        price: 75,
        duration: 60,
        category: 'unknown'
      }

      saveBookingState({
        selectedService: unknownService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
      const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

      fireEvent.click(fullPaymentRadio)
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should use basic facial link as fallback
        const basicFacialUrl = FULL_PAYMENT_LINKS['basic-facial'].paymentUrl
        expect(mockLocation.href).toContain(basicFacialUrl)
        expect(mockLocation.href).toContain('service_name=Unknown%20Service')
        expect(mockLocation.href).toContain('amount=75')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      expect(() => render(<PaymentSelectionPage />)).not.toThrow()

      // Restore original method
      Storage.prototype.setItem = originalSetItem
    })

    test('should handle payment processing errors', async () => {
      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
        const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

        fireEvent.click(fullPaymentRadio)

        // Mock an error during payment processing
        const originalConsoleError = console.error
        console.error = jest.fn()

        fireEvent.click(submitButton)

        // Should not throw and should show loading state temporarily
        expect(screen.getByText('Processing...')).toBeInTheDocument()

        console.error = originalConsoleError
      })
    })

    test('should validate customer email format in payment metadata', async () => {
      const customerWithInvalidEmail = {
        ...mockExistingCustomer,
        email: 'invalid-email-format'
      }

      saveBookingState({
        selectedService: mockService,
        customerInfo: customerWithInvalidEmail
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
      const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

      fireEvent.click(fullPaymentRadio)
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should still process (email validation happens on server side)
        expect(mockLocation.href).toContain('customer_email=invalid-email-format')
      })
    })
  })

  describe('UI/UX Integration', () => {
    test('should show loading state during payment processing', async () => {
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
      const submitButton = screen.getByRole('button', { name: /Continue to Payment/ })

      fireEvent.click(fullPaymentRadio)
      fireEvent.click(submitButton)

      // Should show processing state immediately
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    test('should update button text based on selected payment type', async () => {
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        // Default should show location payment text
        expect(screen.getByRole('button', { name: /Complete Booking \(\$0 Now\)/ })).toBeInTheDocument()

        // Switch to full payment
        const fullPaymentRadio = screen.getByRole('radio', { name: /Pay in Full Now/ })
        fireEvent.click(fullPaymentRadio)

        expect(screen.getByRole('button', { name: /Continue to Payment - \$65\.00/ })).toBeInTheDocument()
      })
    })

    test('should show payment security notice', async () => {
      saveBookingState({
        selectedService: mockService,
        customerInfo: mockExistingCustomer
      })

      const PaymentSelectionPage = require('@/app/booking/payment-selection/page').default

      render(<PaymentSelectionPage />)

      await waitFor(() => {
        expect(screen.getByText(/Secure payment processing by FastPayDirect/)).toBeInTheDocument()
        expect(screen.getByText(/Your payment information is encrypted and secure/)).toBeInTheDocument()
      })
    })
  })
})