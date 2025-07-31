"use client"

import { supabase } from './supabase'
import { 
  BookingWithRelations, 
  BookingInsert, 
  BookingUpdate,
  StaffScheduleInsert,
  BookingStatus 
} from '@/types/booking'

// Status update functions
export async function updateBookingStatus(
  bookingId: string, 
  status: BookingStatus,
  internalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: BookingUpdate = {
      status,
      updated_at: new Date().toISOString()
    }

    // Add timestamp fields based on status
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
    }

    // Add internal notes if provided
    if (internalNotes) {
      updateData.internal_notes = internalNotes
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function markAsCompleted(
  bookingId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return updateBookingStatus(bookingId, 'completed', notes)
}

export async function markAsNoShow(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const internalNotes = reason ? `No Show - ${reason}` : 'No Show'
  return updateBookingStatus(bookingId, 'no_show', internalNotes)
}

// Walk-in booking creation
export async function createWalkInBooking(
  serviceId: string,
  staffId: string,
  roomId: string,
  customerName: string,
  customerPhone: string,
  customerEmail?: string,
  startTime?: string,
  specialRequests?: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Get current date and time
    const now = new Date()
    const appointmentDate = now.toISOString().split('T')[0]
    const bookingStartTime = startTime || now.toTimeString().split(' ')[0].substring(0, 5)

    // Get service details for duration and pricing
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration, price')
      .eq('id', serviceId)
      .single()

    if (serviceError) throw serviceError

    // Calculate end time
    const startDateTime = new Date(`${appointmentDate}T${bookingStartTime}`)
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000)
    const endTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5)

    // Validate required customer information
    if (!customerName.trim()) {
      throw new Error('Customer name is required')
    }
    if (!customerPhone.trim()) {
      throw new Error('Customer phone is required')
    }

    // Create or find customer for walk-in
    let customerId: string
    const [firstName, ...lastNameParts] = customerName.trim().split(' ')
    const lastName = lastNameParts.join(' ') || ''
    
    if (customerEmail && customerEmail.trim()) {
      // Check if customer exists by email
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail.trim())
        .maybeSingle()
      
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create new customer with email
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: customerEmail.trim(),
            phone: customerPhone.trim()
          })
          .select('id')
          .single()
        
        if (customerError) throw customerError
        customerId = newCustomer.id
      }
    } else {
      // Create walk-in customer without email
      const walkInEmail = `walkin_${Date.now()}@temp.com`
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: walkInEmail,
          phone: customerPhone.trim()
        })
        .select('id')
        .single()
      
      if (customerError) throw customerError
      customerId = newCustomer.id
    }

    // Check for conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('appointment_date', appointmentDate)
      .eq('room_id', roomId)
      .neq('status', 'cancelled')
      .or(`and(start_time.lte.${bookingStartTime},end_time.gt.${bookingStartTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`)

    if (conflictError) throw conflictError
    if (conflicts && conflicts.length > 0) {
      throw new Error('Time slot conflict detected')
    }
    
    // Create booking data matching the actual database schema
    const bookingData = {
      customer_id: customerId,
      service_id: serviceId,
      staff_id: staffId,
      room_id: parseInt(roomId),
      appointment_date: appointmentDate,
      start_time: bookingStartTime,
      end_time: endTime,
      duration: service.duration,
      total_price: service.price,
      final_price: service.price,
      status: 'confirmed',
      payment_status: 'pending',
      notes: specialRequests,
      // Store customer info in notes for walk-ins
      internal_notes: `Walk-in: ${customerName} | ${customerPhone} | ${customerEmail || 'No email'}`
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single()

    if (bookingError) throw bookingError

    return { success: true, bookingId: booking.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Time slot blocking
export async function blockTimeSlot(
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  reason: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a blocked booking entry
    const blockingData: BookingInsert = {
      customer_id: 'system-block', // Special customer ID for blocking
      service_id: 'break-cleaning', // Special service ID for breaks/cleaning
      staff_id: staffId,
      room_id: parseInt(roomId),
      appointment_date: date,
      start_time: startTime,
      end_time: endTime,
      duration: Math.ceil((new Date(`${date}T${endTime}`).getTime() - new Date(`${date}T${startTime}`).getTime()) / 60000),
      total_price: 0,
      final_price: 0,
      status: 'confirmed',
      payment_status: 'not_applicable',
      internal_notes: `Time blocked for: ${reason}`,
      created_by: 'admin'
    }

    const { error } = await supabase
      .from('bookings')
      .insert(blockingData)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Staff schedule retrieval
export async function getStaffSchedule(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: BookingWithRelations[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*)
      `)
      .eq('staff_id', staffId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .neq('status', 'cancelled')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get all staff for schedule view
export async function getAllActiveStaff(): Promise<{ 
  success: boolean; 
  data?: Array<{ id: string; name: string; default_room_id: number | null }>; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, default_room_id')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Service category color mapping for visual organization
export function getServiceCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'facial': 'bg-blue-100 text-blue-800 border-blue-200',
    'massage': 'bg-green-100 text-green-800 border-green-200',
    'body_treatment': 'bg-purple-100 text-purple-800 border-purple-200',
    'body_scrub': 'bg-orange-100 text-orange-800 border-orange-200',
    'waxing': 'bg-pink-100 text-pink-800 border-pink-200',
    'package': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'membership': 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return colorMap[category] || 'bg-gray-100 text-gray-800 border-gray-200'
}

// Validation functions
export function validateBookingTime(
  startTime: string,
  duration: number,
  operatingHours = { open: '09:00', close: '19:00' }
): { isValid: boolean; error?: string } {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(start.getTime() + duration * 60000)
  const endTime = end.toTimeString().split(' ')[0].substring(0, 5)

  const openTime = new Date(`2000-01-01T${operatingHours.open}`)
  const closeTime = new Date(`2000-01-01T${operatingHours.close}`)

  if (start < openTime) {
    return { isValid: false, error: 'Start time is before operating hours' }
  }

  if (end > closeTime) {
    return { isValid: false, error: 'End time is after operating hours' }
  }

  return { isValid: true }
}

export function calculateEndTime(startTime: string, duration: number): string {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(start.getTime() + duration * 60000)
  return end.toTimeString().split(' ')[0].substring(0, 5)
}

// Check if staff can perform service (based on capabilities)
export async function checkStaffServiceCapability(
  staffId: string,
  serviceId: string
): Promise<{ canPerform: boolean; error?: string }> {
  try {
    // Use the existing database RPC function that works correctly
    const { data, error } = await supabase
      .rpc('check_staff_capability', {
        p_staff_id: staffId,
        p_service_id: serviceId
      })

    if (error) {
      console.warn('Staff capability RPC error:', error.message)
      // Fail open for admin - allow booking if RPC fails
      return { canPerform: true }
    }

    return { canPerform: data || false }
  } catch (error: any) {
    console.warn('Staff capability check failed, allowing booking:', error.message)
    // Fail open for admin - allow booking if there's an error
    return { canPerform: true }
  }
}