/**
 * Payment Links and FastPayDirect Integration Tests
 * 
 * Tests for payment URL generation, metadata handling, and FastPayDirect integration
 */

import {
  generatePaymentUrl,
  isValidPaymentUrl,
  getPaymentLink,
  DEPOSIT_PAYMENT_CONFIG,
  FULL_PAYMENT_LINKS
} from '@/lib/payment-config'

describe('Payment Links and FastPayDirect Integration', () => {
  const mockBaseUrl = 'https://spa.example.com'
  const mockSessionId = 'booking_1691234567_abc123def'
  
  describe('Payment URL Generation', () => {
    test('should generate complete payment URL for full payment', () => {
      const serviceName = 'Basic Facial'
      const customerEmail = 'customer@example.com'
      const paymentLink = getPaymentLink(serviceName)
      const returnUrl = `${mockBaseUrl}/booking/confirmation?payment=success&session=${mockSessionId}`
      
      const metadata = {
        service_name: serviceName,
        customer_email: customerEmail,
        payment_type: 'full',
        amount: paymentLink.price.toString()
      }

      const paymentUrl = generatePaymentUrl(paymentLink.paymentUrl, returnUrl, metadata)

      // Verify URL structure
      expect(paymentUrl).toMatch(/^https:\/\/link\.fastpaydirect\.com\/payment-link\/[a-f0-9]+/)
      expect(paymentUrl).toContain('return_url=')
      expect(paymentUrl).toContain('service_name=')
      expect(paymentUrl).toContain('customer_email=')
      expect(paymentUrl).toContain('payment_type=full')
      expect(paymentUrl).toContain('amount=65')
    })

    test('should generate complete payment URL for deposit payment', () => {
      const serviceName = 'Hot Stone Massage'
      const customerEmail = 'newcustomer@example.com'
      const returnUrl = `${mockBaseUrl}/booking/confirmation?payment=success&session=${mockSessionId}`
      
      const metadata = {
        service_name: serviceName,
        customer_email: customerEmail,
        payment_type: 'deposit'
      }

      const paymentUrl = generatePaymentUrl(DEPOSIT_PAYMENT_CONFIG.paymentUrl, returnUrl, metadata)

      expect(paymentUrl).toContain(DEPOSIT_PAYMENT_CONFIG.paymentUrl)
      expect(paymentUrl).toContain('return_url=')
      expect(paymentUrl).toContain('service_name=Hot%20Stone%20Massage')
      expect(paymentUrl).toContain('customer_email=newcustomer%40example.com')
      expect(paymentUrl).toContain('payment_type=deposit')
    })

    test('should properly encode special characters in URLs', () => {
      const specialService = 'Underarm/Inguinal Whitening'
      const specialEmail = 'user+test@spa-booking.com'
      const returnUrl = `${mockBaseUrl}/booking/confirmation?payment=success&session=${mockSessionId}`
      
      const paymentLink = getPaymentLink(specialService)
      const metadata = {
        service_name: specialService,
        customer_email: specialEmail,
        payment_type: 'full',
        special_chars: 'test with spaces & symbols!'
      }

      const paymentUrl = generatePaymentUrl(paymentLink.paymentUrl, returnUrl, metadata)

      expect(paymentUrl).toContain('service_name=Underarm%2FInguinal%20Whitening')
      expect(paymentUrl).toContain('customer_email=user%2Btest%40spa-booking.com')
      expect(paymentUrl).toContain('special_chars=test%20with%20spaces%20%26%20symbols!')
      
      // Ensure the URL is still valid after encoding
      expect(() => new URL(paymentUrl)).not.toThrow()
    })

    test('should handle return URLs with existing parameters', () => {
      const baseReturnUrl = `${mockBaseUrl}/booking/confirmation?existing=param&other=value`
      const paymentUrl = generatePaymentUrl(
        DEPOSIT_PAYMENT_CONFIG.paymentUrl, 
        baseReturnUrl, 
        { service_name: 'Test Service' }
      )

      expect(paymentUrl).toContain('return_url=')
      // The return URL should be properly encoded
      const url = new URL(paymentUrl)
      const returnUrlParam = url.searchParams.get('return_url')
      expect(returnUrlParam).toContain('existing=param')
      expect(returnUrlParam).toContain('other=value')
    })

    test('should generate URLs without metadata when none provided', () => {
      const baseUrl = FULL_PAYMENT_LINKS['basic-facial'].paymentUrl
      const returnUrl = `${mockBaseUrl}/booking/confirmation`
      
      const paymentUrl = generatePaymentUrl(baseUrl, returnUrl)

      expect(paymentUrl).toContain(baseUrl)
      expect(paymentUrl).toContain('return_url=')
      expect(paymentUrl.split('?')[1].split('&')).toHaveLength(1) // Only return_url parameter
    })
  })

  describe('Payment Link Validation', () => {
    test('should validate all configured payment links', () => {
      // Test all full payment links
      Object.values(FULL_PAYMENT_LINKS).forEach(link => {
        expect(isValidPaymentUrl(link.paymentUrl)).toBe(true)
      })

      // Test deposit payment link
      expect(isValidPaymentUrl(DEPOSIT_PAYMENT_CONFIG.paymentUrl)).toBe(true)
    })

    test('should reject invalid FastPayDirect URLs', () => {
      const invalidUrls = [
        'https://wrong-domain.com/payment-link/123',
        'https://link.fastpaydirect.com/wrong-path/123',
        'http://link.fastpaydirect.com/payment-link/123', // Wrong protocol
        'https://link.fastpaydirect.com/payment-link/', // Missing ID
        'not-a-url',
        '',
        null,
        undefined
      ]

      invalidUrls.forEach(url => {
        expect(isValidPaymentUrl(url as string)).toBe(false)
      })
    })

    test('should validate payment URLs with parameters', () => {
      const baseUrl = FULL_PAYMENT_LINKS['basic-facial'].paymentUrl
      const urlWithParams = `${baseUrl}?return_url=https://example.com&test=value`
      
      expect(isValidPaymentUrl(urlWithParams)).toBe(true)
    })
  })

  describe('Service-Specific Payment Links', () => {
    test('should generate correct payment URLs for high-value services', () => {
      const expensiveServices = [
        { name: 'Hot Stone Massage', expectedPrice: 120.00 },
        { name: 'Underarm/Inguinal Whitening', expectedPrice: 150.00 },
        { name: 'Vitamin C Facial', expectedPrice: 120.00 }
      ]

      expensiveServices.forEach(({ name, expectedPrice }) => {
        const paymentLink = getPaymentLink(name)
        const returnUrl = `${mockBaseUrl}/confirmation`
        const metadata = {
          service_name: name,
          payment_type: 'full',
          amount: expectedPrice.toString()
        }

        const paymentUrl = generatePaymentUrl(paymentLink.paymentUrl, returnUrl, metadata)

        expect(paymentUrl).toContain(`amount=${expectedPrice}`)
        expect(paymentUrl).toContain('payment_type=full')
        expect(isValidPaymentUrl(paymentLink.paymentUrl)).toBe(true)
      })
    })

    test('should handle service name mapping correctly', () => {
      const serviceVariations = [
        { input: 'Basic Facial', expected: 'basic-facial' },
        { input: 'Deep Tissue Body Massage', expected: 'deep-tissue-body-massage' },
        { input: 'Brazilian Wax (Women)', expected: 'brazilian-wax' }
      ]

      serviceVariations.forEach(({ input, expected }) => {
        const paymentLink = getPaymentLink(input)
        expect(paymentLink.type).toBe('full_payment')
        expect(paymentLink.serviceName).toBe(input)
        
        // Generate URL to ensure it works
        const paymentUrl = generatePaymentUrl(
          paymentLink.paymentUrl,
          `${mockBaseUrl}/confirmation`,
          { service_name: input }
        )
        expect(isValidPaymentUrl(paymentLink.paymentUrl)).toBe(true)
      })
    })
  })

  describe('Payment Metadata Handling', () => {
    test('should handle comprehensive metadata for full payments', () => {
      const comprehensiveMetadata = {
        service_name: 'Deep Tissue Body Massage',
        customer_email: 'customer@example.com',
        customer_name: 'John Doe',
        payment_type: 'full',
        amount: '90.00',
        booking_id: 'booking_123456',
        session_id: mockSessionId,
        timestamp: Date.now().toString(),
        staff_name: 'Jane Smith',
        appointment_date: '2024-08-07',
        appointment_time: '14:00'
      }

      const paymentLink = getPaymentLink('Deep Tissue Body Massage')
      const returnUrl = `${mockBaseUrl}/booking/confirmation`
      const paymentUrl = generatePaymentUrl(paymentLink.paymentUrl, returnUrl, comprehensiveMetadata)

      // Verify all metadata is included
      Object.entries(comprehensiveMetadata).forEach(([key, value]) => {
        expect(paymentUrl).toContain(`${key}=${encodeURIComponent(value)}`)
      })
    })

    test('should handle metadata with null and undefined values', () => {
      const metadataWithNulls = {
        service_name: 'Basic Facial',
        customer_email: 'test@example.com',
        optional_field: null,
        another_field: undefined,
        empty_field: '',
        valid_field: 'valid_value'
      }

      const paymentUrl = generatePaymentUrl(
        FULL_PAYMENT_LINKS['basic-facial'].paymentUrl,
        `${mockBaseUrl}/confirmation`,
        metadataWithNulls as any
      )

      expect(paymentUrl).toContain('service_name=Basic%20Facial')
      expect(paymentUrl).toContain('customer_email=test%40example.com')
      expect(paymentUrl).toContain('valid_field=valid_value')
      expect(paymentUrl).toContain('empty_field=')
      // Null and undefined values should still be included as strings
      expect(paymentUrl).toContain('optional_field=null')
      expect(paymentUrl).toContain('another_field=undefined')
    })

    test('should handle large metadata objects', () => {
      const largeMetadata: Record<string, string> = {}
      
      // Generate 50 metadata fields
      for (let i = 0; i < 50; i++) {
        largeMetadata[`field_${i}`] = `value_${i}_with_some_longer_text`
      }
      
      largeMetadata.service_name = 'Basic Facial'
      largeMetadata.customer_email = 'test@example.com'

      const paymentUrl = generatePaymentUrl(
        FULL_PAYMENT_LINKS['basic-facial'].paymentUrl,
        `${mockBaseUrl}/confirmation`,
        largeMetadata
      )

      // Should still be a valid URL
      expect(() => new URL(paymentUrl)).not.toThrow()
      expect(paymentUrl).toContain('service_name=Basic%20Facial')
      expect(paymentUrl).toContain('field_0=value_0')
      expect(paymentUrl).toContain('field_49=value_49')
    })
  })

  describe('Return URL Handling', () => {
    test('should handle complex return URLs correctly', () => {
      const complexReturnUrl = `${mockBaseUrl}/booking/confirmation?payment=success&session=${mockSessionId}&redirect=dashboard&timestamp=${Date.now()}`
      
      const paymentUrl = generatePaymentUrl(
        DEPOSIT_PAYMENT_CONFIG.paymentUrl,
        complexReturnUrl,
        { service_name: 'Test Service' }
      )

      const url = new URL(paymentUrl)
      const returnUrlParam = decodeURIComponent(url.searchParams.get('return_url') || '')
      
      expect(returnUrlParam).toBe(complexReturnUrl)
      expect(returnUrlParam).toContain('payment=success')
      expect(returnUrlParam).toContain(`session=${mockSessionId}`)
    })

    test('should handle return URLs with fragments', () => {
      const returnUrlWithFragment = `${mockBaseUrl}/booking/confirmation#success`
      
      const paymentUrl = generatePaymentUrl(
        DEPOSIT_PAYMENT_CONFIG.paymentUrl,
        returnUrlWithFragment,
        { service_name: 'Test Service' }
      )

      const url = new URL(paymentUrl)
      const returnUrlParam = url.searchParams.get('return_url')
      
      expect(returnUrlParam).toContain('#success')
    })

    test('should handle international domain return URLs', () => {
      const internationalReturnUrl = 'https://スパ.example.com/booking/confirmation'
      
      const paymentUrl = generatePaymentUrl(
        DEPOSIT_PAYMENT_CONFIG.paymentUrl,
        internationalReturnUrl,
        { service_name: 'International Test' }
      )

      // Should not throw and should contain encoded URL
      expect(() => new URL(paymentUrl)).not.toThrow()
      expect(paymentUrl).toContain('return_url=')
    })
  })

  describe('Payment URL Security', () => {
    test('should only accept HTTPS FastPayDirect URLs', () => {
      const httpUrl = 'http://link.fastpaydirect.com/payment-link/123'
      const httpsUrl = 'https://link.fastpaydirect.com/payment-link/123'
      
      expect(isValidPaymentUrl(httpUrl)).toBe(false)
      expect(isValidPaymentUrl(httpsUrl)).toBe(true)
    })

    test('should reject malicious URLs', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'https://evil.com/payment-link/123',
        'https://link.fastpaydirect.evil.com/payment-link/123',
        'https://linkfastpaydirect.com/payment-link/123'
      ]

      maliciousUrls.forEach(url => {
        expect(isValidPaymentUrl(url)).toBe(false)
      })
    })

    test('should handle URL parameter injection attempts', () => {
      const metadata = {
        service_name: 'Test Service',
        malicious_param: '&admin=true&delete_all=yes',
        another_attempt: 'value">&lt;script&gt;alert("xss")&lt;/script&gt;'
      }

      const paymentUrl = generatePaymentUrl(
        DEPOSIT_PAYMENT_CONFIG.paymentUrl,
        `${mockBaseUrl}/confirmation`,
        metadata
      )

      // Parameters should be properly encoded
      expect(paymentUrl).toContain('malicious_param=%26admin%3Dtrue%26delete_all%3Dyes')
      expect(paymentUrl).toContain('another_attempt=value%22%3E%26lt%3Bscript%26gt%3Balert(%22xss%22)%26lt%3B%2Fscript%26gt%3B')
      
      // Should still be a valid URL
      expect(() => new URL(paymentUrl)).not.toThrow()
    })
  })
})