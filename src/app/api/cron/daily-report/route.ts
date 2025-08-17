import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// This endpoint can be called by Vercel Cron or external schedulers
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/daily-report",
//     "schedule": "0 8 * * *"  // 8 UTC = 6pm Guam (UTC+10)
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = headers().get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's date in Guam timezone
    const guamTime = new Date()
    const utc = guamTime.getTime() + (guamTime.getTimezoneOffset() * 60000)
    const guamDate = new Date(utc + (3600000 * 10)) // UTC+10 for Guam
    const dateStr = guamDate.toISOString().split('T')[0]

    // Fetch the daily summary
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const summaryResponse = await fetch(`${baseUrl}/api/admin/daily-summary?date=${dateStr}`)
    
    if (!summaryResponse.ok) {
      throw new Error('Failed to fetch daily summary')
    }

    const summaryData = await summaryResponse.json()

    // Send to n8n webhook
    const webhookResponse = await fetch('https://primary-production-66f3.up.railway.app/webhook/bcab11df-b41a-42db-933b-0f187174ce35', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'daily_report',
        spa_name: 'Dermal Skin Care & Spa',
        recipient_email: 'happyskinhappyyou@gmail.com',
        report_date: summaryData.date,
        data: summaryData,
        timestamp: new Date().toISOString(),
        automated: true // Flag to indicate this was automated
      })
    })

    if (!webhookResponse.ok) {
      throw new Error('Failed to send webhook')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Daily report sent successfully',
      date: dateStr 
    })
  } catch (error) {
    console.error('Error in daily report cron:', error)
    return NextResponse.json(
      { error: 'Failed to send daily report' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}