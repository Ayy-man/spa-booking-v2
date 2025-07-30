import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

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
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getServicesByCategory(category: string) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
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
      .select('*')
      .eq('is_active', true)
      .order('room_number', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Bookings
  async createBooking(booking: {
    service_id: string
    staff_id: string
    room_id: number
    customer_name: string
    customer_email: string
    customer_phone?: string
    booking_date: string
    start_time: string
    special_requests?: string
  }) {
    // First check if process_booking RPC exists
    try {
      const { data, error } = await supabase.rpc('process_booking', {
        p_service_id: booking.service_id,
        p_staff_id: booking.staff_id,
        p_room_id: booking.room_id,
        p_customer_name: booking.customer_name,
        p_customer_email: booking.customer_email,
        p_booking_date: booking.booking_date,
        p_start_time: booking.start_time,
        p_customer_phone: booking.customer_phone,
        p_special_requests: booking.special_requests
      })

      if (error) {
        console.error('RPC error:', error)
        if (error.code === '42883') {
          console.log('RPC function not found, falling back to direct insert')
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please ensure database functions are installed and RLS policies are configured.')
        } else {
          throw error
        }
      } else if (data && data[0]) {
        // Convert UUID to string if needed
        return {
          booking_id: data[0].booking_id?.toString() || data[0].booking_id,
          success: data[0].success,
          message: data[0].message
        }
      }
    } catch (rpcError: any) {
      if (rpcError.message?.includes('Permission denied')) {
        throw rpcError
      }
      console.log('RPC function error, using direct insert')
    }

    // Fallback: Create booking directly
    // Get service details
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('id', booking.service_id)
      .single()

    if (!service) throw new Error('Service not found')

    // Create or find customer
    const [firstName, ...lastNameParts] = booking.customer_name.split(' ')
    const lastName = lastNameParts.join(' ')
    
    let customerId: string
    
    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', booking.customer_email)
      .single()
    
    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: booking.customer_email,
          phone: booking.customer_phone || ''
        })
        .select()
        .single()
      
      if (customerError) throw customerError
      customerId = newCustomer.id
    }

    // Calculate end time
    const startTime = new Date(`2000-01-01T${booking.start_time}:00`)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)
    const endTimeStr = endTime.toTimeString().slice(0, 5)

    // Create booking
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id: booking.service_id,
        staff_id: booking.staff_id,
        room_id: booking.room_id,
        appointment_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: endTimeStr,
        duration: service.duration,
        total_price: service.price,
        final_price: service.price,
        status: 'confirmed',
        payment_status: 'pending',
        notes: booking.special_requests || null
      })
      .select()
      .single()

    if (bookingError) throw bookingError

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
        room:rooms(*)
      `)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (date) {
      query = query.eq('booking_date', date)
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
        room:rooms(*)
      `)
      .eq('customer_email', email)
      .order('booking_date', { ascending: false })
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
    booking_date: string
    start_time: string
    special_requests?: string
  }) {
    const { data, error } = await supabase.rpc('process_couples_booking', {
      p_primary_service_id: booking.primary_service_id,
      p_secondary_service_id: booking.secondary_service_id,
      p_primary_staff_id: booking.primary_staff_id,
      p_secondary_staff_id: booking.secondary_staff_id,
      p_customer_name: booking.customer_name,
      p_customer_email: booking.customer_email,
      p_customer_phone: booking.customer_phone,
      p_booking_date: booking.booking_date,
      p_start_time: booking.start_time,
      p_special_requests: booking.special_requests
    })

    if (error) {
      console.error('Couples booking error:', error)
      throw error
    }
    
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