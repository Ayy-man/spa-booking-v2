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

    // Add special requests if provided
    if (internalNotes) {
      updateData.notes = internalNotes
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

// Cancel booking function
export async function cancelBooking(
  bookingId: string,
  cancellationReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, get the current booking to preserve existing internal notes
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('internal_notes')
      .eq('id', bookingId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Prepare the update data
    const updateData: BookingUpdate = {
      status: 'cancelled',
      // The database trigger will automatically set cancelled_at and extract cancellation_reason
      // We store it in internal_notes with "Cancelled:" prefix for the trigger to extract
      internal_notes: cancellationReason 
        ? `Cancelled: ${cancellationReason}`
        : 'Cancelled: Cancelled by admin',
      updated_at: new Date().toISOString()
    }
    
    // If there were existing internal notes, append them
    if (currentBooking?.internal_notes && !currentBooking.internal_notes.startsWith('Cancelled:')) {
      updateData.internal_notes = `${updateData.internal_notes}\n\nPrevious notes: ${currentBooking.internal_notes}`
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

// Delete booking function (permanent removal)
export async function deleteBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[deleteBooking] Starting delete for booking:', bookingId)
  
  try {
    // Get the admin session token from localStorage
    let token = 'admin-token' // Default token
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
    
    // Use the API endpoint with service role key for proper deletion
    const response = await fetch(`/api/admin/bookings/${bookingId}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[deleteBooking] API error:', result)
      return { 
        success: false, 
        error: result.error || `Failed to delete booking: ${response.statusText}` 
      }
    }

    console.log('[deleteBooking] Delete successful!', result)
    return { success: true }
  } catch (error: any) {
    console.error('[deleteBooking] Unexpected error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to delete booking' 
    }
  }
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

    // Create or find customer record
    const finalCustomerEmail = customerEmail && customerEmail.trim() ? customerEmail.trim() : `walkin_${Date.now()}@dermalskinclinic.com`
    
    let customerId: string
    
    // First try to find existing customer by email or phone
    let existingCustomer = null
    const { data: customerByEmail } = await supabase
      .from('customers')
      .select('id')
      .eq('email', finalCustomerEmail)
      .maybeSingle()

    if (customerByEmail) {
      existingCustomer = customerByEmail
    } else {
      // If not found by email, try by phone
      const { data: customerByPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone.trim())
        .maybeSingle()
      
      if (customerByPhone) {
        existingCustomer = customerByPhone
      }
    }

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const nameParts = customerName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || null // Allow null for single-name customers
      
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName, // Can be null for single-name customers
          email: finalCustomerEmail,
          phone: customerPhone.trim() || null,
          marketing_consent: false,
          is_active: true
        })
        .select('id')
        .single()

      if (customerError || !newCustomer) {
        throw new Error('Failed to create customer record')
      }
      customerId = newCustomer.id
    }

    // Check for conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('appointment_date', appointmentDate)
      .eq('room_id', parseInt(roomId))
      .neq('status', 'cancelled')
      .or(`and(start_time.lte.${bookingStartTime},end_time.gt.${bookingStartTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`)

    if (conflictError) throw conflictError
    if (conflicts && conflicts.length > 0) {
      throw new Error('Time slot conflict detected')
    }
    
    // Create booking data matching the actual database schema
    const discount = 0
    const finalPrice = service.price - discount
    
    const bookingData: BookingInsert = {
      customer_id: customerId,
      service_id: serviceId,
      staff_id: staffId,
      room_id: parseInt(roomId),
      appointment_date: appointmentDate,
      start_time: bookingStartTime,
      end_time: endTime,
      duration: service.duration,
      total_price: service.price,
      discount: discount,
      final_price: finalPrice,
      status: 'confirmed',
      payment_status: 'pending',
      notes: specialRequests ? `Walk-in: ${specialRequests}` : `Walk-in booking for ${customerName}`,
      booking_type: 'single'
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
    // Get system service for blocking
    const systemServiceId = await getOrCreateSystemService()

    if (!systemServiceId) {
      throw new Error('Failed to create system service for time blocking')
    }

    // Create or find system customer
    let systemCustomerId: string
    
    const { data: existingSystemCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', 'system@dermalskinclinic.com')
      .single()

    if (existingSystemCustomer) {
      systemCustomerId = existingSystemCustomer.id
    } else {
      // Create system customer
      const { data: newSystemCustomer, error: systemCustomerError } = await supabase
        .from('customers')
        .insert({
          first_name: 'SYSTEM',
          last_name: 'BLOCK',
          email: 'system@dermalskinclinic.com',
          phone: null,
          marketing_consent: false,
          is_active: true
        })
        .select('id')
        .single()

      if (systemCustomerError || !newSystemCustomer) {
        throw new Error('Failed to create system customer record')
      }
      systemCustomerId = newSystemCustomer.id
    }

    // Create a blocked booking entry
    const blockingData: BookingInsert = {
      customer_id: systemCustomerId,
      service_id: systemServiceId,
      staff_id: staffId,
      room_id: parseInt(roomId),
      appointment_date: date,
      start_time: startTime,
      end_time: endTime,
      duration: 60, // Default duration for blocking
      total_price: 0,
      discount: 0,
      final_price: 0,
      status: 'confirmed',
      payment_status: 'completed',
      notes: `Time blocked for: ${reason}`,
      booking_type: 'block'
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

// Helper function to get or create system customer for blocking
async function getOrCreateSystemCustomer(): Promise<string | null> {
  // No customers table - return a dummy ID
  return 'system-block'
}

// Helper function to get or create system service for blocking
async function getOrCreateSystemService(): Promise<string | null> {
  try {
    // First try to find existing system service
    const { data: existingService } = await supabase
      .from('services')
      .select('id')
      .eq('id', 'time-block')
      .maybeSingle()

    if (existingService) {
      return existingService.id
    }

    // Create system service if it doesn't exist
    const { data: newService, error } = await supabase
      .from('services')
      .insert({
        id: 'time-block',
        name: 'Time Block',
        description: 'System service for blocking time slots',
        category: 'special',
        duration: 15, // Default 15 minutes, will be overridden by actual duration
        price: 0,
        is_active: true
      })
      .select('id')
      .single()

    if (error) throw error
    return newService.id
  } catch (error) {
    console.error('Failed to get/create system service:', error)
    return null
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
  data?: Array<{ id: string; name: string; default_room_id: string | null }>; 
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