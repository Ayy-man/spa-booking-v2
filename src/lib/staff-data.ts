export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  specialties: string
  initials: string
  capabilities: string[]
  work_days: number[]  // 0=Sunday, 1=Monday, etc. to match database schema
  default_room_id: number | null  // Match database field name
  available?: boolean
}

// Centralized staff data with capabilities and schedules matching database schema
export const staffMembers: StaffMember[] = [
  {
    id: 'any',
    name: 'Any Available Staff',
    email: '',
    phone: '',
    specialties: 'Any qualified staff member',
    initials: 'AA',
    capabilities: ['facials', 'waxing', 'treatments', 'massages'],
    work_days: [0, 1, 2, 3, 4, 5, 6], // All days (0=Sunday, 6=Saturday)
    default_room_id: null
  },
  {
    id: 'selma',
    name: 'Selma Villaver',
    email: 'happyskinhappyyou@gmail.com',
    phone: '(671) 482-7765',
    specialties: 'All Facials (except dermaplaning)',
    initials: 'SV',
    capabilities: ['facials'],
    work_days: [1, 3, 5, 6, 0], // Mon, Wed, Fri, Sat, Sun
    default_room_id: 1
  },
  {
    id: 'robyn',
    name: 'Robyn Camacho',
    email: 'robyncmcho@gmail.com',
    phone: '(671) 480-7862',
    specialties: 'Facials, Waxing, Body Treatments, Massages',
    initials: 'RC',
    capabilities: ['facials', 'waxing', 'treatments', 'massages'],
    work_days: [0, 1, 2, 3, 4, 5, 6], // Full schedule (all days)
    default_room_id: 3
  },
  {
    id: 'tanisha',
    name: 'Tanisha Harris',
    email: 'misstanishababyy@gmail.com',
    phone: '(671) 747-5728',
    specialties: 'Facials and Waxing',
    initials: 'TH',
    capabilities: ['facials', 'waxing'],
    work_days: [1, 3, 5, 6, 0], // Mon, Wed, Fri, Sat, Sun (off Tue/Thu)
    default_room_id: 2
  },
  {
    id: 'leonel',
    name: 'Leonel Sidon',
    email: 'sidonleonel@gmail.com',
    phone: '(671) 747-1882',
    specialties: 'Body Massages and Treatments (Sundays only)',
    initials: 'LS',
    capabilities: ['massages', 'treatments'],
    work_days: [0], // Sunday only
    default_room_id: null
  }
]

// Staff name mapping for display purposes
export const staffNameMap = {
  'any': 'Any Available Staff',
  'selma': 'Selma Villaver',
  'robyn': 'Robyn Camacho',
  'tanisha': 'Tanisha Harris',  
  'leonel': 'Leonel Sidon'
} as const

// Helper function to determine service category - updated to match staff capabilities
export const getServiceCategory = (serviceName: string): string => {
  if (!serviceName) return 'unknown'
  
  const name = serviceName.toLowerCase()
  
  // Facial services
  if (name.includes('facial') || name.includes('microderm') || name.includes('vitamin c') || name.includes('acne') || name.includes('placenta') || name.includes('collagen') || name.includes('whitening') || name.includes('kojic')) {
    return 'facials'
  }
  
  // Massage services
  if (name.includes('massage') || name.includes('balinese') || name.includes('deep tissue') || name.includes('hot stone') || name.includes('maternity') || name.includes('stretching')) {
    return 'massages'
  }
  
  // Waxing services
  if (name.includes('wax') || name.includes('brazilian') || name.includes('bikini') || name.includes('eyebrow') || name.includes('lip') || name.includes('chin') || name.includes('neck') || name.includes('leg') || name.includes('underarm') || name.includes('chest') || name.includes('stomach') || name.includes('shoulders') || name.includes('feet')) {
    return 'waxing'
  }
  
  // Body treatments (includes scrubs, which require Room 3)
  if (name.includes('body') || name.includes('scrub') || name.includes('back treatment') || name.includes('chemical peel') || name.includes('microdermabrasion') || name.includes('moisturizing') || name.includes('mud mask') || name.includes('underarm cleaning') || name.includes('salt body') || name.includes('body wrap')) {
    return 'treatments'
  }
  
  // Package services
  if (name.includes('package') || name.includes('+')) {
    return 'packages'
  }
  
  // Special services
  if (name.includes('vajacial') || name.includes('vip') || name.includes('dermal vip')) {
    return 'special'
  }
  
  return 'unknown'
}

// Helper function to check if staff can perform service
export const canStaffPerformService = (staff: StaffMember, serviceCategory: string): boolean => {
  if (staff.id === 'any') return true
  return staff.capabilities.includes(serviceCategory) || staff.capabilities.includes('packages')
}

// Helper function to check if staff is available on selected date
export const isStaffAvailableOnDate = (staff: StaffMember, dateString: string): boolean => {
  if (!dateString || staff.id === 'any') return true
  
  const date = new Date(dateString)
  const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, etc.
  
  return staff.work_days.includes(dayOfWeek)
}

// Get available staff for a service and date
export const getAvailableStaff = (serviceName: string, selectedDate: string): StaffMember[] => {
  const serviceCategory = getServiceCategory(serviceName)
  
  return staffMembers.filter(staff => {
    const canPerformService = canStaffPerformService(staff, serviceCategory)
    const availableOnDate = isStaffAvailableOnDate(staff, selectedDate)
    return canPerformService && availableOnDate
  }).map(staff => ({
    ...staff,
    available: isStaffAvailableOnDate(staff, selectedDate) && canStaffPerformService(staff, serviceCategory)
  }))
}

// Convert database staff to StaffMember interface for compatibility
export const convertDatabaseStaffToStaffMember = (dbStaff: any): StaffMember => {
  return {
    id: dbStaff.id,
    name: dbStaff.name,
    email: dbStaff.email || '',
    phone: dbStaff.phone || '',
    specialties: dbStaff.specialties || '',
    initials: dbStaff.initials || dbStaff.name.split(' ').map((n: string) => n[0]).join(''),
    capabilities: dbStaff.capabilities || [],
    work_days: dbStaff.work_days || [],
    default_room_id: dbStaff.default_room_id,
    available: true
  }
}

// Helper function to check if a staff member from database can perform a service
export const canDatabaseStaffPerformService = (dbStaff: any, serviceCategory: string): boolean => {
  if (!dbStaff || !dbStaff.capabilities) return false
  if (dbStaff.id === 'any') return true
  
  // Check if staff has capability for this service category
  return dbStaff.capabilities.includes(serviceCategory) || dbStaff.capabilities.includes('packages')
}

// Helper function to check if database staff is available on date
export const isDatabaseStaffAvailableOnDate = (dbStaff: any, dateString: string): boolean => {
  if (!dateString || dbStaff.id === 'any') return true
  if (!dbStaff.work_days || !Array.isArray(dbStaff.work_days)) return false
  
  const date = new Date(dateString)
  const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, etc.
  
  return dbStaff.work_days.includes(dayOfWeek)
}