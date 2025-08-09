// Simple database connection and diagnostic test
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Database Connection Diagnostic\n')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase.from('rooms').select('id, name, is_active').limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('   Full error:', error)
      return false
    }
    
    console.log('✅ Connected successfully')
    console.log('   Sample room data:', data)
    
    // Test 2: Test room function
    console.log('\n2. Testing assign_optimal_room function...')
    const { data: roomData, error: roomError } = await supabase.rpc('assign_optimal_room', {
      p_service_id: 'basic_facial',
      p_preferred_staff_id: null,
      p_booking_date: '2025-01-15',
      p_start_time: '10:00'
    })
    
    if (roomError) {
      console.error('❌ Room assignment function failed:', roomError.message)
      console.error('   Full error:', roomError)
      console.error('   This is likely the cause of "room not available" errors')
      return false
    }
    
    console.log('✅ Room assignment function works')
    console.log('   Result:', roomData)
    
    // Test 3: Check room capabilities
    console.log('\n3. Checking room capabilities...')
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, capabilities, is_active')
      .eq('is_active', true)
    
    if (roomsError) {
      console.error('❌ Room capabilities check failed:', roomsError.message)
      return false
    }
    
    console.log('✅ Room capabilities loaded')
    rooms.forEach(room => {
      console.log(`   Room ${room.id} (${room.name}): ${room.capabilities}`)
    })
    
    // Test 4: Check services
    console.log('\n4. Checking services...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category')
      .eq('is_active', true)
      .limit(5)
    
    if (servicesError) {
      console.error('❌ Services check failed:', servicesError.message)
      return false
    }
    
    console.log('✅ Services loaded')
    services.forEach(service => {
      console.log(`   ${service.id}: ${service.name} (${service.category})`)
    })
    
    console.log('\n🎉 All tests passed! Database connection is working properly.')
    return true
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message)
    return false
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1)
})