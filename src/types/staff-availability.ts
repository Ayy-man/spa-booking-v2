// Staff availability status types and interfaces

export type StaffAvailabilityStatus = 'working' | 'on_call' | 'off'

export interface StaffAvailabilityInfo {
  status: StaffAvailabilityStatus
  advance_notice_hours: number
  is_available: boolean
  status_note?: string | null
}

export interface StaffWithAvailability {
  id: string
  name: string
  current_status: StaffAvailabilityStatus
  default_advance_notice_hours: number
  status_updated_at: string
  is_active: boolean
}

export interface AvailabilityStatusConfig {
  label: string
  value: StaffAvailabilityStatus
  color: string
  bgColor: string
  borderColor: string
  description: string
  icon?: string
}

export const AVAILABILITY_STATUS_CONFIG: Record<StaffAvailabilityStatus, AvailabilityStatusConfig> = {
  working: {
    label: 'Working',
    value: 'working',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    description: 'Available for immediate booking',
    icon: '✅'
  },
  on_call: {
    label: 'On Call',
    value: 'on_call',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    description: 'Requires advance notice',
    icon: '📞'
  },
  off: {
    label: 'Off',
    value: 'off',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    description: 'Not available for bookings',
    icon: '🚫'
  }
}

export function getStatusDisplay(status: StaffAvailabilityStatus, advanceHours?: number): string {
  const config = AVAILABILITY_STATUS_CONFIG[status]
  if (status === 'on_call' && advanceHours) {
    return `${config.label} (${advanceHours}h notice)`
  }
  return config.label
}

export function canBookSlot(
  status: StaffAvailabilityStatus,
  slotTime: Date,
  currentTime: Date = new Date(),
  advanceNoticeHours: number = 2
): boolean {
  if (status === 'off') {
    return false
  }

  const hoursDifference = (slotTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60)

  if (status === 'working') {
    // Working staff use default 2-hour advance notice
    return hoursDifference >= 2
  }

  if (status === 'on_call') {
    // On-call staff use their specific advance notice requirement
    return hoursDifference >= advanceNoticeHours
  }

  return false
}

export function getMinimumBookingTime(
  status: StaffAvailabilityStatus,
  advanceNoticeHours: number = 2
): Date {
  const now = new Date()
  
  if (status === 'working') {
    // Working staff: 2 hours from now
    return new Date(now.getTime() + 2 * 60 * 60 * 1000)
  }
  
  if (status === 'on_call') {
    // On-call staff: custom advance notice from now
    return new Date(now.getTime() + advanceNoticeHours * 60 * 60 * 1000)
  }
  
  // Off staff: return far future date (effectively unbookable)
  return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
}