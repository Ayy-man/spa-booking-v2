import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all bookings with related data
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: bookings?.length || 0,
      bookings: bookings || [],
      summary: bookings?.map(b => ({
        id: b.id,
        customer: b.customer?.first_name + ' ' + b.customer?.last_name,
        service: b.service?.name,
        staff: b.staff?.name,
        room: b.room?.name,
        date: b.appointment_date,
        time: b.start_time,
        status: b.status,
        created: new Date(b.created_at).toLocaleString()
      }))
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}