#!/usr/bin/env node

/**
 * Clear All Bookings Script
 * 
 * Safely deletes all booking data from the Supabase database
 * while preserving customers, staff, services, and configuration.
 * 
 * Usage:
 *   node scripts/clear-bookings.js
 * 
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function clearAllBookings() {
  console.log('🧹 Starting database cleanup...\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nMake sure these are set in your .env.local file')
    process.exit(1)
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log('🔗 Connected to Supabase database')
    
    // 1. Get current counts before deletion
    console.log('\n📊 Current database state:')
    
    const { data: bookingsCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
    
    const { data: paymentsCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
    
    console.log(`   Bookings: ${bookingsCount?.length || 0}`)
    console.log(`   Payments: ${paymentsCount?.length || 0}`)

    if ((bookingsCount?.length || 0) === 0) {
      console.log('\n✅ No bookings found - database is already clean!')
      return
    }

    // 2. Delete payments first (foreign key dependency)
    console.log('\n🗑️  Deleting payments...')
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (paymentsError) {
      console.error('❌ Error deleting payments:', paymentsError)
      throw paymentsError
    }
    console.log('   ✅ Payments deleted')

    // 3. Delete all bookings
    console.log('\n🗑️  Deleting bookings...')
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError)
      throw bookingsError
    }
    console.log('   ✅ Bookings deleted')

    // 4. Clean up any staff availability blocks if they exist
    console.log('\n🗑️  Cleaning up staff availability blocks...')
    try {
      const { error: availabilityError } = await supabase
        .from('staff_availability')
        .delete()
        .in('availability_type', ['blocked', 'break'])

      if (availabilityError && !availabilityError.message.includes('relation "staff_availability" does not exist')) {
        console.warn('⚠️  Warning cleaning availability blocks:', availabilityError.message)
      } else {
        console.log('   ✅ Staff availability blocks cleaned')
      }
    } catch (err) {
      console.log('   ℹ️  Staff availability table not found (optional)')
    }

    // 5. Verify deletion
    console.log('\n🔍 Verifying deletion...')
    
    const { data: remainingBookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
    
    const { data: remainingPayments } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })

    console.log(`   Remaining bookings: ${remainingBookings?.length || 0}`)
    console.log(`   Remaining payments: ${remainingPayments?.length || 0}`)

    // 6. Show preserved data
    console.log('\n📋 Data preserved:')
    
    const tables = [
      { name: 'customers', label: 'Customers' },
      { name: 'staff', label: 'Staff' },
      { name: 'services', label: 'Services' },
      { name: 'rooms', label: 'Rooms' },
      { name: 'admin_users', label: 'Admin users' }
    ]

    for (const table of tables) {
      try {
        const { data } = await supabase
          .from(table.name)
          .select('id', { count: 'exact', head: true })
        console.log(`   ${table.label}: ${data?.length || 0}`)
      } catch (err) {
        console.log(`   ${table.label}: N/A (table not accessible)`)
      }
    }

    console.log('\n🎉 SUCCESS! All bookings have been cleared.')
    console.log('   📅 Your booking system is ready for fresh appointments')
    console.log('   👥 All customer, staff, and service data preserved')
    console.log('   🔐 Admin accounts remain intact')

  } catch (error) {
    console.error('\n❌ FAILED to clear bookings:', error.message)
    console.error('\nThis could be due to:')
    console.error('   - Network connectivity issues')
    console.error('   - Invalid service role key')
    console.error('   - Database permissions')
    console.error('   - Foreign key constraints')
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  clearAllBookings()
    .then(() => {
      console.log('\n✨ Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { clearAllBookings }