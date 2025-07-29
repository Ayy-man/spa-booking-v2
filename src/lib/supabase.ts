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
    room_id: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    booking_date: string
    start_time: string
    special_requests?: string
  }) {
    const { data, error } = await supabase.rpc('process_booking', {
      p_service_id: booking.service_id,
      p_staff_id: booking.staff_id,
      p_room_id: booking.room_id,
      p_customer_name: booking.customer_name,
      p_customer_email: booking.customer_email,
      p_customer_phone: booking.customer_phone,
      p_booking_date: booking.booking_date,
      p_start_time: booking.start_time,
      p_special_requests: booking.special_requests
    })

    if (error) throw error
    return data[0] // The function returns an array with one result
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