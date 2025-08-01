import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    const results: any = {}

    // Test direct table queries to see actual structure
    try {
      // Query rooms table
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .limit(3)
      
      results.rooms = {
        success: !roomsError,
        data: roomsData,
        error: roomsError?.message || null
      }
    } catch (err: any) {
      results.rooms = {
        success: false,
        data: null,
        error: err.message
      }
    }

    // Test bookings table
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .limit(3)
      
      results.bookings = {
        success: !bookingsError,
        data: bookingsData,
        error: bookingsError?.message || null
      }
    } catch (err: any) {
      results.bookings = {
        success: false,
        data: null,
        error: err.message
      }
    }

    // Test services table
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .limit(3)
      
      results.services = {
        success: !servicesError,
        data: servicesData,
        error: servicesError?.message || null
      }
    } catch (err: any) {
      results.services = {
        success: false,
        data: null,
        error: err.message
      }
    }

    // Test staff table
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .limit(3)
      
      results.staff = {
        success: !staffError,
        data: staffData,
        error: staffError?.message || null
      }
    } catch (err: any) {
      results.staff = {
        success: false,
        data: null,
        error: err.message
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}