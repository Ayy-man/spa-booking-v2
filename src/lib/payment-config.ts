// Payment configuration for Dermal Spa Booking System

export const PAYMENT_CONFIG = {
  // Deposit amount for new customers
  depositAmount: 25,
  
  // Currency
  currency: 'USD',
  
  // Payment link base URL (GoHighLevel)
  ghlPaymentBaseUrl: 'https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034',
  
  // Payment types
  paymentTypes: {
    DEPOSIT: 'deposit',
    FULL: 'full'
  } as const,
  
  // Payment descriptions
  paymentDescriptions: {
    deposit: 'Secure your appointment with a $25 deposit. Pay the remaining balance at your appointment.',
    full: 'Pay the full service amount now. No additional payment required at your appointment.'
  }
}

export type PaymentType = typeof PAYMENT_CONFIG.paymentTypes[keyof typeof PAYMENT_CONFIG.paymentTypes]

export interface PaymentOption {
  type: PaymentType
  amount: number
  description: string
  label: string
}

/**
 * Get payment options for a given service price
 */
export function getPaymentOptions(servicePrice: number): PaymentOption[] {
  return [
    {
      type: PAYMENT_CONFIG.paymentTypes.DEPOSIT,
      amount: PAYMENT_CONFIG.depositAmount,
      description: PAYMENT_CONFIG.paymentDescriptions.deposit,
      label: `Pay Deposit ($${PAYMENT_CONFIG.depositAmount})`
    },
    {
      type: PAYMENT_CONFIG.paymentTypes.FULL,
      amount: servicePrice,
      description: PAYMENT_CONFIG.paymentDescriptions.full,
      label: `Pay Full Amount ($${servicePrice})`
    }
  ]
}

/**
 * Generate payment URL with amount and return URL
 */
export function generatePaymentUrl(amount: number, returnUrl: string): string {
  const params = new URLSearchParams({
    amount: amount.toString(),
    return_url: returnUrl
  })
  
  return `${PAYMENT_CONFIG.ghlPaymentBaseUrl}?${params.toString()}`
}

/**
 * Calculate total price for couples booking
 */
export function calculateCouplesPrice(primaryServicePrice: number, secondaryServicePrice?: number): number {
  return primaryServicePrice + (secondaryServicePrice || primaryServicePrice)
}