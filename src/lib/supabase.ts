import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { validateTimeForDatabase, safeTimeSlice } from '@/lib/time-utils'
import { logger } from '@/lib/logger'
import { getGuamStartOfDay, getGuamEndOfDay, getGuamTime } from '@/lib/timezone-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client-side helper functions for common operations
export const supabaseClient = {
  // Services
  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, category, duration, price, requires_room_3, is_active, ghl_category, is_couples_service, allows_addons, requires_on_site_pricing, is_consultation')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getServicesByCategory(category: string) {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, category, duration, price, requires_room_3, is_active, ghl_category, is_couples_service, allows_addons, requires_on_site_pricing, is_consultation')
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Staff
  async getStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        default_room:rooms(*)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getStaffById(id: string) {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        default_room:rooms(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    return data
  },

  // Rooms
  async getRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, capacity, capabilities, equipment, features, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Bookings
  async getBookingsByDate(date: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        booking_addons(
          *,
          service_addon:service_addons(*)
        )
      `)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createBooking(booking: {
    service_id: string
    staff_id: string
    room_id: number
    customer_name: string
    customer_email: string
    customer_phone?: string
    appointment_date: string
    start_time: string
    notes?: string
    payment_option?: string
    payment_status?: string
    addons?: Array<{
      id: string
      name: string
      price: number
      duration: number
      quantity?: number
    }>
  }) {
    // Get service details first
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration, price, requires_on_site_pricing')
      .eq('id', booking.service_id)
      .single()

    if (serviceError || !service) {
      throw new Error('Service not found')
    }

    // Split customer name into first and last name
    const nameParts = booking.customer_name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || null // Allow null for single-name customers

    // Create or find customer
    let customerId: string
    
    // First try to find existing customer by email
    let existingCustomer = null
    const { data: customerByEmail } = await supabase
      .from('customers')
      .select('id')
      .eq('email', booking.customer_email)
      .maybeSingle()

    if (customerByEmail) {
      existingCustomer = customerByEmail
    } else if (booking.customer_phone) {
      // If not found by email and phone is provided, try by phone
      const { data: customerByPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', booking.customer_phone)
        .maybeSingle()
      
      if (customerByPhone) {
        existingCustomer = customerByPhone
      }
    }

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName, // Can be null for single-name customers
          email: booking.customer_email,
          phone: booking.customer_phone || null,
          marketing_consent: false,
          is_active: true
        })
        .select('id')
        .single()

      if (customerError) {
        logger.error('Customer creation error', customerError, 'supabase')
        throw new Error(`Failed to create customer record: ${customerError.message}`)
      }
      if (!newCustomer) {
        throw new Error('Failed to create customer record: No customer data returned')
      }
      customerId = newCustomer.id
    }

    // Calculate add-ons totals
    let addonsPrice = 0
    let addonsDuration = 0
    if (booking.addons && booking.addons.length > 0) {
      booking.addons.forEach(addon => {
        const quantity = addon.quantity || 1
        addonsPrice += addon.price * quantity
        addonsDuration += addon.duration * quantity
      })
    }
    
    // Validate and calculate end time (including add-ons duration)
    const validatedStartTime = validateTimeForDatabase(booking.start_time, 'start_time')
    const startTime = new Date(`2000-01-01T${validatedStartTime}`)
    const totalDuration = service.duration + addonsDuration
    const endTime = new Date(startTime.getTime() + totalDuration * 60000)
    const endTimeStr = safeTimeSlice(endTime.toTimeString())

    // Create booking with proper schema
    const discount = 0
    // Handle TBD pricing - use 0 for requires_on_site_pricing services
    const servicePrice = service.requires_on_site_pricing ? 0 : service.price
    const totalPrice = servicePrice + addonsPrice
    const finalPrice = totalPrice - discount
    
    // Calculate buffer times (15 minutes before start and after end)
    const bufferMinutes = 15
    const bufferStartTime = new Date(startTime.getTime() - bufferMinutes * 60000)
    const bufferEndTime = new Date(endTime.getTime() + bufferMinutes * 60000)
    
    // Ensure buffer times stay within business hours (9 AM - 7 PM)
    const businessStart = new Date(`2000-01-01T09:00:00`)
    const businessEnd = new Date(`2000-01-01T19:00:00`)
    
    const finalBufferStart = bufferStartTime < businessStart ? businessStart : bufferStartTime
    const finalBufferEnd = bufferEndTime > businessEnd ? businessEnd : bufferEndTime
    
    const bufferStartStr = safeTimeSlice(finalBufferStart.toTimeString())
    const bufferEndStr = safeTimeSlice(finalBufferEnd.toTimeString())
    
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id: booking.service_id,
        staff_id: booking.staff_id,
        room_id: booking.room_id,
        appointment_date: booking.appointment_date,
        start_time: validatedStartTime,
        end_time: endTimeStr,
        duration: totalDuration,
        buffer_start: bufferStartStr,
        buffer_end: bufferEndStr,
        total_price: totalPrice,
        discount: discount,
        final_price: finalPrice,
        status: 'pending',
        payment_status: booking.payment_status || 'pending',
        payment_option: booking.payment_option || 'deposit',
        notes: booking.notes,
        booking_type: 'single'
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // Save add-ons if any
    if (booking.addons && booking.addons.length > 0) {
      const bookingAddons = booking.addons.map(addon => ({
        booking_id: newBooking.id,
        addon_id: addon.id,
        quantity: addon.quantity || 1,
        price: addon.price,
        duration: addon.duration
      }))
      
      const { error: addonsError } = await supabase
        .from('booking_addons')
        .insert(bookingAddons)
      
      if (addonsError) {
        console.error('Failed to save add-ons:', addonsError)
        // Don't throw error - booking was created successfully
        // Add-ons can be added manually if needed
      }
    }

    return {
      booking_id: newBooking.id.toString(),
      success: true,
      message: 'Booking created successfully'
    }
  },

  async getBookings(date?: string) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*),
        booking_addons(
          *,
          service_addon:service_addons(*)
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (date) {
      query = query.eq('appointment_date', date)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getCustomerBookings(email: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .eq('customer.email', email)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) throw error
    return data
  },

  // Availability
  async getAvailableTimeSlots(
    date: string,
    serviceId?: string,
    staffId?: string
  ) {
    const { data, error } = await supabase.rpc('get_available_time_slots', {
      p_date: date,
      p_service_id: serviceId,
      p_staff_id: staffId
    })

    if (error) throw error
    return data
  },

  async getOptimalRoomAssignment(
    serviceId: string,
    staffId?: string,
    bookingDate?: string,
    startTime?: string
  ) {
    const { data, error } = await supabase.rpc('assign_optimal_room', {
      p_service_id: serviceId,
      p_preferred_staff_id: staffId,
      p_booking_date: bookingDate,
      p_start_time: startTime
    })

    if (error) throw error
    return data[0] // The function returns an array with one result
  },

  // Staff capability checking
  async checkStaffCapability(staffId: string, serviceId: string) {
    const { data, error } = await supabase.rpc('check_staff_capability', {
      p_staff_id: staffId,
      p_service_id: serviceId
    })

    if (error) throw error
    return data
  },

  // Staff schedule
  async getStaffSchedule(staffId: string, date: string) {
    const { data, error } = await supabase.rpc('get_staff_schedule', {
      p_staff_id: staffId,
      p_date: date
    })

    if (error) throw error
    return data[0] // The function returns an array with one result
  },

  // Couples booking
  async processCouplesBooking(booking: {
    primary_service_id: string
    secondary_service_id: string
    primary_staff_id: string
    secondary_staff_id: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    appointment_date: string
    start_time: string
    notes?: string
  }) {
    // First try v3 (new bulletproof version)
    try {
      const { data, error } = await supabase.rpc('process_couples_booking_v3', {
        p_primary_service_id: booking.primary_service_id,
        p_secondary_service_id: booking.secondary_service_id,
        p_primary_staff_id: booking.primary_staff_id,
        p_secondary_staff_id: booking.secondary_staff_id,
        p_customer_name: booking.customer_name,
        p_customer_email: booking.customer_email,
        p_customer_phone: booking.customer_phone,
        p_booking_date: booking.appointment_date,
        p_start_time: booking.start_time,
        p_special_requests: booking.notes
      })

      if (error) {
        console.error('Couples booking v3 error:', error)
        throw error
      }
      
      return data
    } catch (v3Error: any) {
      // If v3 doesn't exist, fallback to v2
      if (v3Error.message?.includes('function') && v3Error.message?.includes('does not exist')) {
        console.warn('v3 function not found, falling back to v2')
        const { data, error } = await supabase.rpc('process_couples_booking_v2', {
          p_primary_service_id: booking.primary_service_id,
          p_secondary_service_id: booking.secondary_service_id,
          p_primary_staff_id: booking.primary_staff_id,
          p_secondary_staff_id: booking.secondary_staff_id,
          p_customer_name: booking.customer_name,
          p_customer_email: booking.customer_email,
          p_customer_phone: booking.customer_phone,
          p_booking_date: booking.appointment_date,
          p_start_time: booking.start_time,
          p_special_requests: booking.notes
        })

        if (error) {
          console.error('Couples booking v2 error:', error)
          throw error
        }
        
        return data
      }
      
      // Re-throw if it's not a "function doesn't exist" error
      throw v3Error
    }
  },

  // Check couples booking availability
  async checkCouplesAvailability(params: {
    primary_service_id: string
    secondary_service_id: string
    primary_staff_id: string
    secondary_staff_id: string
    booking_date: string
    start_time: string
  }) {
    const { data, error } = await supabase.rpc('check_couples_booking_availability', {
      p_primary_service_id: params.primary_service_id,
      p_secondary_service_id: params.secondary_service_id,
      p_primary_staff_id: params.primary_staff_id,
      p_secondary_staff_id: params.secondary_staff_id,
      p_booking_date: params.booking_date,
      p_start_time: params.start_time
    })

    if (error) throw error
    return data
  },

  // Diagnose booking conflicts
  async diagnoseBookingConflicts(date: string, startTime: string, duration: number) {
    const { data, error } = await supabase.rpc('diagnose_booking_conflicts', {
      p_date: date,
      p_start_time: startTime,
      p_duration: duration
    })

    if (error) throw error
    return data
  },

  async getCouplesBookingDetails(bookingGroupId: string) {
    const { data, error } = await supabase.rpc('get_couples_booking_details', {
      p_booking_group_id: bookingGroupId
    })

    if (error) throw error
    return data
  },

  async cancelCouplesBooking(bookingGroupId: string) {
    const { data, error } = await supabase.rpc('cancel_couples_booking', {
      p_booking_group_id: bookingGroupId
    })

    if (error) throw error
    return data
  },

  // Booking Errors
  async logBookingError(error: {
    error_type: string
    error_message: string
    error_details?: any
    booking_data: any
    customer_name?: string
    customer_email?: string
    customer_phone?: string
    service_name?: string
    service_id?: string
    appointment_date?: string
    appointment_time?: string
    staff_name?: string
    staff_id?: string
    room_id?: number
    is_couples_booking?: boolean
    secondary_service_name?: string
    secondary_service_id?: string
    secondary_staff_name?: string
    secondary_staff_id?: string
    session_id?: string
  }) {
    const { data, error: dbError } = await supabase
      .from('booking_errors')
      .insert(error)
      .select()
      .single()
    
    if (dbError) {
      console.error('Failed to log booking error:', dbError)
      return null
    }
    
    return data
  },

  async getBookingErrors(filters?: {
    resolved?: boolean
    error_type?: string
    date_from?: string
    date_to?: string
    limit?: number
  }) {
    let query = supabase
      .from('booking_errors')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (filters?.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved)
    }
    
    if (filters?.error_type) {
      query = query.eq('error_type', filters.error_type)
    }
    
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  // Walk-ins
  async createWalkIn(walkIn: {
    name: string
    phone: string
    email?: string
    service_name: string
    service_category: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('walk_ins')
      .insert({
        customer_name: walkIn.name,
        customer_phone: walkIn.phone,
        customer_email: walkIn.email || null,
        service_name: walkIn.service_name,
        service_category: walkIn.service_category,
        notes: walkIn.notes || null,
        status: 'waiting',
        scheduling_type: 'walk_in',
        checked_in_at: getGuamTime().toISOString()
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async getWalkIns(filters?: {
    status?: string
    date?: string
    includeArchived?: boolean
  }) {
    let query = supabase
      .from('walk_ins')
      .select('*')
      .order('created_at', { ascending: false })

    // By default, exclude archived records unless explicitly requested
    if (!filters?.includeArchived) {
      query = query.is('archived_at', null)
    } else {
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.date) {
      const startOfDay = getGuamStartOfDay(filters.date)
      const endOfDay = getGuamEndOfDay(filters.date)
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data, error } = await query
    if (error) {
      console.error('Walk-ins query error:', error)
      throw error
    }
    return data
  },

  async getArchivedWalkIns(filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
    searchTerm?: string
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('walk_ins')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Instead of filtering by archived_at, exclude today's walk-ins
    // This ensures we see ALL past walk-ins in the "Previous Walk-ins" modal
    const todayStart = getGuamStartOfDay(new Date().toISOString().split('T')[0])
    query = query.lt('created_at', todayStart)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.dateFrom) {
      const startOfDay = getGuamStartOfDay(filters.dateFrom)
      query = query.gte('created_at', startOfDay)
    }

    if (filters?.dateTo) {
      const endOfDay = getGuamEndOfDay(filters.dateTo)
      query = query.lte('created_at', endOfDay)
    }

    if (filters?.searchTerm) {
      const search = filters.searchTerm.toLowerCase()
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,service_name.ilike.%${search}%`)
    }

    // Pagination
    const limit = filters?.limit || 20
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error
    
    return { data, count }
  },

  async archiveWalkIn(id: string) {
    const { data, error } = await supabase
      .from('walk_ins')
      .update({ 
        archived_at: getGuamTime().toISOString(),
        updated_at: getGuamTime().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async archiveOldWalkIns() {
    const { data, error } = await supabase.rpc('archive_old_walk_ins')
    if (error) throw error
    return data
  },

  async updateWalkInStatus(id: string, status: string, notes?: string) {
    const updateData: any = {
      status
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Set completion timestamp if status is 'served'
    if (status === 'served') {
      updateData.completed_at = getGuamTime().toISOString()
    }

    const { data, error } = await supabase
      .from('walk_ins')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async deleteWalkIn(id: string) {
    const { error } = await supabase
      .from('walk_ins')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

// Server-side client for API routes (with full access)
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey)
}