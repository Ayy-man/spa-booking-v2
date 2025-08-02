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
      .order('id', { ascending: true })
    
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
    appointment_date: string
    start_time: string
    notes?: string
  }) {
    // Get service details first
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', booking.service_id)
      .single()

    if (serviceError || !service) {
      throw new Error('Service not found')
    }

    // Split customer name into first and last name
    const nameParts = booking.customer_name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

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
          last_name: lastName,
          email: booking.customer_email,
          phone: booking.customer_phone || null,
          marketing_consent: false,
          is_active: true
        })
        .select('id')
        .single()

      if (customerError) {
        console.error('Customer creation error:', customerError)
        throw new Error(`Failed to create customer record: ${customerError.message}`)
      }
      if (!newCustomer) {
        throw new Error('Failed to create customer record: No customer data returned')
      }
      customerId = newCustomer.id
    }

    // Resolve "any" staff to an actual available staff member
    let resolvedStaffId = booking.staff_id
    if (booking.staff_id === 'any') {
      // Get available staff for this service and date
      const availableSlots = await this.getAvailableTimeSlots(
        booking.appointment_date,
        booking.service_id
      )
      
      // Find the first available staff for the requested time
      const suitableSlot = availableSlots.find(slot => 
        slot.available_time === booking.start_time && 
        slot.staff_id !== 'any'
      )
      
      if (suitableSlot) {
        resolvedStaffId = suitableSlot.staff_id
      } else {
        // Fallback: get any capable staff member for this service
        const { data: staff } = await supabase
          .from('staff')
          .select('id, capabilities, work_days')
          .eq('is_active', true)
          .neq('id', 'any')
        
        if (staff) {
          // Find staff who can perform this service and works on this day
          const appointmentDate = new Date(booking.appointment_date)
          const dayOfWeek = appointmentDate.getDay()
          
          const suitableStaff = staff.find(s => 
            s.capabilities.includes(service.category) && 
            s.work_days.includes(dayOfWeek)
          )
          
          if (suitableStaff) {
            resolvedStaffId = suitableStaff.id
          } else {
            throw new Error('No available staff found for this service and date')
          }
        } else {
          throw new Error('No staff members found in system')
        }
      }
    }

    // Calculate end time
    const startTime = new Date(`2000-01-01T${booking.start_time}:00`)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)
    const endTimeStr = endTime.toTimeString().slice(0, 5)

    // Create booking with proper schema
    const discount = 0
    const finalPrice = service.price - discount
    
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id: booking.service_id,
        staff_id: resolvedStaffId,
        room_id: booking.room_id,
        appointment_date: booking.appointment_date,
        start_time: booking.start_time,
        end_time: endTimeStr,
        duration: service.duration,
        total_price: service.price,
        discount: discount,
        final_price: finalPrice,
        status: 'pending',
        payment_status: 'pending',
        notes: booking.notes,
        booking_type: 'single'
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
        room:rooms(*),
        customer:customers(*)
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
      // Couples booking error - re-throw for proper handling
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