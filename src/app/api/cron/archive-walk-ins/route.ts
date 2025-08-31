import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// This endpoint runs daily at midnight Guam time to archive old walk-ins
// Configured in vercel.json to run at 14:00 UTC (midnight in Guam, UTC+10)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = headers().get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Walk-in Archiver] Starting daily archive process...')

    // Call the database function to archive old walk-ins
    const { data, error } = await supabase.rpc('archive_old_walk_ins')

    if (error) {
      console.error('[Walk-in Archiver] Error archiving walk-ins:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      )
    }

    const archivedCount = data || 0
    console.log(`[Walk-in Archiver] Successfully archived ${archivedCount} walk-in(s)`)

    // Get summary of archived records for logging
    const guamToday = new Date()
    guamToday.setHours(guamToday.getHours() + 10) // Approximate Guam time
    const todayStr = guamToday.toISOString().split('T')[0]

    // Get counts by status for reporting
    const { data: statusCounts, error: countError } = await supabase
      .from('walk_ins')
      .select('status', { count: 'exact', head: false })
      .not('archived_at', 'is', null)
      .gte('archived_at', new Date(Date.now() - 60000).toISOString()) // Last minute

    const summary = statusCounts?.reduce((acc: any, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {}) || {}

    // Log the archive operation
    const logEntry = {
      type: 'walk_in_archive',
      archived_count: archivedCount,
      status_breakdown: summary,
      timestamp: new Date().toISOString(),
      guam_date: todayStr
    }

    console.log('[Walk-in Archiver] Archive summary:', logEntry)

    // Optionally send to webhook for monitoring/alerting
    if (process.env.WEBHOOK_URL && archivedCount > 0) {
      try {
        await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'walk_in_archive_report',
            spa_name: 'Dermal Skin Care & Spa',
            ...logEntry
          })
        })
      } catch (webhookError) {
        console.error('[Walk-in Archiver] Failed to send webhook:', webhookError)
        // Don't fail the cron job if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      archived_count: archivedCount,
      status_breakdown: summary,
      timestamp: new Date().toISOString(),
      message: `Successfully archived ${archivedCount} walk-in record(s)`
    })

  } catch (error: any) {
    console.error('[Walk-in Archiver] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'walk-in-archiver',
    timestamp: new Date().toISOString()
  })
}