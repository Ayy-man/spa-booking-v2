// Quick test to verify room availability fix
import { supabaseClient } from './src/lib/supabase.js'

async function testRoomAvailability() {
  console.log('🔍 Testing room availability fix...\n')
  
  try {
    // Test 1: Basic connection
    console.log('1. Testing database connection...')
    const { data: rooms, error: roomsError } = await supabaseClient.getRooms()
    
    if (roomsError) {
      console.error('❌ Database connection failed:', roomsError.message)
      return
    }
    
    console.log('✅ Database connected successfully')
    console.log(`   Found ${rooms?.length || 0} active rooms\n`)
    
    // Test 2: Test room assignment for individual booking
    console.log('2. Testing individual booking room assignment...')
    try {
      const roomAssignment = await supabaseClient.getOptimalRoomAssignment(
        'basic_facial', // A common service
        'any',          // Any staff
        '2025-01-15',   // Future date
        '10:00'         // Morning time
      )
      
      if (roomAssignment) {
        console.log('✅ Individual booking room assignment works')
        console.log(`   Assigned room: ${roomAssignment.assigned_room_id} (${roomAssignment.assigned_room_name})`)
        console.log(`   Reason: ${roomAssignment.assignment_reason}\n`)
      } else {
        console.log('❌ Individual booking room assignment returned null\n')
      }
    } catch (error) {
      console.error('❌ Individual booking room assignment failed:', error.message, '\n')
    }
    
    // Test 3: Test couples booking room assignment
    console.log('3. Testing couples booking room assignment...')
    try {
      const couplesResult = await supabaseClient.processCouplesBooking({
        primary_service_id: 'balinese_massage',
        secondary_service_id: 'balinese_massage', 
        primary_staff_id: 'any',
        secondary_staff_id: 'any',
        customer_name: 'Test Customer',
        customer_email: 'test@test.com',
        customer_phone: '555-0123',
        appointment_date: '2025-01-16',
        start_time: '14:00',
        notes: 'Test booking'
      })
      
      if (couplesResult && couplesResult.length > 0) {
        console.log('✅ Couples booking assignment works')
        console.log(`   Created ${couplesResult.length} bookings`)
        couplesResult.forEach((booking, i) => {
          console.log(`   Booking ${i+1}: Room ${booking.room_id}`)
        })
      } else {
        console.log('❌ Couples booking assignment failed or returned empty')
      }
    } catch (error) {
      console.error('❌ Couples booking assignment failed:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testRoomAvailability().then(() => {
  console.log('\n🏁 Test completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 Test crashed:', error.message)
  process.exit(1)
})