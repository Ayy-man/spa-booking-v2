// Payment Links Configuration for Dermal Skin Clinic
// This file contains all service-specific payment links and fallback configuration

export interface PaymentLink {
  serviceId?: string;
  serviceName: string;
  price: number;
  paymentUrl: string;
  type: 'full_payment' | 'deposit';
  status: 'active' | 'inactive';
}

// Service-specific full payment links
export const FULL_PAYMENT_LINKS: Record<string, PaymentLink> = {
  'dermal-vip': {
    serviceName: 'Dermal VIP Card',
    price: 50.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fda87d6ab800471e71642',
    type: 'full_payment',
    status: 'active'
  },
  'underarm-cleaning': {
    serviceName: 'Underarm Cleaning',
    price: 99.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fda45eba11020cd8e1b78',
    type: 'full_payment',
    status: 'active'
  },
  'deep-cleansing-facial': {
    serviceName: 'Deep Cleansing Facial',
    price: 79.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd9c4eba11083f48e1b74',
    type: 'full_payment',
    status: 'active'
  },
  'chemical-peel': {
    serviceName: 'Chemical Peel (Body)',
    price: 85.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd991d6ab80be28e7163c',
    type: 'full_payment',
    status: 'active'
  },
  'stretching-body-massage': {
    serviceName: 'Stretching Body Massage',
    price: 85.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd979dd6ac691b9c5c442',
    type: 'full_payment',
    status: 'active'
  },
  'full-leg-waxing': {
    serviceName: 'Full Leg Waxing',
    price: 80.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd922d6ab80078fe7163a',
    type: 'full_payment',
    status: 'active'
  },
  'hot-stone-massage': {
    serviceName: 'Hot Stone Massage',
    price: 120.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd903dd6c6a64e11c5c43d',
    type: 'full_payment',
    status: 'active'
  },
  'underarm-whitening': {
    serviceName: 'Underarm/Inguinal Whitening',
    price: 150.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd8e2eba110bb348e1b6f',
    type: 'full_payment',
    status: 'active'
  },
  'maternity-massage': {
    serviceName: 'Maternity Massage',
    price: 85.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd886d6ab80364be71637',
    type: 'full_payment',
    status: 'active'
  },
  'basic-facial': {
    serviceName: 'Basic Facial',
    price: 65.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd858eba110277a8e1b6b',
    type: 'full_payment',
    status: 'active'
  },
  'deep-tissue-body-massage': {
    serviceName: 'Deep Tissue Body Massage',
    price: 90.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd822d6ab80c204e71635',
    type: 'full_payment',
    status: 'active'
  },
  'brazilian-wax-men': {
    serviceName: 'Brazilian Waxing (Men)',
    price: 75.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd7fbd6c6a662c4c5c43b',
    type: 'full_payment',
    status: 'active'
  },
  'vitamin-c-facial': {
    serviceName: 'Vitamin C Facial',
    price: 120.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd7e0d6ab809e8fe71633',
    type: 'full_payment',
    status: 'active'
  },
  'brazilian-wax': {
    serviceName: 'Brazilian Wax (Women)',
    price: 60.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd7bdd6ab801842e71631',
    type: 'full_payment',
    status: 'active'
  },
  'acne-vulgaris-facial': {
    serviceName: 'Acne Vulgaris Facial',
    price: 120.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd79dd6ab806346e7162f',
    type: 'full_payment',
    status: 'active'
  },
  'whitening-kojic-facial': {
    serviceName: 'Whitening Kojic Facial',
    price: 90.00,
    paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd744eba110e0d48e1b67',
    type: 'full_payment',
    status: 'active'
  }
};

// Fallback deposit payment configuration
export const DEPOSIT_PAYMENT_CONFIG: PaymentLink = {
  serviceName: 'Service Deposit',
  price: 30.00,
  paymentUrl: 'https://link.fastpaydirect.com/payment-link/688fd64ad6ab80e9dae7162b',
  type: 'deposit',
  status: 'active'
};

// Service name mapping for flexible matching
export const SERVICE_NAME_MAPPING: Record<string, string> = {
  // Exact matches
  'Dermal VIP Card': 'dermal-vip',
  'Underarm Cleaning': 'underarm-cleaning',
  'Deep Cleansing Facial': 'deep-cleansing-facial',
  'Chemical Peel (Body)': 'chemical-peel',
  'Stretching Body Massage': 'stretching-body-massage',
  'Full Leg Waxing': 'full-leg-waxing',
  'Hot Stone Massage': 'hot-stone-massage',
  'Underarm/Inguinal Whitening': 'underarm-whitening',
  'Maternity Massage': 'maternity-massage',
  'Basic Facial': 'basic-facial',
  'Deep Tissue Body Massage': 'deep-tissue-body-massage',
  'Brazilian Waxing (Men)': 'brazilian-wax-men',
  'Vitamin C Facial': 'vitamin-c-facial',
  'Brazilian Wax (Women)': 'brazilian-wax',
  'Acne Vulgaris Facial': 'acne-vulgaris-facial',
  'Whitening Kojic Facial': 'whitening-kojic-facial',
  
  // Alternative name variations
  'Facial': 'basic-facial',
  'Deep Tissue Body': 'deep-tissue-body-massage',
  'Brazilian Waxing (Women)': 'brazilian-wax',
  'Underarm Whitening': 'underarm-whitening'
};

/**
 * Get payment link information for a service
 * @param serviceName - The name of the service
 * @returns PaymentLink object with payment information
 */
export function getPaymentLink(serviceName: string): PaymentLink {
  // Try direct mapping first
  const mappingKey = SERVICE_NAME_MAPPING[serviceName];
  if (mappingKey && FULL_PAYMENT_LINKS[mappingKey]) {
    return FULL_PAYMENT_LINKS[mappingKey];
  }
  
  // Try direct lookup
  const directKey = serviceName.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  
  if (FULL_PAYMENT_LINKS[directKey]) {
    return FULL_PAYMENT_LINKS[directKey];
  }
  
  // Return deposit fallback
  return DEPOSIT_PAYMENT_CONFIG;
}

/**
 * Check if a service has a full payment link available
 * @param serviceName - The name of the service
 * @returns boolean indicating if full payment is available
 */
export function hasFullPaymentLink(serviceName: string): boolean {
  const paymentLink = getPaymentLink(serviceName);
  return paymentLink.type === 'full_payment';
}

/**
 * Get all services with full payment links
 * @returns Array of PaymentLink objects for services with full payment
 */
export function getAllFullPaymentServices(): PaymentLink[] {
  return Object.values(FULL_PAYMENT_LINKS);
}

/**
 * Generate payment URL with return parameters
 * @param paymentUrl - Base payment URL
 * @param returnUrl - URL to return to after payment
 * @param metadata - Additional metadata for payment tracking
 * @returns Complete payment URL with return parameters
 */
export function generatePaymentUrl(
  paymentUrl: string, 
  returnUrl: string, 
  metadata?: Record<string, string>
): string {
  const url = new URL(paymentUrl);
  
  // Add return URL
  url.searchParams.set('return_url', returnUrl);
  
  // Add metadata if provided
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

/**
 * Validate payment link URL
 * @param url - Payment URL to validate
 * @returns boolean indicating if URL is valid FastPayDirect link
 */
export function isValidPaymentUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'link.fastpaydirect.com' && 
           parsedUrl.pathname.startsWith('/payment-link/');
  } catch {
    return false;
  }
}

// Payment flow types
export type PaymentFlow = 'full_payment' | 'deposit' | 'pay_on_location' | 'existing_customer_choice';

/**
 * Determine payment flow based on customer type and service
 * @param isExistingCustomer - Whether customer is existing or new
 * @param serviceName - Name of the service being booked
 * @returns PaymentFlow type for the booking
 */
export function determinePaymentFlow(
  isExistingCustomer: boolean, 
  serviceName: string
): PaymentFlow {
  if (!isExistingCustomer) {
    return 'deposit'; // New customers must use deposit
  }
  
  // Existing customers always get choice between full payment, deposit, or pay on location
  return 'existing_customer_choice';
}

const paymentConfig = {
  FULL_PAYMENT_LINKS,
  DEPOSIT_PAYMENT_CONFIG,
  SERVICE_NAME_MAPPING,
  getPaymentLink,
  hasFullPaymentLink,
  getAllFullPaymentServices,
  generatePaymentUrl,
  isValidPaymentUrl,
  determinePaymentFlow
};

export default paymentConfig;