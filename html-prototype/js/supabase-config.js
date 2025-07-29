// Supabase Configuration
const SUPABASE_URL = 'https://doradsvnphdwotkeiylv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmFkc3ZucGhkd290a2VpeWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDA3MTYsImV4cCI6MjA2OTMxNjcxNn0.4DbNHxjhOshrrQGYxjH8QI4V2sqx2VLr7nH0stSEXZk';

// Initialize Supabase client (use window.supabase from CDN)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database API Functions for Booking System
const SupabaseAPI = {
    // Services
    async getServices() {
        try {
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .eq('is_active', true)
                .order('category, name');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching services:', error);
            throw error;
        }
    },

    async getServicesByCategory(category) {
        try {
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .eq('category', category)
                .eq('is_active', true)
                .order('name');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching services by category:', error);
            throw error;
        }
    },

    // Staff
    async getStaff() {
        try {
            const { data, error } = await supabaseClient
                .from('staff')
                .select('*')
                .eq('is_active', true)
                .order('name');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching staff:', error);
            throw error;
        }
    },

    async getAvailableStaff(serviceCategory, date) {
        try {
            const dayOfWeek = new Date(date).getDay();
            console.log('Looking for staff with capability:', serviceCategory, 'on day:', dayOfWeek);
            
            // First, get all active staff to debug
            const { data: allStaff, error: allError } = await supabaseClient
                .from('staff')
                .select('*')
                .eq('is_active', true);
            
            if (allError) throw allError;
            console.log('All active staff:', allStaff);
            
            // Use proper PostgreSQL array query syntax for enum arrays
            // The @> operator checks if the left array contains the right array
            const { data, error } = await supabaseClient
                .from('staff')
                .select('*')
                .eq('is_active', true)
                .filter('capabilities', 'cs', `{${serviceCategory}}`)
                .filter('work_days', 'cs', `{${dayOfWeek}}`);
            
            if (error) {
                console.error('PostgreSQL array query error:', error);
                
                // Fallback: Use RPC function for complex array queries
                const { data: rpcData, error: rpcError } = await supabaseClient
                    .rpc('get_available_staff_for_service', {
                        service_category: serviceCategory,
                        day_of_week: dayOfWeek
                    });
                
                if (rpcError) {
                    console.error('RPC function also failed:', rpcError);
                    // Final fallback: filter on client side
                    const availableStaff = allStaff.filter(staff => 
                        staff.capabilities && staff.capabilities.includes(serviceCategory) &&
                        staff.work_days && staff.work_days.includes(dayOfWeek)
                    );
                    console.log('Client-side filtered staff:', availableStaff);
                    return availableStaff;
                }
                
                console.log('RPC filtered available staff:', rpcData);
                return rpcData;
            }
            
            console.log('Filtered available staff:', data);
            return data;
        } catch (error) {
            console.error('Error fetching available staff:', error);
            
            // Enhanced error logging
            if (error.message) {
                console.error('Error message:', error.message);
            }
            if (error.details) {
                console.error('Error details:', error.details);
            }
            if (error.hint) {
                console.error('Error hint:', error.hint);
            }
            
            throw error;
        }
    },

    // Customers
    async createCustomer(customerData) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .insert([customerData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating customer:', error);
            throw error;
        }
    },

    async findCustomerByEmail(email) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .select('*')
                .eq('email', email)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return data;
        } catch (error) {
            console.error('Error finding customer:', error);
            throw error;
        }
    },

    // Bookings
    async createBooking(bookingData) {
        try {
            const { data, error } = await supabaseClient
                .from('bookings')
                .insert([bookingData])
                .select(`
                    *,
                    customer:customers(*),
                    service:services(*),
                    staff:staff(*),
                    room:rooms(*)
                `)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    },

    async checkAvailability(staffId, date, time) {
        try {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('id')
                .eq('staff_id', staffId)
                .eq('booking_date', date)
                .eq('booking_time', time)
                .neq('status', 'cancelled');
            
            if (error) throw error;
            return data.length === 0; // Available if no bookings found
        } catch (error) {
            console.error('Error checking availability:', error);
            throw error;
        }
    },

    async getBookingsByDate(date) {
        try {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select(`
                    *,
                    customer:customers(*),
                    service:services(*),
                    staff:staff(*),
                    room:rooms(*)
                `)
                .eq('booking_date', date)
                .neq('status', 'cancelled')
                .order('booking_time');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching bookings:', error);
            throw error;
        }
    },

    // Enhanced staff availability query with better error handling
    async getAvailableStaffOptimized(serviceCategory, date, startTime = null, endTime = null) {
        try {
            const dayOfWeek = new Date(date).getDay();
            console.log('Optimized query for staff with capability:', serviceCategory, 'on day:', dayOfWeek);
            
            // If time is provided, check for conflicts
            if (startTime && endTime) {
                const { data, error } = await supabaseClient
                    .rpc('get_available_staff_with_conflicts', {
                        service_category: serviceCategory,
                        day_of_week: dayOfWeek,
                        appointment_date: date,
                        start_time: startTime,
                        end_time: endTime
                    });
                
                if (error) throw error;
                
                // Filter out staff with conflicts
                const availableStaff = data.filter(staff => !staff.has_conflicts);
                console.log('Available staff without conflicts:', availableStaff);
                return availableStaff;
            } else {
                // Just check basic availability
                const { data, error } = await supabaseClient
                    .rpc('get_available_staff_for_service', {
                        service_category: serviceCategory,
                        day_of_week: dayOfWeek
                    });
                
                if (error) throw error;
                console.log('Available staff for service:', data);
                return data;
            }
        } catch (error) {
            console.error('Error in optimized staff availability query:', error);
            
            // Fallback to original method
            console.log('Falling back to original getAvailableStaff method');
            return await this.getAvailableStaff(serviceCategory, date);
        }
    },

    // Test function to verify staff availability works for all service categories
    async testStaffAvailability() {
        const serviceCategories = ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special'];
        const testDate = new Date().toISOString().split('T')[0]; // Today's date
        const results = {};
        
        console.log('Testing staff availability for all service categories...');
        
        for (const category of serviceCategories) {
            try {
                console.log(`\n--- Testing ${category} ---`);
                
                // Test original method
                const originalResult = await this.getAvailableStaff(category, testDate);
                
                // Test optimized method
                const optimizedResult = await this.getAvailableStaffOptimized(category, testDate);
                
                results[category] = {
                    originalCount: originalResult.length,
                    optimizedCount: optimizedResult.length,
                    originalStaff: originalResult.map(s => ({ id: s.id, name: s.name })),
                    optimizedStaff: optimizedResult.map(s => ({ id: s.id, name: s.name })),
                    success: true
                };
                
                console.log(`${category}: Found ${originalResult.length} staff (original) vs ${optimizedResult.length} staff (optimized)`);
                
            } catch (error) {
                console.error(`Error testing ${category}:`, error);
                results[category] = {
                    error: error.message,
                    success: false
                };
            }
        }
        
        console.log('\n=== Test Results Summary ===');
        console.log(JSON.stringify(results, null, 2));
        
        return results;
    },

    // Function to verify staff capabilities
    async verifyStaffCapabilities(staffId, serviceCategory) {
        try {
            const { data, error } = await supabaseClient
                .rpc('can_staff_perform_service', {
                    staff_id_param: staffId,
                    service_category_param: serviceCategory
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error verifying staff capabilities:', error);
            throw error;
        }
    },

    // Utility functions
    async testConnection() {
        try {
            const { data, error, count } = await supabaseClient
                .from('services')
                .select('*', { count: 'exact' })
                .limit(1);
            
            if (error) throw error;
            return { success: true, serviceCount: count };
        } catch (error) {
            console.error('Database connection test failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in other files
window.SupabaseAPI = SupabaseAPI;
window.supabaseClient = supabaseClient;