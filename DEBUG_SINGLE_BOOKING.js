// ============================================================================
// DEBUG SCRIPT: Single Booking Issue - "Two Massages" Problem
// ============================================================================
// Run this in your browser console (F12) to debug the booking issue

console.log('🔍 DEBUGGING SINGLE BOOKING ISSUE...');

// STEP 1: Clear all booking state
console.log('🧹 Clearing all booking state...');
const keysToRemove = [
    'bookingData',
    'selectedService', 
    'selectedDate',
    'selectedTime',
    'selectedStaff',
    'secondaryStaff',
    'customerInfo',
    'paymentType'
];

keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
        console.log(`❌ Removing corrupted data: ${key} =`, localStorage.getItem(key));
        localStorage.removeItem(key);
    }
});

// STEP 2: Check current page and what's displayed
console.log('📍 Current page:', window.location.pathname);
console.log('🔍 Current localStorage keys:', Object.keys(localStorage));

// STEP 3: If on booking page, check what services are shown
if (window.location.pathname === '/booking') {
    console.log('🎯 You are on the booking page');
    console.log('👉 Select "Basic Facial (For Men & Women)" to test');
    console.log('👀 Watch for console logs that show what service is selected');
}

// STEP 4: If on couples booking modal, check the state
if (document.querySelector('[class*="couples"]') || document.querySelector('[class*="modal"]')) {
    console.log('🎭 Booking modal is open');
    console.log('👉 Make sure "Single Booking" is selected (should show green "Selected" badge)');
    console.log('👉 Click Continue and watch console for booking data');
}

// STEP 5: Monitor what gets saved to localStorage
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    if (key.includes('booking') || key.includes('service')) {
        console.log(`💾 SAVING to localStorage: ${key} =`, JSON.parse(value));
    }
    originalSetItem.call(this, key, value);
};

console.log('✅ Debug setup complete!');
console.log('📝 Steps to test:');
console.log('1. Select "Basic Facial (For Men & Women)"');
console.log('2. Ensure "Single Booking" is selected (green badge)');
console.log('3. Click Continue');
console.log('4. Check console for what gets saved');
console.log('5. Report back what you see!');

// Show current booking data if any exists
setTimeout(() => {
    const bookingData = localStorage.getItem('bookingData');
    if (bookingData) {
        console.log('⚠️ Found existing booking data:', JSON.parse(bookingData));
    } else {
        console.log('✅ No booking data found - clean state');
    }
}, 1000);