import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
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
    
    // Parse request body
    const body = await request.json()
    const { payment_status, payment_method, verification_source } = body
    
    // Get booking to verify it exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, payment_status, final_price')
      .eq('id', bookingId)
      .single()
    
    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId, bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    // If already paid, return success (idempotent)
    if (booking.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Booking already marked as paid',
        booking_id: bookingId
      })
    }
    
    // Update booking payment status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: payment_status || 'paid',
        payment_option: 'deposit',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
    
    if (updateError) {
      console.error('Failed to update booking payment status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }
    
    // Create a simple payment transaction record
    const transactionId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await supabase
      .from('payment_transactions')
      .insert({
        booking_id: bookingId,
        transaction_id: transactionId,
        payment_provider: 'gohighlevel',
        amount: booking.final_price,
        currency: 'USD',
        status: 'completed',
        payment_method: payment_method || 'online',
        metadata: {
          verification_source: verification_source || 'url_params',
          marked_at: new Date().toISOString()
        },
        webhook_received_at: new Date().toISOString()
      })
    
    console.log('Payment marked as complete for booking:', bookingId)
    
    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      payment_status: 'paid',
      transaction_id: transactionId
    })
    
  } catch (error: any) {
    console.error('Error marking payment as complete:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update payment status',
        message: error.message 
      },
      { status: 500 }
    )
  }
}