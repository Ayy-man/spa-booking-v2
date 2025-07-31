#!/usr/bin/env node

/**
 * Test Script for All GHL Webhooks
 * 
 * This script tests all four webhook endpoints:
 * 1. New Customer Webhook
 * 2. Booking Confirmation Webhook
 * 3. Booking Update Webhook
 * 4. Show/No-Show Webhook
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testCustomer = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+1-671-555-0456',
  isNewCustomer: true
};

const testBooking = {
  service: 'Deep Tissue Massage',
  serviceId: 'massage_002',
  serviceCategory: 'Massage Services',
  date: '2024-01-20',
  time: '16:00',
  duration: 90,
  price: 120,
  staff: 'Mike Johnson',
  staffId: 'staff_002',
  room: 'Massage Room 2',
  roomId: 2
};

async function testWebhook(endpoint, data) {
  try {
    console.log(`\n🧪 Testing ${endpoint}...`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${endpoint} - SUCCESS`);
      console.log(`   Message: ${result.message}`);
      if (result.data) {
        console.log(`   Data:`, JSON.stringify(result.data, null, 2));
      }
    } else {
      console.log(`❌ ${endpoint} - FAILED`);
      console.log(`   Error: ${result.error}`);
    }
    
    return result.success;
  } catch (error) {
    console.log(`❌ ${endpoint} - ERROR`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting GHL Webhook Tests...\n');
  
  const results = {
    newCustomer: false,
    bookingConfirmation: false,
    bookingUpdate: false,
    showNoShow: false
  };

  // Test 1: New Customer Webhook
  results.newCustomer = await testWebhook('/api/test-booking', {
    customer: testCustomer,
    booking: testBooking
  });

  // Test 2: Booking Confirmation Webhook
  results.bookingConfirmation = await testWebhook('/api/test-booking', {
    customer: { ...testCustomer, isNewCustomer: false },
    booking: testBooking,
    confirm: true
  });

  // Test 3: Booking Update Webhook
  results.bookingUpdate = await testWebhook('/api/test-booking', {
    customer: { ...testCustomer, isNewCustomer: false },
    booking: { ...testBooking, date: '2024-01-21', time: '17:00' },
    update: true,
    changes: {
      oldDate: '2024-01-20',
      newDate: '2024-01-21',
      oldTime: '16:00',
      newTime: '17:00',
      reason: 'Customer requested reschedule'
    }
  });

  // Test 4: Show/No-Show Webhook - Show
  results.showNoShow = await testWebhook('/api/test-show-no-show-webhook', {
    status: 'show',
    adminNotes: 'Customer arrived 5 minutes early and was very satisfied with the service'
  });

  // Test 5: Show/No-Show Webhook - No Show
  await testWebhook('/api/test-show-no-show-webhook', {
    status: 'no_show',
    adminNotes: 'Customer did not arrive and did not call to cancel. Follow-up required.'
  });

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, success]) => {
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All webhook tests completed successfully!');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/test-show-no-show-webhook`, {
      method: 'GET'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the development server with:');
    console.log('   npm run dev');
    console.log('\nThen run this script again.');
    process.exit(1);
  }
  
  console.log('✅ Server is running. Starting tests...\n');
  
  await runAllTests();
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebhook, runAllTests }; 