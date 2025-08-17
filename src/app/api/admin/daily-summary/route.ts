import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, addDays } from 'date-fns'

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface DailySummaryData {
  date: string
  overview: {
    totalAppointments: number
    completed: number
    noShows: number
    cancelled: number
    totalRevenue: number
    depositsCollected: number
  }
  staffPerformance: Array<{
    name: string
    appointments: number
    revenue: number
  }>
  serviceBreakdown: {
    [category: string]: number
  }
  tomorrowPreview: {
    totalBookings: number
    firstAppointment: string
    lastAppointment: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const tomorrowDate = format(addDays(new Date(date), 1), 'yyyy-MM-dd')

    // Fetch bookings for the specified date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        staff:staff(name),
        services:services(name, category, price),
        customers:customers(first_name, last_name)
      `)
      .eq('appointment_date', date)
      .order('start_time')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw new Error('Failed to fetch bookings')
    }

    // Fetch tomorrow's bookings for preview
    const { data: tomorrowBookings, error: tomorrowError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('appointment_date', tomorrowDate)
      .neq('status', 'cancelled')
      .order('start_time')

    if (tomorrowError) {
      console.error('Error fetching tomorrow bookings:', tomorrowError)
    }

    // Calculate overview metrics
    const overview = {
      totalAppointments: bookings?.length || 0,
      completed: bookings?.filter(b => b.status === 'completed').length || 0,
      noShows: bookings?.filter(b => b.status === 'no_show').length || 0,
      cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
      totalRevenue: bookings?.reduce((sum, b) => {
        if (b.status === 'completed' || b.status === 'confirmed') {
          return sum + (parseFloat(b.final_price) || 0)
        }
        return sum
      }, 0) || 0,
      depositsCollected: bookings?.filter(b => 
        b.payment_option === 'deposit' && 
        (b.status === 'confirmed' || b.status === 'completed')
      ).length || 0
    }

    // Calculate staff performance
    const staffMap = new Map<string, { appointments: number; revenue: number }>()
    
    bookings?.forEach(booking => {
      if (booking.status !== 'cancelled' && booking.staff?.name) {
        const current = staffMap.get(booking.staff.name) || { appointments: 0, revenue: 0 }
        current.appointments += 1
        if (booking.status === 'completed' || booking.status === 'confirmed') {
          current.revenue += parseFloat(booking.final_price) || 0
        }
        staffMap.set(booking.staff.name, current)
      }
    })

    const staffPerformance = Array.from(staffMap.entries())
      .map(([name, data]) => ({
        name,
        appointments: data.appointments,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate service breakdown by category
    const serviceBreakdown: { [category: string]: number } = {}
    
    bookings?.forEach(booking => {
      if (booking.status !== 'cancelled' && booking.services?.category) {
        const category = booking.services.category
        serviceBreakdown[category] = (serviceBreakdown[category] || 0) + 1
      }
    })

    // Tomorrow's preview
    const tomorrowPreview = {
      totalBookings: tomorrowBookings?.length || 0,
      firstAppointment: tomorrowBookings && tomorrowBookings.length > 0 && tomorrowBookings[0]?.start_time 
        ? format(new Date(`2000-01-01T${tomorrowBookings[0].start_time}`), 'h:mm a')
        : '',
      lastAppointment: tomorrowBookings && tomorrowBookings.length > 0 
        ? format(new Date(`2000-01-01T${tomorrowBookings[tomorrowBookings.length - 1].start_time}`), 'h:mm a')
        : ''
    }

    const summaryData: DailySummaryData = {
      date,
      overview,
      staffPerformance,
      serviceBreakdown,
      tomorrowPreview
    }

    return NextResponse.json(summaryData)
  } catch (error) {
    console.error('Error generating daily summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily summary' },
      { status: 500 }
    )
  }
}