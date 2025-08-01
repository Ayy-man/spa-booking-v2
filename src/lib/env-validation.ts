// Environment variable validation
// This ensures all required environment variables are present at startup

interface EnvConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // Application Configuration (optional)
  NODE_ENV?: string
  
  // External Services (optional - may be added later)
  STRIPE_SECRET_KEY?: string
  RESEND_API_KEY?: string
  GOOGLE_ANALYTICS_ID?: string
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

export function validateEnvironment(): EnvConfig {
  const missingVars: string[] = []
  const config: Partial<EnvConfig> = {}

  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      missingVars.push(varName)
    } else {
      config[varName] = value
    }
  }

  // Check optional variables
  config.NODE_ENV = process.env.NODE_ENV || 'development'
  config.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  config.RESEND_API_KEY = process.env.RESEND_API_KEY
  config.GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID

  if (missingVars.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.\n` +
      `See env.example for reference.`
    )
    error.name = 'EnvironmentValidationError'
    throw error
  }

  // Validate URL format for Supabase URL
  try {
    new URL(config.NEXT_PUBLIC_SUPABASE_URL!)
  } catch (error) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${config.NEXT_PUBLIC_SUPABASE_URL}`)
  }

  // Validate Supabase keys are not placeholder values
  const placeholderPatterns = [
    'your_',
    'your-',
    'placeholder',
    'example',
    'test_key'
  ]

  for (const pattern of placeholderPatterns) {
    if (config.NEXT_PUBLIC_SUPABASE_ANON_KEY?.toLowerCase().includes(pattern) ||
        config.SUPABASE_SERVICE_ROLE_KEY?.toLowerCase().includes(pattern)) {
      throw new Error(
        'Supabase keys appear to be placeholder values. ' +
        'Please update your environment variables with actual Supabase keys.'
      )
    }
  }

  return config as EnvConfig
}

// Validate environment variables at module load (for server-side)
let envConfig: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    try {
      envConfig = validateEnvironment()
    } catch (error) {
      // Environment validation errors should be thrown for proper handling
      throw error
    }
  }
  return envConfig
}

// Export individual environment variables with validation
export const env = {
  get SUPABASE_URL() {
    return getEnvConfig().NEXT_PUBLIC_SUPABASE_URL
  },
  get SUPABASE_ANON_KEY() {
    return getEnvConfig().NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnvConfig().SUPABASE_SERVICE_ROLE_KEY
  },
  get NODE_ENV() {
    return getEnvConfig().NODE_ENV || 'development'
  },
  get IS_PRODUCTION() {
    return this.NODE_ENV === 'production'
  },
  get IS_DEVELOPMENT() {
    return this.NODE_ENV === 'development'
  }
}