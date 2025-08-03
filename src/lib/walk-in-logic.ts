// Walk-in management utility functions
import { supabaseClient } from '@/lib/supabase'

export interface WalkIn {
  id: string
  customer_id: string | null
  booking_id: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string
  service_name: string
  service_category: string
  scheduling_type: string
  scheduled_date: string | null
  scheduled_time: string | null
  notes: string | null
  status: 'waiting' | 'served' | 'cancelled' | 'no_show'
  checked_in_at: string | null
  completed_at: string | null
  ghl_webhook_sent: boolean
  ghl_webhook_sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WalkInFilters {
  status?: string
  date?: string
}

export interface WalkInCreateData {
  name: string
  phone: string
  email?: string
  service_name: string
  service_category: string
  notes?: string
}

// Walk-in status types
export const WALK_IN_STATUSES = {
  WAITING: 'waiting',
  SERVED: 'served',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const

export type WalkInStatus = typeof WALK_IN_STATUSES[keyof typeof WALK_IN_STATUSES]

// Status display configuration
export const WALK_IN_STATUS_CONFIG = {
  [WALK_IN_STATUSES.WAITING]: {
    label: 'Waiting',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200'
  },
  [WALK_IN_STATUSES.SERVED]: {
    label: 'Served',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  [WALK_IN_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200'
  },
  [WALK_IN_STATUSES.NO_SHOW]: {
    label: 'No Show',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  }
}

// Validation functions
export function validateWalkInData(data: WalkInCreateData): string | null {
  if (!data.name?.trim()) {
    return 'Name is required'
  }

  if (!data.phone?.trim()) {
    return 'Phone number is required'
  }

  if (!data.service_name?.trim()) {
    return 'Service selection is required'
  }

  // Validate phone format (basic check)
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,15}$/
  if (!phoneRegex.test(data.phone.trim())) {
    return 'Please enter a valid phone number'
  }

  // Validate email if provided
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email.trim())) {
      return 'Please enter a valid email address'
    }
  }

  // Validate notes length
  if (data.notes && data.notes.length > 500) {
    return 'Notes must be less than 500 characters'
  }

  return null
}

// Walk-in management functions
export const walkInLogic = {
  // Create a new walk-in
  async createWalkIn(data: WalkInCreateData): Promise<{ success: boolean; walkIn?: WalkIn; error?: string }> {
    try {
      const validation = validateWalkInData(data)
      if (validation) {
        return { success: false, error: validation }
      }

      const walkIn = await supabaseClient.createWalkIn(data)
      return { success: true, walkIn }
    } catch (error: any) {
      console.error('Create walk-in error:', error)
      return { success: false, error: error.message || 'Failed to create walk-in' }
    }
  },

  // Get walk-ins with optional filters
  async getWalkIns(filters?: WalkInFilters): Promise<{ success: boolean; walkIns?: WalkIn[]; error?: string }> {
    try {
      const walkIns = await supabaseClient.getWalkIns(filters)
      return { success: true, walkIns }
    } catch (error: any) {
      console.error('Get walk-ins error:', error)
      return { success: false, error: error.message || 'Failed to fetch walk-ins' }
    }
  },

  // Get today's walk-ins
  async getTodaysWalkIns(): Promise<{ success: boolean; walkIns?: WalkIn[]; error?: string }> {
    const today = new Date().toISOString().split('T')[0]
    return this.getWalkIns({ date: today })
  },

  // Get waiting walk-ins
  async getWaitingWalkIns(): Promise<{ success: boolean; walkIns?: WalkIn[]; error?: string }> {
    return this.getWalkIns({ status: WALK_IN_STATUSES.WAITING })
  },

  // Update walk-in status
  async updateWalkInStatus(
    id: string, 
    status: WalkInStatus, 
    notes?: string
  ): Promise<{ success: boolean; walkIn?: WalkIn; error?: string }> {
    try {
      if (!Object.values(WALK_IN_STATUSES).includes(status)) {
        return { success: false, error: 'Invalid status' }
      }

      const walkIn = await supabaseClient.updateWalkInStatus(id, status, notes)
      return { success: true, walkIn }
    } catch (error: any) {
      console.error('Update walk-in status error:', error)
      return { success: false, error: error.message || 'Failed to update walk-in status' }
    }
  },

  // Mark walk-in as served
  async markAsServed(id: string, notes?: string): Promise<{ success: boolean; walkIn?: WalkIn; error?: string }> {
    return this.updateWalkInStatus(id, WALK_IN_STATUSES.SERVED, notes)
  },

  // Mark walk-in as cancelled
  async markAsCancelled(id: string, notes?: string): Promise<{ success: boolean; walkIn?: WalkIn; error?: string }> {
    return this.updateWalkInStatus(id, WALK_IN_STATUSES.CANCELLED, notes)
  },

  // Mark walk-in as no show
  async markAsNoShow(id: string, notes?: string): Promise<{ success: boolean; walkIn?: WalkIn; error?: string }> {
    return this.updateWalkInStatus(id, WALK_IN_STATUSES.NO_SHOW, notes)
  },

  // Delete walk-in
  async deleteWalkIn(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await supabaseClient.deleteWalkIn(id)
      return { success: true }
    } catch (error: any) {
      console.error('Delete walk-in error:', error)
      return { success: false, error: error.message || 'Failed to delete walk-in' }
    }
  },

  // Get walk-in statistics
  async getWalkInStats(date?: string): Promise<{
    success: boolean
    stats?: {
      total: number
      waiting: number
      served: number
      cancelled: number
      noShow: number
    }
    error?: string
  }> {
    try {
      const filters = date ? { date } : undefined
      const result = await this.getWalkIns(filters)
      
      if (!result.success || !result.walkIns) {
        return { success: false, error: result.error || 'Failed to fetch walk-ins' }
      }

      const stats = {
        total: result.walkIns.length,
        waiting: result.walkIns.filter(w => w.status === WALK_IN_STATUSES.WAITING).length,
        served: result.walkIns.filter(w => w.status === WALK_IN_STATUSES.SERVED).length,
        cancelled: result.walkIns.filter(w => w.status === WALK_IN_STATUSES.CANCELLED).length,
        noShow: result.walkIns.filter(w => w.status === WALK_IN_STATUSES.NO_SHOW).length
      }

      return { success: true, stats }
    } catch (error: any) {
      console.error('Get walk-in stats error:', error)
      return { success: false, error: error.message || 'Failed to get walk-in statistics' }
    }
  }
}

// Utility functions
export function formatWalkInTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    return 'Invalid time'
  }
}

export function formatWalkInDate(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch (error) {
    return 'Invalid date'
  }
}

export function getTimeSinceCreated(timestamp: string): string {
  try {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch (error) {
    return 'Unknown'
  }
}

export function getWalkInStatusConfig(status: WalkInStatus) {
  return WALK_IN_STATUS_CONFIG[status] || WALK_IN_STATUS_CONFIG[WALK_IN_STATUSES.WAITING]
}

export function isValidWalkInStatus(status: string): status is WalkInStatus {
  return Object.values(WALK_IN_STATUSES).includes(status as WalkInStatus)
}