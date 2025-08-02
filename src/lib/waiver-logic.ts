// Waiver detection and management logic

export interface Service {
  id: string
  name: string
  duration: number
  price: number
}

export interface BookingData {
  isCouplesBooking: boolean
  primaryService: Service
  secondaryService?: Service
  totalPrice: number
  totalDuration: number
}

export interface WaiverRequirement {
  type: 'radio_frequency' | 'chemical_peel' | 'waxing' | 'microdermabrasion'
  serviceName: string
  required: boolean
}

/**
 * Determine which waivers are required based on booked services
 */
export function getRequiredWaivers(bookingData: BookingData): WaiverRequirement[] {
  const requirements: WaiverRequirement[] = []
  const services = [bookingData.primaryService]
  
  if (bookingData.secondaryService) {
    services.push(bookingData.secondaryService)
  }

  // Check each service for waiver requirements
  services.forEach(service => {
    const serviceName = service.name.toLowerCase()
    
    // Radio Frequency services
    if (serviceName.includes('radio frequency') || serviceName.includes('rf ')) {
      requirements.push({
        type: 'radio_frequency',
        serviceName: service.name,
        required: true
      })
    }
    
    // Chemical Peel services
    if (serviceName.includes('chemical peel') || serviceName.includes('peel')) {
      requirements.push({
        type: 'chemical_peel',
        serviceName: service.name,
        required: true
      })
    }
    
    // Waxing services
    if (serviceName.includes('wax') || 
        serviceName.includes('brazilian') || 
        serviceName.includes('bikini') || 
        serviceName.includes('eyebrow') ||
        serviceName.includes('lip') ||
        serviceName.includes('chin') ||
        serviceName.includes('underarm') ||
        serviceName.includes('leg') ||
        serviceName.includes('arm') ||
        serviceName.includes('face') ||
        serviceName.includes('chest') ||
        serviceName.includes('stomach') ||
        serviceName.includes('shoulder') ||
        serviceName.includes('feet')) {
      requirements.push({
        type: 'waxing',
        serviceName: service.name,
        required: true
      })
    }
    
    // Microdermabrasion services
    if (serviceName.includes('microderm') || serviceName.includes('microdermabrasion')) {
      requirements.push({
        type: 'microdermabrasion',
        serviceName: service.name,
        required: true
      })
    }
  })

  // Remove duplicates by type
  const uniqueRequirements = requirements.filter((req, index, arr) => 
    arr.findIndex(r => r.type === req.type) === index
  )

  return uniqueRequirements
}

/**
 * Check if any waivers are required for the booking
 */
export function hasWaiverRequirements(bookingData: BookingData): boolean {
  return getRequiredWaivers(bookingData).length > 0
}

/**
 * Get waiver types that need to be completed
 */
export function getWaiverTypes(bookingData: BookingData): string[] {
  return getRequiredWaivers(bookingData).map(req => req.type)
}

/**
 * Get human-readable waiver names
 */
export function getWaiverDisplayName(type: string): string {
  switch (type) {
    case 'radio_frequency':
      return 'Radio Frequency Treatment Waiver'
    case 'chemical_peel':
      return 'Chemical Peel Treatment Waiver'
    case 'waxing':
      return 'Waxing Service Waiver'
    case 'microdermabrasion':
      return 'Microdermabrasion Treatment Waiver'
    default:
      return 'Treatment Waiver'
  }
}

/**
 * Store waiver completion in session storage
 */
export function storeWaiverCompletion(waiverType: string, waiverData: any): void {
  const waivers = getStoredWaivers()
  waivers[waiverType] = {
    ...waiverData,
    completedAt: new Date().toISOString()
  }
  sessionStorage.setItem('completedWaivers', JSON.stringify(waivers))
}

/**
 * Get stored waiver completions from session storage
 */
export function getStoredWaivers(): Record<string, any> {
  if (typeof window === 'undefined') return {}
  const stored = sessionStorage.getItem('completedWaivers')
  return stored ? JSON.parse(stored) : {}
}

/**
 * Check if a specific waiver type has been completed
 */
export function isWaiverCompleted(waiverType: string): boolean {
  const waivers = getStoredWaivers()
  return !!waivers[waiverType]
}

/**
 * Check if all required waivers have been completed for a booking
 */
export function areAllWaiversCompleted(bookingData: BookingData): boolean {
  const requiredTypes = getWaiverTypes(bookingData)
  return requiredTypes.every(type => isWaiverCompleted(type))
}

/**
 * Clear waiver completions (for new booking session)
 */
export function clearWaiverCompletions(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('completedWaivers')
  }
}