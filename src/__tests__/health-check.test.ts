import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [{ count: 5 }], error: null })
  }
}))

// Mock process.env
const originalEnv = process.env

describe('/api/health', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should return healthy status when all checks pass', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
    process.env.NODE_ENV = 'production'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database).toBe('ok')
    expect(data.checks.environment).toBe('ok')
    expect(data.environment).toBe('production')
    expect(typeof data.uptime).toBe('number')
    expect(typeof data.responseTime).toBe('number')
  })

  it('should return unhealthy status when database check fails', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.limit.mockResolvedValue({ data: null, error: { message: 'Connection failed' } })

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBe('Database connection failed')
    expect(data.details).toBe('Connection failed')
  })

  it('should return unhealthy status when environment variables are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBe('Missing environment variables')
    expect(data.details).toContain('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('should handle unexpected errors gracefully', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.from.mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBe('Health check failed')
    expect(data.details).toBe('Unexpected error')
  })

  it('should include version information when available', async () => {
    process.env.npm_package_version = '2.1.0'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

    const response = await GET()
    const data = await response.json()

    expect(data.version).toBe('2.1.0')
  })

  it('should use default version when npm_package_version is not available', async () => {
    delete process.env.npm_package_version
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

    const response = await GET()
    const data = await response.json()

    expect(data.version).toBe('1.0.0')
  })
})