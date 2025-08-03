import { validateEnvironment, getEnvConfig, env } from '@/lib/env-validation'

// Mock process.env
const originalEnv = process.env

describe('env-validation', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('validateEnvironment', () => {
    it('should pass validation with all required environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

      const config = validateEnvironment()

      expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(config.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test_anon_key')
      expect(config.SUPABASE_SERVICE_ROLE_KEY).toBe('test_service_role_key')
    })

    it('should throw error when required environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => validateEnvironment()).toThrow('Missing required environment variables')
    })

    it('should throw error when environment variables are empty strings', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key'

      expect(() => validateEnvironment()).toThrow('Missing required environment variables')
    })

    it('should throw error for invalid Supabase URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key'

      expect(() => validateEnvironment()).toThrow('is not a valid URL')
    })

    it('should throw error for placeholder values in keys', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your_anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key'

      expect(() => validateEnvironment()).toThrow('appear to be placeholder values')
    })

    it('should set default NODE_ENV to development', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
      delete process.env.NODE_ENV

      const config = validateEnvironment()

      expect(config.NODE_ENV).toBe('development')
    })

    it('should include optional environment variables when present', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.RESEND_API_KEY = 'resend_123'

      const config = validateEnvironment()

      expect(config.STRIPE_SECRET_KEY).toBe('sk_test_123')
      expect(config.RESEND_API_KEY).toBe('resend_123')
    })
  })

  describe('env object', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
      process.env.NODE_ENV = 'production'
    })

    it('should provide access to environment variables', () => {
      expect(env.SUPABASE_URL).toBe('https://test.supabase.co')
      expect(env.SUPABASE_ANON_KEY).toBe('test_anon_key')
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test_service_role_key')
      expect(env.NODE_ENV).toBe('production')
    })

    it('should correctly identify production environment', () => {
      expect(env.IS_PRODUCTION).toBe(true)
      expect(env.IS_DEVELOPMENT).toBe(false)
    })

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development'
      
      expect(env.IS_PRODUCTION).toBe(false)
      expect(env.IS_DEVELOPMENT).toBe(true)
    })
  })
})