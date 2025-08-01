/**
 * Unit tests for environment validation functions
 * Tests environment variable validation with success and failure scenarios
 */

import { validateEnvironment, getEnvConfig } from '../env-validation'

// Mock process.env for testing
const originalEnv = process.env

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('validateEnvironment', () => {
    describe('Success Cases', () => {
      it('should validate successfully with all required variables', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
        }

        const result = validateEnvironment()

        expect(result).toEqual({
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
          NODE_ENV: expect.any(String),
          STRIPE_SECRET_KEY: undefined,
          RESEND_API_KEY: undefined,
          GOOGLE_ANALYTICS_ID: undefined
        })
      })

      it('should include optional variables when present', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
          NODE_ENV: 'production',
          STRIPE_SECRET_KEY: 'sk_test_12345',
          RESEND_API_KEY: 're_12345',
          GOOGLE_ANALYTICS_ID: 'GA-12345'
        }

        const result = validateEnvironment()

        expect(result.NODE_ENV).toBe('production')
        expect(result.STRIPE_SECRET_KEY).toBe('sk_test_12345')
        expect(result.RESEND_API_KEY).toBe('re_12345')
        expect(result.GOOGLE_ANALYTICS_ID).toBe('GA-12345')
      })

      it('should use development as default NODE_ENV', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
        }
        delete process.env.NODE_ENV

        const result = validateEnvironment()

        expect(result.NODE_ENV).toBe('development')
      })

      it('should accept various valid Supabase URL formats', () => {
        const validUrls = [
          'https://abcdefgh.supabase.co',
          'https://project-123.supabase.co',
          'https://my-project.supabase.co',
          'https://localhost:54321', // Local development
          'http://localhost:8000' // Local development HTTP
        ]

        validUrls.forEach(url => {
          process.env = {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: url,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid_key_12345',
            SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
          }

          expect(() => validateEnvironment()).not.toThrow()
        })
      })
    })

    describe('Failure Cases - Missing Required Variables', () => {
      it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
        }
        delete process.env.NEXT_PUBLIC_SUPABASE_URL

        expect(() => validateEnvironment()).toThrow(/Missing required environment variables.*NEXT_PUBLIC_SUPABASE_URL/)
      })

      it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
        }
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        expect(() => validateEnvironment()).toThrow(/Missing required environment variables.*NEXT_PUBLIC_SUPABASE_ANON_KEY/)
      })

      it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
        }
        delete process.env.SUPABASE_SERVICE_ROLE_KEY

        expect(() => validateEnvironment()).toThrow(/Missing required environment variables.*SUPABASE_SERVICE_ROLE_KEY/)
      })

      it('should throw error when multiple required variables are missing', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co'
        }
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        delete process.env.SUPABASE_SERVICE_ROLE_KEY

        const error = () => validateEnvironment()
        expect(error).toThrow(/Missing required environment variables/)
        expect(error).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
        expect(error).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
      })

      it('should throw error when variables are empty strings', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: '',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: '   ',
          SUPABASE_SERVICE_ROLE_KEY: '\t\n'
        }

        expect(() => validateEnvironment()).toThrow(/Missing required environment variables/)
      })

      it('should include helpful error message with reference to env.example', () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL

        try {
          validateEnvironment()
        } catch (error: any) {
          expect(error.message).toContain('Please check your .env.local file')
          expect(error.message).toContain('See env.example for reference')
          expect(error.name).toBe('EnvironmentValidationError')
        }
      })
    })

    describe('Failure Cases - Invalid URL Format', () => {
      it('should throw error for invalid URL format', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'invalid-url-format',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
        }

        expect(() => validateEnvironment()).toThrow(/NEXT_PUBLIC_SUPABASE_URL is not a valid URL/)
      })

      it('should throw error for malformed URLs', () => {
        const invalidUrls = [
          'not-a-url',
          'http://',
          'https://',
          'ftp://example.com',
          '://missing-protocol.com',
          'https://spaces in url.com'
        ]

        invalidUrls.forEach(url => {
          process.env = {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: url,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid_key',
            SUPABASE_SERVICE_ROLE_KEY: 'valid_service_key'
          }

          expect(() => validateEnvironment()).toThrow(/not a valid URL/)
        })
      })
    })

    describe('Failure Cases - Placeholder Values', () => {
      it('should throw error for placeholder anon key values', () => {
        const placeholderKeys = [
          'your_supabase_anon_key',
          'your-project-key',
          'placeholder_key',
          'example_key',
          'test_key_replace_me'
        ]

        placeholderKeys.forEach(key => {
          process.env = {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
            SUPABASE_SERVICE_ROLE_KEY: 'valid_service_key'
          }

          expect(() => validateEnvironment()).toThrow(/Supabase keys appear to be placeholder values/)
        })
      })

      it('should throw error for placeholder service role key values', () => {
        const placeholderKeys = [
          'your_service_role_key',
          'your-service-key',
          'placeholder_service_key',
          'example_service_key',
          'test_key_replace'
        ]

        placeholderKeys.forEach(key => {
          process.env = {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid_anon_key',
            SUPABASE_SERVICE_ROLE_KEY: key
          }

          expect(() => validateEnvironment()).toThrow(/Supabase keys appear to be placeholder values/)
        })
      })

      it('should be case insensitive for placeholder detection', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_KEY',
          SUPABASE_SERVICE_ROLE_KEY: 'PLACEHOLDER_VALUE'
        }

        expect(() => validateEnvironment()).toThrow(/Supabase keys appear to be placeholder values/)
      })

      it('should provide helpful error message for placeholder values', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your_key_here',
          SUPABASE_SERVICE_ROLE_KEY: 'valid_service_key'
        }

        try {
          validateEnvironment()
        } catch (error: any) {
          expect(error.message).toContain('Please update your environment variables with actual Supabase keys')
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle environment variables with extra whitespace', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: '  https://example.supabase.co  ',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: '\teyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test\n',
          SUPABASE_SERVICE_ROLE_KEY: '  service_role_key_test_12345  '
        }

        // Should trim whitespace and validate successfully
        expect(() => validateEnvironment()).not.toThrow()
      })

      it('should handle very long environment variable values', () => {
        const longKey = 'eyJ' + 'a'.repeat(1000) + 'valid_ending'
        
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: longKey,
          SUPABASE_SERVICE_ROLE_KEY: 'service_' + 'b'.repeat(500) + '_key'
        }

        expect(() => validateEnvironment()).not.toThrow()
      })

      it('should handle special characters in environment values', () => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://test-project_123.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGci.special-chars_123.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role-key.test_123'
        }

        expect(() => validateEnvironment()).not.toThrow()
      })
    })
  })

  describe('getEnvConfig', () => {
    it('should cache environment config on first call', () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
      }

      const config1 = getEnvConfig()
      const config2 = getEnvConfig()

      expect(config1).toBe(config2) // Should return same object reference (cached)
    })

    it('should throw error and log when validation fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => getEnvConfig()).toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Environment validation failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should provide getter access to individual env variables', () => {
      // Import the env object from the module
      const envModule = require('../env-validation')
      
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
        NODE_ENV: 'production'
      }

      expect(envModule.env.SUPABASE_URL).toBe('https://example.supabase.co')
      expect(envModule.env.SUPABASE_ANON_KEY).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test')
      expect(envModule.env.SUPABASE_SERVICE_ROLE_KEY).toBe('service_role_key_test_12345')
      expect(envModule.env.NODE_ENV).toBe('production')
      expect(envModule.env.IS_PRODUCTION).toBe(true)
      expect(envModule.env.IS_DEVELOPMENT).toBe(false)
    })

    it('should handle development environment flags correctly', () => {
      const envModule = require('../env-validation')
      
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
        NODE_ENV: 'development'
      }

      expect(envModule.env.IS_PRODUCTION).toBe(false)
      expect(envModule.env.IS_DEVELOPMENT).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should provide detailed error information for debugging', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      try {
        validateEnvironment()
      } catch (error: any) {
        expect(error.name).toBe('EnvironmentValidationError')
        expect(error.message).toContain('Missing required environment variables')
        expect(error.message).toContain('NEXT_PUBLIC_SUPABASE_URL')
        expect(error.message).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        expect(error.message).toContain('Please check your .env.local file')
        expect(error.message).toContain('See env.example for reference')
      }
    })

    it('should handle concurrent validation calls gracefully', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345'
      }

      const promises = Array(10).fill(null).map(() => 
        Promise.resolve().then(() => getEnvConfig())
      )

      const results = await Promise.all(promises)
      
      // All results should be identical (cached)
      results.forEach(result => {
        expect(result).toEqual(results[0])
      })
    })
  })

  describe('Integration with Next.js Environment', () => {
    it('should work correctly in different Next.js environments', () => {
      const environments = ['development', 'production', 'test']
      
      environments.forEach(env => {
        process.env = {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
          NODE_ENV: env
        }

        const result = validateEnvironment()
        expect(result.NODE_ENV).toBe(env)
      })
    })

    it('should handle Next.js public variable prefixing correctly', () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_test_12345',
        SUPABASE_URL: 'should-not-be-used', // Without NEXT_PUBLIC_ prefix
        SUPABASE_ANON_KEY: 'should-not-be-used' // Without NEXT_PUBLIC_ prefix
      }

      const result = validateEnvironment()
      
      // Should use NEXT_PUBLIC_ prefixed versions
      expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
      expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test')
    })
  })
})