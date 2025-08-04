import { Database } from './database'

// Type aliases for easier use
export type Service = Database['public']['Tables']['services']['Row']
export type Staff = Database['public']['Tables']['staff']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type StaffSchedule = Database['public']['Tables']['staff_schedules']['Row']
export type WalkIn = Database['public']['Tables']['walk_ins']['Row']

// Insert types for creating new records
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type StaffInsert = Database['public']['Tables']['staff']['Insert']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type StaffScheduleInsert = Database['public']['Tables']['staff_schedules']['Insert']

// Update types for modifying records
export type ServiceUpdate = Database['public']['Tables']['services']['Update']
export type StaffUpdate = Database['public']['Tables']['staff']['Update']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

// Extended types with relationships
export interface BookingWithRelations extends Booking {
  service: Service
  staff: Staff & { default_room: Room | null }
  room: Room
  customer: Customer
  walk_in_origin?: Pick<WalkIn, 'id' | 'customer_name' | 'checked_in_at'> | null
}

export interface StaffWithRoom extends Staff {
  default_room: Room | null
}

// Business logic types
export interface StaffScheduleData {
  [day: string]: {
    available: boolean
    start_time?: string
    end_time?: string
    breaks?: Array<{
      start_time: string
      end_time: string
      reason?: string
    }>
  }
}

export interface AvailableTimeSlot {
  available_time: string
  available_staff_id: string
  available_staff_name: string
  available_room_id: string
  available_room_name: string
}

export interface RoomAssignment {
  assigned_room_id: string | null
  assigned_room_name: string | null
  assignment_reason: string
}

export interface BookingResult {
  booking_id: string | null
  success: boolean
  error_message: string | null
}

// Service categories enum
export type ServiceCategory = 
  | 'facial'
  | 'massage'
  | 'body_treatment'
  | 'body_scrub'
  | 'waxing'
  | 'package'
  | 'membership'

// GHL categories enum for webhook integration
export type GHLServiceCategory = 
  | 'BODY MASSAGES'
  | 'BODY TREATMENTS & BOOSTERS'
  | 'FACE TREATMENTS'
  | 'FACE & BODY PACKAGES'
  | 'Waxing Services'

// Booking status enum
export type BookingStatus = 
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

// Payment option enum
export type PaymentOption = 
  | 'deposit'
  | 'full_payment'
  | 'pay_on_location'

// Payment status enum (matches database)
export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'partial'
  | 'refunded'
  | 'failed'
  | 'not_applicable'

// Staff availability type enum
export type AvailabilityType = 
  | 'unavailable'
  | 'break'
  | 'blocked'

// Form types for booking flow
export interface BookingFormData {
  service_id: string
  staff_id: string
  room_id: number
  customer_name: string
  customer_email: string
  customer_phone?: string
  appointment_date: string
  start_time: string
  notes?: string
  payment_option?: PaymentOption
  payment_status?: PaymentStatus
}

// Validation types
export interface BookingValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Time slot interface for booking calendar
export interface TimeSlot {
  time: string
  available: boolean
  staff?: Staff
  room?: Room
  booking?: Booking
}

// Day schedule interface
export interface DaySchedule {
  date: string
  timeSlots: TimeSlot[]
  staffAvailability: Record<string, boolean>
  roomAvailability: Record<string, boolean>
}

// Booking calendar interface
export interface BookingCalendar {
  month: number
  year: number
  days: DaySchedule[]
}

// Customer booking history
export interface CustomerBookingHistory {
  customer_email: string
  bookings: BookingWithRelations[]
  totalBookings: number
  totalSpent: number
  favoriteServices: Service[]
  preferredStaff: Staff[]
}

// Business hours configuration
export interface BusinessHours {
  open_time: string
  close_time: string
  last_booking_offset: number // minutes before closing
  slot_duration: number // minutes
  buffer_time: number // minutes between appointments
}

// Room capabilities
export type RoomCapability = 
  | 'facial'
  | 'massage'
  | 'waxing'
  | 'body_treatment'
  | 'body_scrub'

// Staff capabilities (service categories they can perform)
export type StaffCapability = ServiceCategory

// Booking conflict detection
export interface BookingConflict {
  type: 'staff' | 'room' | 'business_hours' | 'date_range'
  message: string
  conflicting_booking?: Booking
}

// Search and filter types
export interface ServiceFilter {
  category?: ServiceCategory
  min_price?: number
  max_price?: number
  max_duration?: number
  requires_couples_room?: boolean
  requires_room_3?: boolean
}

export interface BookingFilter {
  date_from?: string
  date_to?: string
  staff_id?: string
  room_id?: string
  status?: BookingStatus
  customer_email?: string
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}