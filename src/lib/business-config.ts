// Business Configuration for Webhook Data
export const BUSINESS_CONFIG = {
  name: 'Dermal Skin Clinic & Spa',
  location: 'Guam',
  address: 'Tamuning, Guam 96913',
  phone: '+1-671-646-DERM',
  email: 'info@dermalskinclinicspa.com',
  website: 'https://dermalskinclinicspa.com',
  timezone: 'Pacific/Guam',
  currency: 'USD',
  
  // Business hours
  businessHours: {
    monday: { open: '08:00', close: '20:00' },
    tuesday: { open: 'closed', close: 'closed' },
    wednesday: { open: '08:00', close: '20:00' },
    thursday: { open: 'closed', close: 'closed' },
    friday: { open: '08:00', close: '20:00' },
    saturday: { open: '08:00', close: '20:00' },
    sunday: { open: '08:00', close: '20:00' }
  },
  
  // Staff off days (matching current system)
  staffOffDays: [2, 4], // Tuesday = 2, Thursday = 4
  
  // Social media and marketing
  social: {
    facebook: 'https://facebook.com/dermalskinclinicspa',
    instagram: 'https://instagram.com/dermalskinclinicspa',
    google: 'https://g.page/dermalskinclinicspa'
  }
} as const

// Payment configuration
export const PAYMENT_CONFIG = {
  newCustomerDeposit: 25,
  paymentMethods: ['online_payment', 'on_arrival'],
  currency: 'USD'
} as const

// Couples booking configuration
export const COUPLES_ROOM_CONFIG = {
  preferredCouplesRoomIds: [3, 2], // Room 3 preferred, Room 2 fallback
  minimumCapacity: 2,
  allowFallbackToSingleRooms: false, // Strict couples room requirement
  bufferTimeMinutes: 15 // Buffer time between appointments
} as const

// Staff assignment configuration
export const STAFF_ASSIGNMENT_CONFIG = {
  anyStaffId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  anyStaffAlias: 'any',
  requireDifferentStaffForCouples: true,
  maxStaffResolutionAttempts: 3
} as const