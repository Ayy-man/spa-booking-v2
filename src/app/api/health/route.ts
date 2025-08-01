import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const { data: dbCheck, error: dbError } = await supabase
      .from('services')
      .select('count(*)')
      .limit(1)

    if (dbError) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Database connection failed',
        details: dbError.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }, { status: 503 })
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    )

    if (missingEnvVars.length > 0) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Missing environment variables',
        details: `Missing: ${missingEnvVars.join(', ')}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }, { status: 503 })
    }

    // All checks passed
    return NextResponse.json({
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'ok',
        environment: 'ok'
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      details: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    }, { status: 503 })
  }
}