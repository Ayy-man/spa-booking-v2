import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { format } from 'date-fns'

// Webhook URL for 24-hour reminders
const REMINDER_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/95mKGfnKeJoUlG853dqQ/webhook-trigger/41ef86e6-ff01-4182-80c0-0552994fe56c'

// Helper function to format time
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

// Helper function to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return format(date, 'EEEE, MMMM d, yyyy')
}

export async function POST(request: Request) {
  try {
    // Verify authorization (you might want to add a secret key check here)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'your-cron-secret'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Get bookings that need 24-hour reminders
    const { data: bookings, error: bookingsError } = await supabase.rpc(
      'get_bookings_needing_reminder',
      { p_hours_before: 24, p_window_minutes: 60 }
    )

    if (bookingsError) {
      console.error('Error fetching bookings for reminders:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError },
        { status: 500 }
      )
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings need reminders at this time',
        processed: 0
      })
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Process each booking
    for (const booking of bookings) {
      try {
        // Fetch complete booking details with relations
        const { data: fullBooking, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            customer:customers(*),
            service:services(*),
            staff:staff(*),
            room:rooms(*)
          `)
          .eq('id', booking.booking_id)
          .single()

        if (fetchError || !fullBooking) {
          console.error(`Failed to fetch full booking details for ${booking.booking_id}:`, fetchError)
          failureCount++
          results.push({
            booking_id: booking.booking_id,
            success: false,
            error: 'Failed to fetch booking details'
          })
          continue
        }

        // Prepare webhook payload
        const payload = {
          event_type: "appointment_reminder_24hr",
          booking: {
            id: fullBooking.id,
            appointment_date: fullBooking.appointment_date,
            start_time: fullBooking.start_time,
            end_time: fullBooking.end_time,
            duration: fullBooking.duration,
            status: fullBooking.status,
            payment_status: fullBooking.payment_status,
            total_price: fullBooking.total_price,
            final_price: fullBooking.final_price,
            notes: fullBooking.notes,
            booking_type: fullBooking.booking_type
          },
          customer: {
            id: fullBooking.customer?.id,
            first_name: fullBooking.customer?.first_name,
            last_name: fullBooking.customer?.last_name,
            email: fullBooking.customer?.email,
            phone: fullBooking.customer?.phone,
            full_name: `${fullBooking.customer?.first_name || ''} ${fullBooking.customer?.last_name || ''}`.trim()
          },
          service: {
            id: fullBooking.service?.id,
            name: fullBooking.service?.name,
            category: fullBooking.service?.category,
            duration: fullBooking.service?.duration,
            price: fullBooking.service?.price,
            description: fullBooking.service?.description
          },
          staff: {
            id: fullBooking.staff?.id,
            name: fullBooking.staff?.name,
            email: fullBooking.staff?.email,
            role: fullBooking.staff?.role
          },
          room: {
            id: fullBooking.room?.id,
            name: fullBooking.room?.name,
            capacity: fullBooking.room?.capacity
          },
          appointment_details: {
            date_formatted: formatDate(fullBooking.appointment_date),
            time_formatted: `${formatTime(fullBooking.start_time)} - ${formatTime(fullBooking.end_time)}`,
            time_until_appointment: `${Math.round(booking.hours_until_appointment)} hours`,
            reminder_sent_at: new Date().toISOString()
          },
          business: {
            name: process.env.NEXT_PUBLIC_CLINIC_NAME || "Dermal Skin Clinic and Spa Guam",
            phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || "(671) 647-7546",
            address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || "123 Marine Corps Dr, Tamuning, GU 96913",
            booking_url: process.env.NEXT_PUBLIC_APP_URL || "https://booking.dermalguam.com"
          }
        }

        // Send webhook
        const webhookResponse = await fetch(REMINDER_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        if (webhookResponse.ok) {
          // Mark reminder as sent
          const { error: updateError } = await supabase.rpc('mark_reminder_sent', {
            p_booking_id: booking.booking_id
          })

          if (updateError) {
            console.error(`Failed to mark reminder as sent for ${booking.booking_id}:`, updateError)
          }

          successCount++
          results.push({
            booking_id: booking.booking_id,
            success: true,
            customer: fullBooking.customer.email,
            appointment: `${fullBooking.appointment_date} ${fullBooking.start_time}`
          })
        } else {
          failureCount++
          const errorText = await webhookResponse.text()
          console.error(`Webhook failed for booking ${booking.booking_id}:`, errorText)
          results.push({
            booking_id: booking.booking_id,
            success: false,
            error: `Webhook returned ${webhookResponse.status}`,
            details: errorText
          })
        }

      } catch (error) {
        failureCount++
        console.error(`Error processing booking ${booking.booking_id}:`, error)
        results.push({
          booking_id: booking.booking_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${bookings.length} bookings`,
      summary: {
        total: bookings.length,
        successful: successCount,
        failed: failureCount
      },
      results
    })

  } catch (error) {
    console.error('Error in 24hr reminder process:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process reminders',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing and information
export async function GET() {
  return NextResponse.json({
    message: '24-Hour Appointment Reminder Webhook',
    description: 'This endpoint processes bookings and sends reminder webhooks 24 hours before appointments',
    usage: 'POST request with Bearer token authorization',
    cron_schedule: 'Run hourly (0 * * * *) for best results',
    webhook_url: REMINDER_WEBHOOK_URL,
    notes: [
      'Requires CRON_SECRET environment variable for authorization',
      'Checks for bookings 24 hours out with a 60-minute window',
      'Prevents duplicate reminders by tracking reminder_sent_at',
      'Sends comprehensive booking details to GoHighLevel'
    ]
  })
}