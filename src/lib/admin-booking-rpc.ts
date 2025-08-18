"use client"

import { supabase } from './supabase'

/**
 * Cancel a booking using the database RPC function
 * This ensures all fields (cancelled_at, cancellation_reason) are properly set
 */
export async function cancelBookingRPC(
  bookingId: string,
  cancellationReason?: string,
  cancelledBy: string = 'admin'
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_cancellation_reason: cancellationReason || null,
        p_cancelled_by: cancelledBy
      })

    if (error) throw error

    // The RPC function returns a JSON object
    if (data && typeof data === 'object') {
      if (data.success) {
        return { 
          success: true, 
          data: data 
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to cancel booking' 
        }
      }
    }

    return { 
      success: false, 
      error: 'Unexpected response from server' 
    }
  } catch (error: any) {
    console.error('Cancel booking RPC error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to cancel booking' 
    }
  }
}

/**
 * Mark a booking as completed using the database RPC function
 */
export async function completeBookingRPC(
  bookingId: string,
  completionNotes?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .rpc('complete_booking', {
        p_booking_id: bookingId,
        p_completion_notes: completionNotes || null
      })

    if (error) throw error

    if (data && typeof data === 'object') {
      if (data.success) {
        return { 
          success: true, 
          data: data 
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to complete booking' 
        }
      }
    }

    return { 
      success: false, 
      error: 'Unexpected response from server' 
    }
  } catch (error: any) {
    console.error('Complete booking RPC error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to complete booking' 
    }
  }
}

/**
 * Check in a booking using the database RPC function
 */
export async function checkinBookingRPC(
  bookingId: string,
  checkinNotes?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .rpc('checkin_booking', {
        p_booking_id: bookingId,
        p_checkin_notes: checkinNotes || null
      })

    if (error) throw error

    if (data && typeof data === 'object') {
      if (data.success) {
        return { 
          success: true, 
          data: data 
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to check in booking' 
        }
      }
    }

    return { 
      success: false, 
      error: 'Unexpected response from server' 
    }
  } catch (error: any) {
    console.error('Check in booking RPC error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to check in booking' 
    }
  }
}

/**
 * Get booking with full cancellation details
 * This fetches a booking including the cancelled_at and cancellation_reason fields
 */
export async function getBookingWithCancellationDetails(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: any }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .eq('id', bookingId)
      .single()

    if (error) throw error

    return { 
      success: true, 
      booking: data 
    }
  } catch (error: any) {
    console.error('Get booking details error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to fetch booking details' 
    }
  }
}