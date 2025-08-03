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
          customer_id: string
          service_id: string
          staff_id: string
          room_id: number
          appointment_date: string
          start_time: string
          end_time: string
          duration: number
          total_price: number
          discount: number
          final_price: number
          status: string
          payment_status: string
          notes: string | null
          internal_notes: string | null
          created_by: string | null
          checked_in_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          booking_group_id: string | null
          booking_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_id: string
          staff_id: string
          room_id: number
          appointment_date: string
          start_time: string
          end_time: string
          duration: number
          total_price: number
          discount?: number
          final_price: number
          status?: string
          payment_status?: string
          notes?: string | null
          internal_notes?: string | null
          created_by?: string | null
          booking_group_id?: string | null
          booking_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          service_id?: string
          staff_id?: string
          room_id?: number
          appointment_date?: string
          start_time?: string
          end_time?: string
          duration?: number
          total_price?: number
          discount?: number
          final_price?: number
          status?: string
          payment_status?: string
          notes?: string | null
          internal_notes?: string | null
          created_by?: string | null
          booking_group_id?: string | null
          booking_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string
          date_of_birth: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_conditions: string | null
          allergies: string | null
          skin_type: string | null
          preferences: Json
          notes: string | null
          total_visits: number
          total_spent: number
          last_visit_date: string | null
          marketing_consent: boolean
          is_active: boolean
          auth_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone: string
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          skin_type?: string | null
          preferences?: Json
          notes?: string | null
          total_visits?: number
          total_spent?: number
          last_visit_date?: string | null
          marketing_consent?: boolean
          is_active?: boolean
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          skin_type?: string | null
          preferences?: Json
          notes?: string | null
          total_visits?: number
          total_spent?: number
          last_visit_date?: string | null
          marketing_consent?: boolean
          is_active?: boolean
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: number
          name: string
          capacity: number
          capabilities: string[]
          equipment: string[]
          features: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          capacity: number
          capabilities: string[]
          equipment?: string[]
          features?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          capacity?: number
          capabilities?: string[]
          equipment?: string[]
          features?: string[]
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
          category: string
          duration: number
          price: number
          requires_room_3: boolean
          is_couples_service: boolean
          is_active: boolean
          service_capabilities: string[]
          ghl_category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          duration: number
          price: number
          requires_room_3?: boolean
          is_couples_service?: boolean
          is_active?: boolean
          service_capabilities?: string[]
          ghl_category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          duration?: number
          price?: number
          requires_room_3?: boolean
          is_couples_service?: boolean
          is_active?: boolean
          service_capabilities?: string[]
          ghl_category?: string
          created_at?: string
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          specialties: string | null
          capabilities: string[]
          work_days: number[]
          default_room_id: number | null
          role: string
          initials: string | null
          hourly_rate: number | null
          is_active: boolean
          auth_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          specialties?: string | null
          capabilities: string[]
          work_days: number[]
          default_room_id?: number | null
          role?: string
          initials?: string | null
          hourly_rate?: number | null
          is_active?: boolean
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          specialties?: string | null
          capabilities?: string[]
          work_days?: number[]
          default_room_id?: number | null
          role?: string
          initials?: string | null
          hourly_rate?: number | null
          is_active?: boolean
          auth_user_id?: string | null
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