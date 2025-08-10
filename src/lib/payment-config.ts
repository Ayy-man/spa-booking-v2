// Payment Links Configuration for Dermal Skin Clinic
// Simplified to support only deposit payments

export interface PaymentLink {
  serviceId?: string;
  serviceName: string;
  price: number;
  paymentUrl: string;
  type: 'deposit';
  status: 'active' | 'inactive';
}

// Deposit payment configuration for all services
export const DEPOSIT_PAYMENT_CONFIG: PaymentLink = {
  serviceName: 'Service Deposit',
  price: 30.00,
  paymentUrl: 'https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034',
  type: 'deposit',
  status: 'active'
};

/**
 * Get payment link information for a service (always returns deposit)
 * @param serviceName - The name of the service (unused, kept for compatibility)
 * @returns PaymentLink object with deposit payment information
 */
export function getPaymentLink(serviceName: string): PaymentLink {
  return DEPOSIT_PAYMENT_CONFIG;
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

// Payment flow types (simplified)
export type PaymentFlow = 'deposit' | 'pay_on_location';

/**
 * Determine payment flow (always returns deposit or pay on location choice)
 * @param isExistingCustomer - Whether customer is existing or new (unused, kept for compatibility)
 * @param serviceName - Name of the service being booked (unused, kept for compatibility)
 * @returns PaymentFlow type for the booking
 */
export function determinePaymentFlow(
  isExistingCustomer: boolean, 
  serviceName: string
): PaymentFlow {
  // All customers get choice between deposit or pay on location
  return 'deposit';
}

const paymentConfig = {
  DEPOSIT_PAYMENT_CONFIG,
  getPaymentLink,
  generatePaymentUrl,
  isValidPaymentUrl,
  determinePaymentFlow
};

export default paymentConfig;