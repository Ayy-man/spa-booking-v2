const { createClient } = require('@supabase/supabase-js')

// Test the booking errors functionality
async function testBookingErrors() {
  console.log('Testing booking errors functionality...')
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test 1: Check if booking_errors table exists
    console.log('\n1. Checking if booking_errors table exists...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'booking_errors')
    
    if (tableError) {
      console.error('Error checking table:', tableError)
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ booking_errors table exists')
    } else {
      console.log('❌ booking_errors table does not exist')
    }
    
    // Test 2: Try to insert a test error
    console.log('\n2. Testing error insertion...')
    const testError = {
      error_type: 'test_error',
      error_message: 'Test error for debugging',
      error_details: { test: true, timestamp: new Date().toISOString() },
      booking_data: { test: 'data' },
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      is_couples_booking: false
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('booking_errors')
      .insert(testError)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting test error:', insertError)
    } else {
      console.log('✅ Test error inserted successfully:', insertData[0].id)
      
      // Clean up test data
      await supabase
        .from('booking_errors')
        .delete()
        .eq('id', insertData[0].id)
      console.log('🧹 Test data cleaned up')
    }
    
    // Test 3: Check existing errors
    console.log('\n3. Checking existing errors...')
    const { data: existingErrors, error: fetchError } = await supabase
      .from('booking_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (fetchError) {
      console.error('❌ Error fetching errors:', fetchError)
    } else {
      console.log(`✅ Found ${existingErrors.length} existing errors`)
      if (existingErrors.length > 0) {
        console.log('Sample error:', {
          id: existingErrors[0].id,
          error_type: existingErrors[0].error_type,
          error_message: existingErrors[0].error_message,
          created_at: existingErrors[0].created_at
        })
      }
    }
    
    // Test 4: Check abandoned bookings
    console.log('\n4. Checking for abandoned bookings...')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: abandonedBookings, error: abandonedError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
    
    if (abandonedError) {
      console.error('❌ Error fetching abandoned bookings:', abandonedError)
    } else {
      console.log(`✅ Found ${abandonedBookings.length} potentially abandoned bookings`)
      if (abandonedBookings.length > 0) {
        console.log('Sample abandoned booking:', {
          id: abandonedBookings[0].id,
          customer_name: abandonedBookings[0].customer_name,
          service_name: abandonedBookings[0].service_name,
          created_at: abandonedBookings[0].created_at
        })
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the test
testBookingErrors()
