import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { addDays, format } from 'date-fns'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // First, let's check what bookings exist in the next few days
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const dayAfter = format(addDays(new Date(), 2), 'yyyy-MM-dd')
    
    const { data: upcomingBookings, error: upcomingError } = await supabase
      .from('bookings')
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        reminder_sent_at,
        customer:customers(first_name, last_name, email),
        service:services(name)
      `)
      .in('appointment_date', [tomorrow, dayAfter])
      .eq('status', 'confirmed')
      .order('appointment_date')
      .order('start_time')

    if (upcomingError) {
      return NextResponse.json({ 
        error: 'Failed to fetch upcoming bookings', 
        details: upcomingError 
      }, { status: 500 })
    }

    // Now test the reminder function
    const { data: bookingsNeedingReminder, error: reminderError } = await supabase.rpc(
      'get_bookings_needing_reminder',
      { p_hours_before: 24, p_window_minutes: 60 }
    )

    if (reminderError) {
      return NextResponse.json({ 
        error: 'Failed to call reminder function', 
        details: reminderError 
      }, { status: 500 })
    }

    // Calculate current time window for 24-hour reminders
    const now = new Date()
    const windowStart = addDays(now, 1)
    windowStart.setHours(now.getHours() - 1)
    const windowEnd = addDays(now, 1)
    windowEnd.setHours(now.getHours() + 1)

    return NextResponse.json({
      success: true,
      current_time: format(now, 'yyyy-MM-dd HH:mm:ss'),
      reminder_window: {
        start: format(windowStart, 'yyyy-MM-dd HH:mm:ss'),
        end: format(windowEnd, 'yyyy-MM-dd HH:mm:ss'),
        description: 'Bookings in this window would get 24hr reminders'
      },
      upcoming_bookings: {
        count: upcomingBookings?.length || 0,
        bookings: upcomingBookings?.map(b => ({
          id: b.id,
          date: b.appointment_date,
          time: b.start_time,
          customer: b.customer && typeof b.customer === 'object' && 'first_name' in b.customer && 'last_name' in b.customer
            ? `${b.customer.first_name} ${b.customer.last_name}` 
            : 'Unknown',
          service: (b.service && typeof b.service === 'object' && 'name' in b.service) ? b.service.name : 'Unknown',
          reminder_sent: b.reminder_sent_at ? format(new Date(b.reminder_sent_at), 'yyyy-MM-dd HH:mm:ss') : 'Not sent'
        }))
      },
      bookings_needing_reminder: {
        count: bookingsNeedingReminder?.length || 0,
        bookings: bookingsNeedingReminder
      },
      test_notes: [
        'This shows bookings in the next 2 days',
        'And which ones would get reminders if the cron job ran now',
        'To test, create a booking for exactly 24 hours from now'
      ]
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to test reminder query', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}