import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
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
    
    // Get booking payment status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('payment_status, payment_option, final_price, status')
      .eq('id', bookingId)
      .single()
    
    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId, bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    // Get latest payment transaction if exists
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (transactionError) {
      console.error('Error fetching payment transaction:', transactionError)
    }
    
    // Check if payment is required
    const paymentRequired = booking.payment_option !== 'pay_on_location'
    
    // Determine verification status
    const verificationStatus = transaction 
      ? transaction.status === 'completed' ? 'verified' : transaction.status
      : 'pending'
    
    return NextResponse.json({
      booking_id: bookingId,
      payment_status: booking.payment_status,
      payment_option: booking.payment_option,
      payment_required: paymentRequired,
      verification_status: verificationStatus,
      amount: booking.final_price,
      booking_status: booking.status,
      transaction: transaction ? {
        id: transaction.id,
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        provider: transaction.payment_provider,
        payment_method: transaction.payment_method,
        created_at: transaction.created_at,
        verified_at: transaction.webhook_received_at
      } : null,
      last_checked: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error getting payment status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get payment status',
        message: error.message 
      },
      { status: 500 }
    )
  }
}