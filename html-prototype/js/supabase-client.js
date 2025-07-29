// Supabase Client Configuration for Dermal Skin Clinic
// This file provides database connectivity and API functions for the booking system

// Supabase configuration
const SUPABASE_URL = 'https://doradsvnphdwotkeiylv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmFkc3ZucGhkd290a2VpeWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDA3MTYsImV4cCI6MjA2OTMxNjcxNn0.4DbNHxjhOshrrQGYxjH8QI4V2sqx2VLr7nH0stSEXZk';

// Initialize Supabase client (requires Supabase JS library)
// Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
let supabase;

// Initialize Supabase client when library is loaded
if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Database API Functions
class DermalSpaDB {
    
    // ========================================
    // SERVICE MANAGEMENT
    // ========================================
    
    // Get all active services
    static async getServices() {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true })
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching services:', error);
            throw error;
        }
    }
    
    // Get services by category
    static async getServicesByCategory(category) {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('category', category)
                .eq('is_active', true)
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching services by category:', error);
            throw error;
        }
    }
    
    // Get service by ID
    static async getService(serviceId) {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .eq('is_active', true)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching service:', error);
            throw error;
        }
    }
    
    // ========================================
    // STAFF MANAGEMENT
    // ========================================
    
    // Get all active staff
    static async getStaff() {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching staff:', error);
            throw error;
        }
    }
    
    // Get staff member by ID
    static async getStaffMember(staffId) {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('id', staffId)
                .eq('is_active', true)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching staff member:', error);
            throw error;
        }
    }
    
    // Get staff available for a service
    static async getAvailableStaff(serviceCategory, date) {
        try {
            const dayOfWeek = new Date(date).getDay();
            
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .contains('capabilities', [serviceCategory])
                .contains('work_days', [dayOfWeek])
                .eq('is_active', true)
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching available staff:', error);
            throw error;
        }
    }
    
    // ========================================
    // ROOM MANAGEMENT
    // ========================================
    
    // Get all active rooms
    static async getRooms() {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('is_active', true)
                .order('id', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching rooms:', error);
            throw error;
        }
    }
    
    // Get rooms available for a service
    static async getAvailableRooms(serviceCategory, requiresRoom3 = false) {
        try {
            let query = supabase
                .from('rooms')
                .select('*')
                .contains('capabilities', [serviceCategory])
                .eq('is_active', true);
            
            if (requiresRoom3) {
                query = query.eq('id', 3);
            }
            
            const { data, error } = await query.order('id', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching available rooms:', error);
            throw error;
        }
    }
    
    // ========================================
    // AVAILABILITY CHECKING
    // ========================================
    
    // Get service availability using database function
    static async getServiceAvailability(serviceId, date, preferredStaffId = null) {
        try {
            const { data, error } = await supabase
                .rpc('get_service_availability', {
                    p_service_id: serviceId,
                    p_date: date,
                    p_preferred_staff_id: preferredStaffId
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error checking service availability:', error);
            throw error;
        }
    }
    
    // Check if staff is available at specific time
    static async checkStaffAvailability(staffId, date, startTime, endTime, excludeBookingId = null) {
        try {
            const { data, error } = await supabase
                .rpc('check_staff_availability', {
                    p_staff_id: staffId,
                    p_date: date,
                    p_start_time: startTime,
                    p_end_time: endTime,
                    p_exclude_booking_id: excludeBookingId
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error checking staff availability:', error);
            throw error;
        }
    }
    
    // Check if room is available at specific time
    static async checkRoomAvailability(roomId, date, startTime, endTime, excludeBookingId = null) {
        try {
            const { data, error } = await supabase
                .rpc('check_room_availability', {
                    p_room_id: roomId,
                    p_date: date,
                    p_start_time: startTime,
                    p_end_time: endTime,
                    p_exclude_booking_id: excludeBookingId
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error checking room availability:', error);
            throw error;
        }
    }
    
    // ========================================
    // CUSTOMER MANAGEMENT
    // ========================================
    
    // Create or update customer
    static async upsertCustomer(customerData) {
        try {
            const { data, error } = await supabase
                .rpc('upsert_customer', {
                    p_first_name: customerData.firstName,
                    p_last_name: customerData.lastName,
                    p_phone: customerData.phone,
                    p_email: customerData.email || null,
                    p_date_of_birth: customerData.dateOfBirth || null,
                    p_address: customerData.address || null,
                    p_medical_conditions: customerData.medicalConditions || null,
                    p_allergies: customerData.allergies || null,
                    p_marketing_consent: customerData.marketingConsent || false
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error upserting customer:', error);
            throw error;
        }
    }
    
    // Get customer by ID
    static async getCustomer(customerId) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching customer:', error);
            throw error;
        }
    }
    
    // Search customers by phone or email
    static async searchCustomers(searchTerm) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .or(`phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
                .eq('is_active', true)
                .limit(10);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
    }
    
    // Get customer booking history
    static async getCustomerHistory(customerId, limit = 10) {
        try {
            const { data, error } = await supabase
                .rpc('get_customer_history', {
                    p_customer_id: customerId,
                    p_limit: limit
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching customer history:', error);
            throw error;
        }
    }
    
    // ========================================
    // BOOKING MANAGEMENT
    // ========================================
    
    // Create a new booking
    static async createBooking(bookingData) {
        try {
            const { data, error } = await supabase
                .rpc('create_booking', {
                    p_customer_id: bookingData.customerId,
                    p_service_id: bookingData.serviceId,
                    p_staff_id: bookingData.staffId,
                    p_room_id: bookingData.roomId,
                    p_appointment_date: bookingData.appointmentDate,
                    p_start_time: bookingData.startTime,
                    p_notes: bookingData.notes || null,
                    p_created_by: bookingData.createdBy || null
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }
    
    // Get booking by ID with full details
    static async getBooking(bookingId) {
        try {
            const { data, error } = await supabase
                .from('booking_details')
                .select('*')
                .eq('id', bookingId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching booking:', error);
            throw error;
        }
    }
    
    // Update booking status
    static async updateBookingStatus(bookingId, status, notes = null) {
        try {
            const updateData = { status, updated_at: new Date().toISOString() };
            if (notes) updateData.internal_notes = notes;
            
            const { data, error } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', bookingId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating booking status:', error);
            throw error;
        }
    }
    
    // Reschedule booking
    static async rescheduleBooking(bookingId, newDate, newStartTime, newStaffId = null, newRoomId = null) {
        try {
            const { data, error } = await supabase
                .rpc('reschedule_booking', {
                    p_booking_id: bookingId,
                    p_new_date: newDate,
                    p_new_start_time: newStartTime,
                    p_new_staff_id: newStaffId,
                    p_new_room_id: newRoomId
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error rescheduling booking:', error);
            throw error;
        }
    }
    
    // Cancel booking
    static async cancelBooking(bookingId, reason = null) {
        try {
            const { data, error } = await supabase
                .rpc('cancel_booking', {
                    p_booking_id: bookingId,
                    p_cancellation_reason: reason
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error cancelling booking:', error);
            throw error;
        }
    }
    
    // Get daily schedule
    static async getDailySchedule(date) {
        try {
            const { data, error } = await supabase
                .from('daily_schedule')
                .select('*')
                .eq('appointment_date', date)
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching daily schedule:', error);
            throw error;
        }
    }
    
    // ========================================
    // REPORTING AND ANALYTICS
    // ========================================
    
    // Get dashboard metrics
    static async getDashboardMetrics(date = null) {
        try {
            const { data, error } = await supabase
                .rpc('get_dashboard_metrics', {
                    p_date: date || new Date().toISOString().split('T')[0]
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            throw error;
        }
    }
    
    // Get daily revenue report
    static async getDailyRevenue(date) {
        try {
            const { data, error } = await supabase
                .rpc('get_daily_revenue', {
                    p_date: date
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching daily revenue:', error);
            throw error;
        }
    }
    
    // Get popular services
    static async getPopularServices(startDate, endDate, limit = 10) {
        try {
            const { data, error } = await supabase
                .rpc('get_popular_services', {
                    p_start_date: startDate,
                    p_end_date: endDate,
                    p_limit: limit
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching popular services:', error);
            throw error;
        }
    }
    
    // Get staff performance
    static async getStaffPerformance(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .rpc('get_staff_performance', {
                    p_start_date: startDate,
                    p_end_date: endDate
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching staff performance:', error);
            throw error;
        }
    }
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    // Format time for display
    static formatTime(timeString) {
        if (!timeString) return '';
        
        const time = new Date(`2000-01-01T${timeString}`);
        return time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    
    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    
    // Calculate end time based on start time and duration
    static calculateEndTime(startTime, durationMinutes) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(start.getTime() + (durationMinutes * 60000));
        return end.toTimeString().slice(0, 5);
    }
    
    // Validate business hours
    static validateBusinessHours(date, startTime, duration) {
        const businessStart = '09:00';
        const businessEnd = '18:00';
        const endTime = this.calculateEndTime(startTime, duration);
        
        return startTime >= businessStart && endTime <= businessEnd;
    }
    
    // Get day name from date
    static getDayName(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(date).getDay()];
    }
    
    // Check if date is in the past
    static isDateInPast(date) {
        const today = new Date();
        const checkDate = new Date(date);
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DermalSpaDB;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DermalSpaDB = DermalSpaDB;
}