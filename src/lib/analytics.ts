import { supabase } from './supabase'
import { BookingWithRelations } from '@/types/booking'

// Service performance metrics interface
export interface ServiceMetrics {
  totalBookings: number
  totalRevenue: number
  averagePrice: number
  popularServices: {
    name: string
    category: string
    count: number
    revenue: number
  }[]
  categoryBreakdown: {
    category: string
    count: number
    revenue: number
    percentage: number
  }[]
}

// Staff performance metrics interface
export interface StaffMetrics {
  staffId: string
  staffName: string
  totalBookings: number
  totalRevenue: number
  utilizationRate: number
  averageBookingValue: number
  specialRequests: number
  topServices: string[]
}

// Daily service analytics interface
export interface DailyServiceAnalytics {
  date: string
  servicesByType: Record<string, number>
  totalRevenue: number
  totalBookings: number
  avgBookingValue: number
  peakHours: { hour: number; count: number }[]
  staffUtilization: StaffMetrics[]
}

// Real-time metrics interface
export interface RealTimeMetrics {
  todayBookings: number
  todayRevenue: number
  activeBookings: number
  completedBookings: number
  upcomingBookings: number
  specialRequests: number
}

/**
 * Get service performance metrics for a date range
 */
export async function getServiceMetrics(
  startDate: string,
  endDate: string
): Promise<ServiceMetrics> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services (
        id,
        name,
        category,
        price
      )
    `)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .in('status', ['confirmed', 'checked_in', 'completed'])

  if (error) {
    console.error('Error fetching service metrics:', error)
    throw error
  }

  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, booking) => sum + booking.final_price, 0) || 0
  const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : 0

  // Calculate popular services
  const serviceStats = new Map<string, { 
    name: string; 
    category: string; 
    count: number; 
    revenue: number; 
  }>()

  bookings?.forEach(booking => {
    const serviceId = booking.service.id
    const existing = serviceStats.get(serviceId)
    
    if (existing) {
      existing.count++
      existing.revenue += booking.final_price
    } else {
      serviceStats.set(serviceId, {
        name: booking.service.name,
        category: booking.service.category,
        count: 1,
        revenue: booking.final_price
      })
    }
  })

  const popularServices = Array.from(serviceStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate category breakdown
  const categoryStats = new Map<string, { count: number; revenue: number }>()
  
  bookings?.forEach(booking => {
    const category = booking.service.category
    const existing = categoryStats.get(category)
    
    if (existing) {
      existing.count++
      existing.revenue += booking.final_price
    } else {
      categoryStats.set(category, {
        count: 1,
        revenue: booking.final_price
      })
    }
  })

  const categoryBreakdown = Array.from(categoryStats.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    revenue: stats.revenue,
    percentage: totalBookings > 0 ? (stats.count / totalBookings) * 100 : 0
  }))

  return {
    totalBookings,
    totalRevenue,
    averagePrice,
    popularServices,
    categoryBreakdown
  }
}

/**
 * Get staff performance metrics
 */
export async function getStaffMetrics(
  startDate: string,
  endDate: string
): Promise<StaffMetrics[]> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      staff:staff (
        id,
        name
      ),
      service:services (
        name,
        category
      )
    `)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .in('status', ['confirmed', 'checked_in', 'completed'])

  if (error) {
    console.error('Error fetching staff metrics:', error)
    throw error
  }

  // Group bookings by staff
  const staffStats = new Map<string, {
    staffId: string
    staffName: string
    bookings: any[]
    revenue: number
    specialRequests: number
    services: Set<string>
  }>()

  bookings?.forEach(booking => {
    const staffId = booking.staff.id
    const existing = staffStats.get(staffId)
    
    // Check if this is a special request (staff specifically requested vs "Any Available")
    const isSpecialRequest = booking.staff_id !== 'any-available'
    
    if (existing) {
      existing.bookings.push(booking)
      existing.revenue += booking.final_price
      existing.services.add(booking.service.name)
      if (isSpecialRequest) existing.specialRequests++
    } else {
      staffStats.set(staffId, {
        staffId: booking.staff.id,
        staffName: booking.staff.name,
        bookings: [booking],
        revenue: booking.final_price,
        specialRequests: isSpecialRequest ? 1 : 0,
        services: new Set([booking.service.name])
      })
    }
  })

  // Calculate metrics for each staff member
  const staffMetrics: StaffMetrics[] = Array.from(staffStats.values()).map(stats => {
    const totalBookings = stats.bookings.length
    const averageBookingValue = totalBookings > 0 ? stats.revenue / totalBookings : 0
    
    // Simple utilization calculation (could be enhanced with actual working hours)
    const workingDaysInPeriod = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    const utilizationRate = workingDaysInPeriod > 0 ? (totalBookings / (workingDaysInPeriod * 8)) * 100 : 0
    
    return {
      staffId: stats.staffId,
      staffName: stats.staffName,
      totalBookings,
      totalRevenue: stats.revenue,
      utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
      averageBookingValue,
      specialRequests: stats.specialRequests,
      topServices: Array.from(stats.services).slice(0, 3)
    }
  })

  return staffMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Get daily service analytics for a specific date
 */
export async function getDailyServiceAnalytics(date: string): Promise<DailyServiceAnalytics> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services (
        name,
        category
      ),
      staff:staff (
        id,
        name
      )
    `)
    .eq('appointment_date', date)
    .in('status', ['confirmed', 'checked_in', 'completed'])

  if (error) {
    console.error('Error fetching daily analytics:', error)
    throw error
  }

  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, booking) => sum + booking.final_price, 0) || 0
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

  // Services by type
  const servicesByType: Record<string, number> = {}
  bookings?.forEach(booking => {
    const category = booking.service.category
    servicesByType[category] = (servicesByType[category] || 0) + 1
  })

  // Peak hours analysis
  const hourlyStats = new Map<number, number>()
  bookings?.forEach(booking => {
    const hour = parseInt(booking.start_time.split(':')[0], 10)
    hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1)
  })

  const peakHours = Array.from(hourlyStats.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Staff utilization for the day
  const staffUtilization = await getStaffMetrics(date, date)

  return {
    date,
    servicesByType,
    totalRevenue,
    totalBookings,
    avgBookingValue,
    peakHours,
    staffUtilization
  }
}

/**
 * Get real-time metrics for today
 */
export async function getRealTimeMetrics(): Promise<RealTimeMetrics> {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const { data: todayBookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      staff:staff (
        id,
        name
      )
    `)
    .eq('appointment_date', today)

  if (error) {
    console.error('Error fetching real-time metrics:', error)
    throw error
  }

  const totalBookings = todayBookings?.length || 0
  const totalRevenue = todayBookings?.reduce((sum, booking) => 
    sum + (booking.status !== 'cancelled' ? booking.final_price : 0), 0
  ) || 0

  const activeBookings = todayBookings?.filter(booking => 
    booking.status === 'checked_in' || 
    (booking.status === 'confirmed' && booking.start_time <= currentTime && booking.end_time >= currentTime)
  ).length || 0

  const completedBookings = todayBookings?.filter(booking => 
    booking.status === 'completed'
  ).length || 0

  const upcomingBookings = todayBookings?.filter(booking => 
    booking.status === 'confirmed' && booking.start_time > currentTime
  ).length || 0

  // Count special requests (staff specifically requested)
  const specialRequests = todayBookings?.filter(booking => 
    booking.staff_id !== 'any-available' && booking.status !== 'cancelled'
  ).length || 0

  return {
    todayBookings: totalBookings,
    todayRevenue: totalRevenue,
    activeBookings,
    completedBookings,
    upcomingBookings,
    specialRequests
  }
}

/**
 * Check if a booking is a special staff request
 */
export function isSpecialStaffRequest(booking: BookingWithRelations): boolean {
  // Check if customer specifically requested this staff member
  // (as opposed to selecting "Any Available" which would be staff_id: 'any-available')
  return booking.staff_id !== 'any-available' && booking.staff_id !== null
}

/**
 * Get booking trends for the past week
 */
export async function getWeeklyTrends(): Promise<{
  dates: string[]
  bookings: number[]
  revenue: number[]
}> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 6) // Last 7 days

  const dates: string[] = []
  const bookings: number[] = []
  const revenue: number[] = []

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dates.push(dateStr)
    
    const dailyAnalytics = await getDailyServiceAnalytics(dateStr)
    bookings.push(dailyAnalytics.totalBookings)
    revenue.push(dailyAnalytics.totalRevenue)
  }

  return { dates, bookings, revenue }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100) / 100}%`
}