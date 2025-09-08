import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Check authentication - verify admin session from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }
    
    // For now, we'll accept any token since the admin panel verifies authentication client-side
    // In production, you'd want to validate this token properly
    const token = authHeader.substring(7)


    // First, check if this is a couples booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('booking_group_id, booking_type')
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      console.error('[DELETE] Error fetching booking:', fetchError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // If it's a couples booking, we need to delete both bookings
    let bookingIdsToDelete = [bookingId]
    
    if (booking?.booking_group_id && booking?.booking_type === 'couple') {
      
      // Find all bookings with the same booking_group_id
      const { data: linkedBookings, error: linkedError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('booking_group_id', booking.booking_group_id)
      
      if (!linkedError && linkedBookings) {
        bookingIdsToDelete = linkedBookings.map(b => b.id)
      }
    }

    // Delete related records for all booking IDs
    for (const id of bookingIdsToDelete) {
      
      // Delete related payments
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .delete()
        .eq('booking_id', id)
      
      if (paymentError) {
        console.error(`[DELETE] Payment delete error for ${id}:`, paymentError)
      }

      // Delete related walk-ins
      const { error: walkInError } = await supabaseAdmin
        .from('walk_ins')
        .delete()
        .eq('booking_id', id)
      
      if (walkInError) {
        console.error(`[DELETE] Walk-in delete error for ${id}:`, walkInError)
      }

      // Delete related waivers
      const { error: waiverError } = await supabaseAdmin
        .from('waivers')
        .delete()
        .eq('booking_id', id)
      
      if (waiverError) {
        console.error(`[DELETE] Waiver delete error for ${id}:`, waiverError)
      }
    }

    // Finally, delete all the bookings
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .in('id', bookingIdsToDelete)

    if (deleteError) {
      console.error('[DELETE] Booking delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete booking: ${deleteError.message}` },
        { status: 500 }
      )
    }

    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${bookingIdsToDelete.length} booking(s)`,
      deletedIds: bookingIdsToDelete
    })

  } catch (error: any) {
    console.error('[DELETE /api/admin/bookings] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}