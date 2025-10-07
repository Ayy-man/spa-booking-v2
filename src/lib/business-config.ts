// Business Configuration for Webhook Data
export const BUSINESS_CONFIG = {
  name: 'Demo Spa & Wellness',
  location: 'Demo City',
  address: '123 Demo Street, Demo City 12345',
  phone: '555-0100',
  email: 'info@demo-spa.com',
  website: 'https://demo-spa.com',
  timezone: 'Pacific/Guam',
  currency: 'USD',
  
  // Business hours
  businessHours: {
    monday: { open: '09:00', close: '19:00' },
    tuesday: { open: 'closed', close: 'closed' },
    wednesday: { open: '09:00', close: '19:00' },
    thursday: { open: 'closed', close: 'closed' },
    friday: { open: '09:00', close: '19:00' },
    saturday: { open: '09:00', close: '19:00' },
    sunday: { open: '09:00', close: '19:00' }
  },
  
  // Staff off days (matching current system)
  staffOffDays: [2, 4], // Tuesday = 2, Thursday = 4
  
  // Social media and marketing
  social: {
    facebook: 'https://facebook.com/demospa',
    instagram: 'https://instagram.com/demospa',
    google: 'https://g.page/demospa'
  }
} as const

// Payment configuration
export const PAYMENT_CONFIG = {
  newCustomerDeposit: 25,
  paymentMethods: ['online_payment', 'on_arrival'],
  currency: 'USD'
} as const