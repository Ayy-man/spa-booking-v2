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
    
    return NextResponse.json({
      success: true,
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