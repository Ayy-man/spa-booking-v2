import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Check system health
    const { data: healthData, error: healthError } = await supabase.rpc('check_reminder_system_health')
    
    if (healthError) {
      console.error('Error checking system health:', healthError)
      return NextResponse.json(
        { error: 'Failed to check system health', details: healthError },
        { status: 500 }
      )
    }

    // Get recent bookings that need reminders
    const { data: pendingReminders, error: pendingError } = await supabase.rpc(
      'get_bookings_needing_reminder',
      { p_hours_before: 24, p_window_minutes: 120 }
    )

    if (pendingError) {
      console.error('Error fetching pending reminders:', pendingError)
    }

    // Get recent reminder activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('bookings')
      .select('id, appointment_date, start_time, reminder_sent_at, reminder_send_count')
      .not('reminder_sent_at', 'is', null)
      .gte('reminder_sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('reminder_sent_at', { ascending: false })
      .limit(10)

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
    }

    const health = healthData?.[0] || {}
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system_health: {
        total_confirmed_bookings: health.total_confirmed_bookings || 0,
        bookings_with_reminders: health.bookings_with_reminders || 0,
        bookings_needing_reminders: health.bookings_needing_reminders || 0,
        last_reminder_sent: health.last_reminder_sent,
        system_status: health.system_status || 'Unknown'
      },
      pending_reminders: pendingReminders?.length || 0,
      recent_activity: recentActivity?.length || 0,
      cron_configuration: {
        schedule: '0 9 * * *', // Daily at 9 AM
        endpoint: '/api/send-24hr-reminders',
        timezone: 'UTC',
        next_run: 'Tomorrow at 9:00 AM UTC'
      },
      recommendations: [
        health.bookings_needing_reminders > 0 ? 
          `⚠️ ${health.bookings_needing_reminders} bookings need reminders` : 
          '✅ All reminders are up to date',
        health.last_reminder_sent ? 
          `📅 Last reminder sent: ${new Date(health.last_reminder_sent).toLocaleString()}` : 
          '⚠️ No reminders have been sent yet'
      ]
    })

  } catch (error) {
    console.error('Cron health check error:', error)
    return NextResponse.json(
      { 
        error: 'Health check failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Manual trigger for testing
  try {
    const supabase = createServerClient()
    
    // Get bookings needing reminders
    const { data: bookings, error } = await supabase.rpc(
      'get_bookings_needing_reminder',
      { p_hours_before: 24, p_window_minutes: 120 }
    )

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Found ${bookings?.length || 0} bookings needing reminders`,
      bookings: bookings || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Manual trigger failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 