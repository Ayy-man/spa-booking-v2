/**
 * Payment Flow Tests
 * 
 * Tests for the spa booking payment flow including:
 * - New vs existing customer payment options
 * - Payment link generation and validation
 * - Customer routing logic
 * - FastPayDirect integration
 */

import {
  getPaymentLink,
  hasFullPaymentLink,
  generatePaymentUrl,
  determinePaymentFlow,
  isValidPaymentUrl,
  DEPOSIT_PAYMENT_CONFIG,
  FULL_PAYMENT_LINKS,
  PaymentFlow
} from '@/lib/payment-config'

// Mock localStorage for browser environment tests
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('Payment Flow Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  describe('Payment Configuration', () => {
    test('should have valid deposit payment configuration', () => {
      expect(DEPOSIT_PAYMENT_CONFIG).toBeDefined()
      expect(DEPOSIT_PAYMENT_CONFIG.price).toBe(25.00)
      expect(DEPOSIT_PAYMENT_CONFIG.type).toBe('deposit')
      expect(DEPOSIT_PAYMENT_CONFIG.status).toBe('active')
      expect(isValidPaymentUrl(DEPOSIT_PAYMENT_CONFIG.paymentUrl)).toBe(true)
    })

    test('should have full payment links for all services', () => {
      expect(Object.keys(FULL_PAYMENT_LINKS).length).toBeGreaterThan(0)
      
      Object.values(FULL_PAYMENT_LINKS).forEach(paymentLink => {
        expect(paymentLink.type).toBe('full_payment')
        expect(paymentLink.status).toBe('active')
        expect(paymentLink.price).toBeGreaterThan(0)
        expect(isValidPaymentUrl(paymentLink.paymentUrl)).toBe(true)
      })
    })

    test('should get correct payment link for existing services', () => {
      const basicFacialLink = getPaymentLink('Basic Facial')
      expect(basicFacialLink).toBeDefined()
      expect(basicFacialLink.serviceName).toBe('Basic Facial')
      expect(basicFacialLink.price).toBe(65.00)
      expect(basicFacialLink.type).toBe('full_payment')

      const deepTissueLink = getPaymentLink('Deep Tissue Body Massage')
      expect(deepTissueLink).toBeDefined()
      expect(deepTissueLink.serviceName).toBe('Deep Tissue Body Massage')
      expect(deepTissueLink.price).toBe(90.00)
    })

    test('should return deposit fallback for unknown services', () => {
      const unknownServiceLink = getPaymentLink('Unknown Service')
      expect(unknownServiceLink).toEqual(DEPOSIT_PAYMENT_CONFIG)
    })

    test('should correctly identify services with full payment links', () => {
      expect(hasFullPaymentLink('Basic Facial')).toBe(true)
      expect(hasFullPaymentLink('Deep Tissue Body Massage')).toBe(true)
      expect(hasFullPaymentLink('Unknown Service')).toBe(false)
    })
  })

  describe('Payment URL Generation', () => {
    const baseUrl = 'https://link.fastpaydirect.com/payment-link/123'
    const returnUrl = 'https://spa.example.com/booking/confirmation'

    test('should generate payment URL with return URL', () => {
      const paymentUrl = generatePaymentUrl(baseUrl, returnUrl)
      
      expect(paymentUrl).toContain(baseUrl)
      expect(paymentUrl).toContain('return_url=')
      expect(paymentUrl).toContain(encodeURIComponent(returnUrl))
    })

    test('should generate payment URL with metadata', () => {
      const metadata = {
        service_name: 'Basic Facial',
        customer_email: 'test@example.com',
        payment_type: 'full',
        amount: '65.00'
      }

      const paymentUrl = generatePaymentUrl(baseUrl, returnUrl, metadata)
      
      expect(paymentUrl).toMatch(/service_name=Basic(\+|%20)Facial/)
      expect(paymentUrl).toContain('customer_email=test%40example.com')
      expect(paymentUrl).toContain('payment_type=full')
      expect(paymentUrl).toContain('amount=65.00')
    })

    test('should handle special characters in metadata', () => {
      const metadata = {
        service_name: 'Acne & Whitening Treatment',
        customer_email: 'user+test@example.com'
      }

      const paymentUrl = generatePaymentUrl(baseUrl, returnUrl, metadata)
      
      expect(paymentUrl).toContain('service_name=')
      expect(paymentUrl).toContain('customer_email=')
      // Ensure URL is still valid after encoding
      expect(() => new URL(paymentUrl)).not.toThrow()
    })
  })

  describe('Payment URL Validation', () => {
    test('should validate correct FastPayDirect URLs', () => {
      const validUrls = [
        'https://link.fastpaydirect.com/payment-link/123abc',
        'https://link.fastpaydirect.com/payment-link/688fda87d6ab800471e71642'
      ]

      validUrls.forEach(url => {
        expect(isValidPaymentUrl(url)).toBe(true)
      })
    })

    test('should reject invalid payment URLs', () => {
      const invalidUrls = [
        'https://example.com/payment',
        'https://wrong-domain.com/payment-link/123',
        'https://link.fastpaydirect.com/wrong-path/123',
        'not-a-url',
        ''
      ]

      invalidUrls.forEach(url => {
        expect(isValidPaymentUrl(url)).toBe(false)
      })
    })
  })

  describe('Payment Flow Determination', () => {
    test('should require deposit for new customers', () => {
      const flow = determinePaymentFlow(false, 'Basic Facial')
      expect(flow).toBe('deposit')
    })

    test('should offer choices for existing customers', () => {
      const flow = determinePaymentFlow(true, 'Basic Facial')
      expect(flow).toBe('existing_customer_choice')
    })

    test('should handle any service type for customer flow', () => {
      // New customers always get deposit regardless of service
      expect(determinePaymentFlow(false, 'Basic Facial')).toBe('deposit')
      expect(determinePaymentFlow(false, 'Hot Stone Massage')).toBe('deposit')
      expect(determinePaymentFlow(false, 'Unknown Service')).toBe('deposit')

      // Existing customers always get choice regardless of service
      expect(determinePaymentFlow(true, 'Basic Facial')).toBe('existing_customer_choice')
      expect(determinePaymentFlow(true, 'Hot Stone Massage')).toBe('existing_customer_choice')
      expect(determinePaymentFlow(true, 'Unknown Service')).toBe('existing_customer_choice')
    })
  })

  describe('Service-Specific Payment Links', () => {
    test('should have correct pricing for high-value services', () => {
      const expensiveServices = [
        { name: 'Hot Stone Massage', expectedPrice: 120.00 },
        { name: 'Vitamin C Facial', expectedPrice: 120.00 },
        { name: 'Acne Vulgaris Facial', expectedPrice: 120.00 },
        { name: 'Underarm/Inguinal Whitening', expectedPrice: 150.00 }
      ]

      expensiveServices.forEach(({ name, expectedPrice }) => {
        const paymentLink = getPaymentLink(name)
        expect(paymentLink.price).toBe(expectedPrice)
        expect(paymentLink.type).toBe('full_payment')
      })
    })

    test('should have correct pricing for standard services', () => {
      const standardServices = [
        { name: 'Basic Facial', expectedPrice: 65.00 },
        { name: 'Deep Cleansing Facial', expectedPrice: 79.00 },
        { name: 'Full Leg Waxing', expectedPrice: 80.00 },
        { name: 'Chemical Peel (Body)', expectedPrice: 85.00 }
      ]

      standardServices.forEach(({ name, expectedPrice }) => {
        const paymentLink = getPaymentLink(name)
        expect(paymentLink.price).toBe(expectedPrice)
        expect(paymentLink.type).toBe('full_payment')
      })
    })

    test('should maintain consistent service naming', () => {
      const serviceNames = Object.values(FULL_PAYMENT_LINKS).map(link => link.serviceName)
      
      // Check for duplicates
      const uniqueNames = new Set(serviceNames)
      expect(uniqueNames.size).toBe(serviceNames.length)

      // Check that all services have reasonable names
      serviceNames.forEach(name => {
        expect(name).toBeTruthy()
        expect(name.length).toBeGreaterThan(3)
        expect(name).not.toMatch(/^\s|\s$/) // No leading/trailing spaces
      })
    })
  })

  describe('Payment Configuration Consistency', () => {
    test('should have all payment links as active status', () => {
      Object.values(FULL_PAYMENT_LINKS).forEach(link => {
        expect(link.status).toBe('active')
      })
      expect(DEPOSIT_PAYMENT_CONFIG.status).toBe('active')
    })

    test('should have all payment URLs pointing to FastPayDirect', () => {
      Object.values(FULL_PAYMENT_LINKS).forEach(link => {
        expect(link.paymentUrl).toMatch(/^https:\/\/link\.fastpaydirect\.com\/payment-link\//)
      })
      expect(DEPOSIT_PAYMENT_CONFIG.paymentUrl).toMatch(/^https:\/\/link\.fastpaydirect\.com\/payment-link\//)
    })

    test('should have reasonable price ranges', () => {
      Object.values(FULL_PAYMENT_LINKS).forEach(link => {
        expect(link.price).toBeGreaterThanOrEqual(50.00) // Minimum service price
        expect(link.price).toBeLessThanOrEqual(200.00) // Maximum service price
      })
    })
  })
})