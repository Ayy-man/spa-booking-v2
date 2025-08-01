// Generated types for Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          service_id: string
          staff_id: string
          room_id: string
          customer_name: string
          customer_email: string
          customer_phone: string | null
          booking_date: string
          start_time: string
          end_time: string
          status: string
          special_requests: string | null
          total_price: number | null
          booking_group_id: string | null
          booking_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          staff_id: string
          room_id: string
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          booking_date: string
          start_time: string
          end_time: string
          status?: string
          special_requests?: string | null
          total_price?: number | null
          booking_group_id?: string | null
          booking_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          staff_id?: string
          room_id?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: string
          special_requests?: string | null
          total_price?: number | null
          booking_group_id?: string | null
          booking_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          room_number: number
          capacity: number
          capabilities: string[]
          has_body_scrub_equipment: boolean
          is_couples_room: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          room_number: number
          capacity?: number
          capabilities?: string[]
          has_body_scrub_equipment?: boolean
          is_couples_room?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          room_number?: number
          capacity?: number
          capabilities?: string[]
          has_body_scrub_equipment?: boolean
          is_couples_room?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          duration: number
          price: number
          category: string
          requires_couples_room: boolean
          requires_body_scrub_room: boolean
          is_couples_service: boolean
          is_package: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration: number
          price: number
          category: string
          requires_couples_room?: boolean
          requires_body_scrub_room?: boolean
          is_couples_service?: boolean
          is_package?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration?: number
          price?: number
          category?: string
          requires_couples_room?: boolean
          requires_body_scrub_room?: boolean
          is_couples_service?: boolean
          is_package?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          can_perform_services: string[]
          default_room_id: string | null
          schedule: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          can_perform_services?: string[]
          default_room_id?: string | null
          schedule?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          can_perform_services?: string[]
          default_room_id?: string | null
          schedule?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      staff_schedules: {
        Row: {
          id: string
          staff_id: string
          date: string
          start_time: string
          end_time: string
          is_available: boolean
          break_start: string | null
          break_end: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          start_time: string
          end_time: string
          is_available?: boolean
          break_start?: string | null
          break_end?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          start_time?: string
          end_time?: string
          is_available?: boolean
          break_start?: string | null
          break_end?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_optimal_room: {
        Args: {
          p_service_id: string
          p_preferred_staff_id?: string
          p_booking_date?: string
          p_start_time?: string
        }
        Returns: {
          assigned_room_id: string
          assigned_room_name: string
          assignment_reason: string
        }[]
      }
      check_staff_capability: {
        Args: {
          p_staff_id: string
          p_service_id: string
        }
        Returns: boolean
      }
      get_available_time_slots: {
        Args: {
          p_date: string
          p_service_id?: string
          p_staff_id?: string
        }
        Returns: {
          available_time: string
          available_staff_id: string
          available_staff_name: string
          available_room_id: string
          available_room_name: string
        }[]
      }
      get_staff_schedule: {
        Args: {
          p_staff_id: string
          p_date: string
        }
        Returns: {
          is_available: boolean
          work_start: string
          work_end: string
          break_times: Json
        }[]
      }
      process_booking: {
        Args: {
          p_service_id: string
          p_staff_id: string
          p_room_id: string
          p_customer_name: string
          p_customer_email: string
          p_customer_phone?: string
          p_booking_date: string
          p_start_time: string
          p_special_requests?: string
        }
        Returns: {
          booking_id: string
          success: boolean
          error_message: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}