"use client"

import { supabase } from './supabase'
import { BookingWithRelations } from '@/types/booking'
import { getGuamTime, createGuamDateTime, isTimeSlotBookable } from '@/lib/timezone-utils'
import { safeTimeSlice } from '@/lib/time-utils'

export interface RescheduleCheckResult {
  can_reschedule: boolean
  reason: string
  history?: RescheduleHistory[]
}

export interface RescheduleHistory {
  reschedule_date: string
  old_date: string
  old_time: string
  new_date: string
  new_time: string
  reason: string | null
  rescheduled_by: string
}

export interface AvailableSlot {
  time: string
  available: boolean
  staff_available: boolean
  room_available: boolean
}

// Check if a booking can be rescheduled
export async function checkRescheduleEligibility(
  bookingId: string
): Promise<RescheduleCheckResult> {
  try {
    // Get the admin session token from localStorage
    let token = 'admin-token'
    if (typeof window !== 'undefined') {
      const sessionData = localStorage.getItem('spa-admin-session')
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData)
          token = session.token || 'admin-token'
        } catch (e) {
          console.warn('Could not parse session data')
        }
      }
    }
    
    const response = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to check reschedule eligibility')
    }

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Error checking reschedule eligibility:', error)
    return {
      can_reschedule: false,
      reason: error.message || 'Failed to check eligibility'
    }
  }
}

// Reschedule a booking to a new date/time
export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newStartTime: string,
  reason?: string,
  notifyCustomer: boolean = true
): Promise<{ success: boolean; error?: string; message?: string }> {
  
  try {
    // Get the admin session token from localStorage
    let token = 'admin-token'
    if (typeof window !== 'undefined') {
      const sessionData = localStorage.getItem('spa-admin-session')
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData)
          token = session.token || 'admin-token'
        } catch (e) {
          console.warn('Could not parse session data')
        }
      }
    }
    
    const response = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        new_date: newDate,
        new_start_time: newStartTime,
        reason,
        notify_customer: notifyCustomer
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[rescheduleBooking] API error:', result)
      return { 
        success: false, 
        error: result.error || `Failed to reschedule booking: ${response.statusText}` 
      }
    }

    return { 
      success: true,
      message: result.message 
    }
  } catch (error: any) {
    console.error('[rescheduleBooking] Unexpected error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to reschedule booking' 
    }
  }
}

// Get available time slots for rescheduling
export async function getAvailableRescheduleSlots(
  booking: BookingWithRelations,
  targetDate: string
): Promise<AvailableSlot[]> {
  try {
    const serviceDuration = booking.service?.duration || 60
    const staffId = booking.staff_id
    const roomId = booking.room_id

    // Generate time slots for the day
    const slots: AvailableSlot[] = []
    const startHour = 9 // 9 AM
    const endHour = 19 // 7 PM
    const slotInterval = 15 // 15-minute intervals

    // Get existing bookings for the target date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('appointment_date', targetDate)
      .neq('status', 'cancelled')
      .neq('id', booking.id) // Exclude current booking

    if (error) {
      console.error('Error fetching existing bookings:', error)
      return []
    }

    // Check each time slot
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Calculate end time for this slot
        const slotStart = new Date(`2000-01-01T${timeStr}`)
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)
        const endTimeStr = safeTimeSlice(slotEnd.toTimeString())

        // Don't allow slots that would go past closing time
        if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) {
          continue
        }

        // Check if slot meets 2-hour advance booking requirement
        const slotDateTime = createGuamDateTime(targetDate, timeStr)
        if (!isTimeSlotBookable(slotDateTime)) {
          slots.push({
            time: timeStr,
            available: false,
            staff_available: false,
            room_available: false
          })
          continue
        }

        // Check staff availability
        const staffConflicts = existingBookings?.filter(b => 
          b.staff_id === staffId &&
          ((b.start_time <= timeStr && b.end_time > timeStr) ||
           (b.start_time < endTimeStr && b.end_time >= endTimeStr) ||
           (b.start_time >= timeStr && b.end_time <= endTimeStr))
        ) || []

        // Check room availability
        const roomConflicts = existingBookings?.filter(b => 
          b.room_id === roomId &&
          ((b.start_time <= timeStr && b.end_time > timeStr) ||
           (b.start_time < endTimeStr && b.end_time >= endTimeStr) ||
           (b.start_time >= timeStr && b.end_time <= endTimeStr))
        ) || []

        const staffAvailable = staffConflicts.length === 0
        const roomAvailable = roomConflicts.length === 0

        slots.push({
          time: timeStr,
          available: staffAvailable && roomAvailable,
          staff_available: staffAvailable,
          room_available: roomAvailable
        })
      }
    }

    return slots
  } catch (error) {
    console.error('Error getting available slots:', error)
    return []
  }
}

// Format reschedule history for display
export function formatRescheduleHistory(history: RescheduleHistory[]): string[] {
  return history.map(h => {
    const oldDateTime = new Date(`${h.old_date}T${h.old_time}`)
    const newDateTime = new Date(`${h.new_date}T${h.new_time}`)
    const rescheduleDate = new Date(h.reschedule_date)

    return `Rescheduled on ${rescheduleDate.toLocaleDateString()} from ${oldDateTime.toLocaleDateString()} ${oldDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${newDateTime.toLocaleDateString()} ${newDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${h.reason ? ` - ${h.reason}` : ''}`
  })
}