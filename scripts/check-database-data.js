// Script to check current database data before wiping
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabaseData() {
  console.log('🔍 Checking current database data...\n')

  try {
    // Check customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (customersError) {
      console.error('❌ Error fetching customers:', customersError)
    } else {
      console.log(`📊 Customers: ${customers?.length || 0} total`)
      if (customers && customers.length > 0) {
        console.log('   Recent customers:')
        customers.forEach(customer => {
          console.log(`   - ${customer.first_name} ${customer.last_name} (${customer.email})`)
        })
      }
    }

    // Check bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, appointment_date, start_time, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
    } else {
      console.log(`\n📅 Bookings: ${bookings?.length || 0} total`)
      if (bookings && bookings.length > 0) {
        console.log('   Recent bookings:')
        bookings.forEach(booking => {
          console.log(`   - ${booking.appointment_date} ${booking.start_time} (${booking.status})`)
        })
      }
    }

    // Check payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, payment_method, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError)
    } else {
      console.log(`\n💰 Payments: ${payments?.length || 0} total`)
      if (payments && payments.length > 0) {
        console.log('   Recent payments:')
        payments.forEach(payment => {
          console.log(`   - $${payment.amount} (${payment.payment_method}) - ${payment.status}`)
        })
      }
    }

    // Check services (reference data - won't be deleted)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category, price')
      .order('name')

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError)
    } else {
      console.log(`\n🛎️  Services: ${services?.length || 0} total (reference data - preserved)`)
    }

    // Check staff (reference data - won't be deleted)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, role')
      .order('name')

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError)
    } else {
      console.log(`\n👥 Staff: ${staff?.length || 0} total (reference data - preserved)`)
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📋 SUMMARY')
    console.log('='.repeat(50))
    
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })

    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    const { count: totalPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })

    console.log(`Customers: ${totalCustomers || 0}`)
    console.log(`Bookings: ${totalBookings || 0}`)
    console.log(`Payments: ${totalPayments || 0}`)
    console.log(`Services: ${services?.length || 0} (preserved)`)
    console.log(`Staff: ${staff?.length || 0} (preserved)`)

    if ((totalCustomers || 0) > 0 || (totalBookings || 0) > 0 || (totalPayments || 0) > 0) {
      console.log('\n⚠️  WARNING: Customer data exists and will be deleted!')
      console.log('   Run the migration: supabase/migrations/015_wipe_customer_data.sql')
    } else {
      console.log('\n✅ Database is already clean - no customer data to delete')
    }

  } catch (error) {
    console.error('❌ Error checking database:', error)
  }
}

checkDatabaseData() 