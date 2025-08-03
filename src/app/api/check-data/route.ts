import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('category')
    
    // Get all staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
    
    // Get all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      
    // Get a few bookings to test schema
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(3)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schema_analysis: {
        rooms_schema: rooms?.[0] ? Object.keys(rooms[0]) : [],
        bookings_schema: bookings?.[0] ? Object.keys(bookings[0]) : [],
        services_schema: services?.[0] ? Object.keys(services[0]) : [],
        staff_schema: staff?.[0] ? Object.keys(staff[0]) : []
      },
      data: {
        services: {
          count: services?.length || 0,
          sample: services?.slice(0, 3),
          error: servicesError?.message
        },
        staff: {
          count: staff?.length || 0,
          data: staff,
          error: staffError?.message
        },
        rooms: {
          count: rooms?.length || 0,
          data: rooms,
          error: roomsError?.message
        },
        bookings: {
          count: bookings?.length || 0,
          sample: bookings,
          error: bookingsError?.message
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}