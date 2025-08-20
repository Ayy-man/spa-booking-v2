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
      booking_errors: {
        Row: {
          id: string
          error_type: string
          error_message: string
          error_details: Json | null
          booking_data: Json
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          service_name: string | null
          service_id: string | null
          appointment_date: string | null
          appointment_time: string | null
          staff_name: string | null
          staff_id: string | null
          room_id: number | null
          secondary_service_name: string | null
          secondary_service_id: string | null
          secondary_staff_name: string | null
          secondary_staff_id: string | null
          user_agent: string | null
          ip_address: string | null
          session_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          last_retry_at: string | null
          is_couples_booking: boolean
          resolved: boolean
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          error_type: string
          error_message: string
          error_details?: Json | null
          booking_data: Json
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          service_name?: string | null
          service_id?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          staff_name?: string | null
          staff_id?: string | null
          room_id?: number | null
          secondary_service_name?: string | null
          secondary_service_id?: string | null
          secondary_staff_name?: string | null
          secondary_staff_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          session_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          last_retry_at?: string | null
          is_couples_booking?: boolean
          resolved?: boolean
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          error_type?: string
          error_message?: string
          error_details?: Json | null
          booking_data?: Json
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          service_name?: string | null
          service_id?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          staff_name?: string | null
          staff_id?: string | null
          room_id?: number | null
          secondary_service_name?: string | null
          secondary_service_id?: string | null
          secondary_staff_name?: string | null
          secondary_staff_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          session_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          last_retry_at?: string | null
          is_couples_booking?: boolean
          resolved?: boolean
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
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
          waiver_signed: boolean
          waiver_data: Json | null
          waiver_signed_at: string | null
          payment_option: string
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
          waiver_signed?: boolean
          waiver_data?: Json | null
          waiver_signed_at?: string | null
          payment_option?: string
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
          waiver_signed?: boolean
          waiver_data?: Json | null
          waiver_signed_at?: string | null
          payment_option?: string
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          first_name: string
          last_name: string | null
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
          emergency_contact_relationship: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name?: string | null
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
          emergency_contact_relationship?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string | null
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
          emergency_contact_relationship?: string | null
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
          requires_couples_room: boolean
          is_active: boolean
          service_capabilities: string[]
          ghl_category: string
          popularity_score: number
          is_recommended: boolean
          is_popular: boolean
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
          requires_couples_room?: boolean
          is_active?: boolean
          service_capabilities?: string[]
          ghl_category: string
          popularity_score?: number
          is_recommended?: boolean
          is_popular?: boolean
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
          requires_couples_room?: boolean
          is_active?: boolean
          service_capabilities?: string[]
          ghl_category?: string
          popularity_score?: number
          is_recommended?: boolean
          is_popular?: boolean
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
          service_exclusions: string[]
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
          service_exclusions?: string[]
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
          service_exclusions?: string[]
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
      admin_users: {
        Row: {
          id: string
          user_id: string
          email: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          role: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          notes?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          payment_method: string
          transaction_id: string | null
          status: string
          processed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          payment_method: string
          transaction_id?: string | null
          status?: string
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          payment_method?: string
          transaction_id?: string | null
          status?: string
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          service_ids: string[]
          total_duration: number
          individual_price: number
          package_price: number
          savings: number
          is_couples: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          service_ids: string[]
          total_duration: number
          individual_price: number
          package_price: number
          savings?: number
          is_couples?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          service_ids?: string[]
          total_duration?: number
          individual_price?: number
          package_price?: number
          savings?: number
          is_couples?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      waivers: {
        Row: {
          id: string
          customer_id: string | null
          booking_id: string | null
          service_category: string
          service_name: string
          signature: string
          agreed_to_terms: boolean
          medical_conditions: string | null
          allergies: string | null
          skin_conditions: string | null
          medications: string | null
          pregnancy_status: boolean | null
          previous_waxing: boolean | null
          recent_sun_exposure: boolean | null
          emergency_contact_name: string
          emergency_contact_phone: string
          waiver_content: Json | null
          ip_address: string | null
          user_agent: string | null
          signed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          booking_id?: string | null
          service_category: string
          service_name: string
          signature: string
          agreed_to_terms?: boolean
          medical_conditions?: string | null
          allergies?: string | null
          skin_conditions?: string | null
          medications?: string | null
          pregnancy_status?: boolean | null
          previous_waxing?: boolean | null
          recent_sun_exposure?: boolean | null
          emergency_contact_name: string
          emergency_contact_phone: string
          waiver_content?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          signed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          booking_id?: string | null
          service_category?: string
          service_name?: string
          signature?: string
          agreed_to_terms?: boolean
          medical_conditions?: string | null
          allergies?: string | null
          skin_conditions?: string | null
          medications?: string | null
          pregnancy_status?: boolean | null
          previous_waxing?: boolean | null
          recent_sun_exposure?: boolean | null
          emergency_contact_name?: string
          emergency_contact_phone?: string
          waiver_content?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          signed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      schedule_blocks: {
        Row: {
          id: string
          staff_id: string
          block_type: 'full_day' | 'time_range'
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          block_type: 'full_day' | 'time_range'
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          staff_id?: string
          block_type?: 'full_day' | 'time_range'
          start_date?: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      walk_ins: {
        Row: {
          id: string
          customer_id: string | null
          booking_id: string | null
          customer_name: string
          customer_email: string | null
          customer_phone: string
          service_name: string
          service_category: string
          scheduling_type: string
          scheduled_date: string | null
          scheduled_time: string | null
          notes: string | null
          status: string
          checked_in_at: string | null
          completed_at: string | null
          ghl_webhook_sent: boolean
          ghl_webhook_sent_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          booking_id?: string | null
          customer_name: string
          customer_email?: string | null
          customer_phone: string
          service_name: string
          service_category: string
          scheduling_type?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          notes?: string | null
          status?: string
          checked_in_at?: string | null
          completed_at?: string | null
          ghl_webhook_sent?: boolean
          ghl_webhook_sent_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          booking_id?: string | null
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string
          service_name?: string
          service_category?: string
          scheduling_type?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          notes?: string | null
          status?: string
          checked_in_at?: string | null
          completed_at?: string | null
          ghl_webhook_sent?: boolean
          ghl_webhook_sent_at?: string | null
          created_by?: string | null
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