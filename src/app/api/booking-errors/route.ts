import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Retrieve booking errors with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const resolved = searchParams.get('resolved')
    const errorType = searchParams.get('error_type')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabase
      .from('booking_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // Apply filters
    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true')
    }
    
    if (errorType) {
      query = query.eq('error_type', errorType)
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      errors: data,
      count: data?.length || 0
    })
  } catch (error: any) {
    console.error('Error fetching booking errors:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to fetch booking errors'
    }, { status: 500 })
  }
}

// POST - Log a new booking error
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract user agent and IP from request
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Prepare error record
    const errorRecord = {
      error_type: body.error_type || 'unknown',
      error_message: body.error_message || 'Unknown error',
      error_details: body.error_details || {},
      booking_data: body.booking_data || {},
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      service_name: body.service_name,
      service_id: body.service_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      staff_name: body.staff_name,
      staff_id: body.staff_id,
      room_id: body.room_id,
      is_couples_booking: body.is_couples_booking || false,
      secondary_service_name: body.secondary_service_name,
      secondary_service_id: body.secondary_service_id,
      secondary_staff_name: body.secondary_staff_name,
      secondary_staff_id: body.secondary_staff_id,
      user_agent: userAgent,
      ip_address: ip === 'unknown' ? null : ip,
      session_id: body.session_id
    }
    
    const { data, error } = await supabase
      .from('booking_errors')
      .insert(errorRecord)
      .select()
      .single()
    
    if (error) {
      console.error('Error logging booking error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      error_id: data.id,
      message: 'Error logged successfully'
    })
  } catch (error: any) {
    console.error('Error in booking-errors API:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to log booking error'
    }, { status: 500 })
  }
}

// PATCH - Update a booking error (mark as resolved, add notes, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, resolved, resolution_notes, resolved_by } = body
    
    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Error ID is required' 
      }, { status: 400 })
    }
    
    const updates: any = {
      updated_at: new Date().toISOString()
    }
    
    if (resolved !== undefined) {
      updates.resolved = resolved
      if (resolved) {
        updates.resolved_at = new Date().toISOString()
      }
    }
    
    if (resolution_notes) {
      updates.resolution_notes = resolution_notes
    }
    
    if (resolved_by) {
      updates.resolved_by = resolved_by
    }
    
    const { data, error } = await supabase
      .from('booking_errors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      data,
      message: 'Error updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating booking error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to update booking error'
    }, { status: 500 })
  }
}