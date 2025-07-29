export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  specialties: string
  initials: string
  capabilities: string[]
  workDays: string[]
  defaultRoom: number | null
  available?: boolean
}

// Centralized staff data with capabilities and schedules
export const staffMembers: StaffMember[] = [
  {
    id: 'any',
    name: 'Any Available Staff',
    email: '',
    phone: '',
    specialties: 'Any qualified staff member',
    initials: 'AA',
    capabilities: ['facials', 'waxing', 'body_treatments', 'massages'],
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    defaultRoom: null
  },
  {
    id: 'selma',
    name: 'Selma Villaver',
    email: 'happyskinhappyyou@gmail.com',
    phone: '(671) 482-7765',
    specialties: 'All Facials (except dermaplaning)',
    initials: 'SV',
    capabilities: ['facials'],
    workDays: ['monday', 'wednesday', 'friday', 'saturday', 'sunday'],
    defaultRoom: 1
  },
  {
    id: 'robyn',
    name: 'Robyn Camacho',
    email: 'robyncmcho@gmail.com',
    phone: '(671) 480-7862',
    specialties: 'Facials, Waxing, Body Treatments, Massages',
    initials: 'RC',
    capabilities: ['facials', 'waxing', 'body_treatments', 'massages'],
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    defaultRoom: 3
  },
  {
    id: 'tanisha',
    name: 'Tanisha Harris',
    email: 'misstanishababyy@gmail.com',
    phone: '(671) 747-5728',
    specialties: 'Facials and Waxing',
    initials: 'TH',
    capabilities: ['facials', 'waxing'],
    workDays: ['monday', 'wednesday', 'friday', 'saturday', 'sunday'],
    defaultRoom: 2
  },
  {
    id: 'leonel',
    name: 'Leonel Sidon',
    email: 'sidonleonel@gmail.com',
    phone: '(671) 747-1882',
    specialties: 'Body Massages and Treatments (Sundays only)',
    initials: 'LS',
    capabilities: ['massages', 'body_treatments'],
    workDays: ['sunday'],
    defaultRoom: null
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

// Helper function to determine service category
export const getServiceCategory = (serviceName: string): string => {
  if (!serviceName) return 'unknown'
  
  const name = serviceName.toLowerCase()
  
  if (name.includes('facial') || name.includes('microderm') || name.includes('vitamin c') || name.includes('acne')) {
    return 'facials'
  }
  if (name.includes('massage') || name.includes('balinese') || name.includes('deep tissue') || name.includes('hot stone') || name.includes('maternity')) {
    return 'massages'
  }
  if (name.includes('wax') || name.includes('brazilian') || name.includes('bikini') || name.includes('eyebrow') || name.includes('lip')) {
    return 'waxing'
  }
  if (name.includes('body') || name.includes('scrub') || name.includes('underarm') || name.includes('back treatment') || name.includes('chemical peel') || name.includes('microdermabrasion') || name.includes('moisturizing') || name.includes('mud mask')) {
    return 'body_treatments'
  }
  if (name.includes('package')) {
    return 'packages'
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
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  
  return staff.workDays.includes(dayOfWeek)
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