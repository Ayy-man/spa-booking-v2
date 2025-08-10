// ============================================================================
// EMERGENCY FIX: Clear Corrupted Booking State
// ============================================================================
// Copy and paste this into your browser console (F12) to clear corrupted booking data

// Clear all booking-related localStorage data
console.log('🧹 Clearing corrupted booking state...');

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
        console.log(`❌ Removing: ${key}`);
        localStorage.removeItem(key);
    }
});

// Show what was cleared
console.log('✅ Booking state cleared. Remaining keys:', 
    Object.keys(localStorage).filter(key => 
        key.includes('booking') || 
        key.includes('selected') || 
        key.includes('customer')
    )
);

console.log('🔄 Refreshing page in 2 seconds...');
setTimeout(() => {
    window.location.reload();
}, 2000);