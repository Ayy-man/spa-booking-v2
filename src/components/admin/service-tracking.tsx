"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
// TODO: Implement proper analytics types and functions
interface RealTimeMetrics {
  todayBookings: number
  completedBookings: number
  activeBookings: number
  specialRequests: number
  todayRevenue: number
  avgBookingValue: number
}

interface DailyServiceAnalytics {
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  servicesByType: Record<string, number>
}

interface ServiceMetrics {
  topServices: { name: string; count: number; category: string }[]
  popularServices: { name: string; count: number; category: string }[]
  totalBookings: number
  revenue: number
}

interface StaffMetrics {
  id: string
  staffId: string
  name: string
  staffName: string
  bookingsToday: number
  totalBookings: number
  specialRequests: number
  utilizationRate: number
  topServices: string[]
  revenue: number
}

// TODO: Implement proper analytics functions
const getRealTimeMetrics = async (): Promise<RealTimeMetrics> => ({
  todayBookings: 0,
  completedBookings: 0,
  activeBookings: 0,
  specialRequests: 0,
  todayRevenue: 0,
  avgBookingValue: 0
})

const getDailyServiceAnalytics = async (date: string): Promise<DailyServiceAnalytics> => ({
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  servicesByType: {}
})

const getServiceMetrics = async (startDate: string, endDate: string): Promise<ServiceMetrics> => ({
  topServices: [],
  popularServices: [],
  totalBookings: 0,
  revenue: 0
})

const getStaffMetrics = async (startDate: string, endDate: string): Promise<StaffMetrics[]> => []

interface ServiceTrackingProps {
  className?: string
}

export function ServiceTracking({ className }: ServiceTrackingProps) {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyServiceAnalytics | null>(null)
  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetrics | null>(null)
  const [staffMetrics, setStaffMetrics] = useState<StaffMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [realTime, daily, services, staff] = await Promise.all([
        getRealTimeMetrics(),
        getDailyServiceAnalytics(today),
        getServiceMetrics(weekAgoStr, today),
        getStaffMetrics(today, today)
      ])

      setRealTimeMetrics(realTime)
      setDailyAnalytics(daily)
      setServiceMetrics(services)
      setStaffMetrics(staff)
    } catch (err) {
      console.error('Error fetching service tracking data:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [today, weekAgoStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operational Metrics</h2>
          <p className="text-gray-600">Real-time operational insights and booking statistics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "transition-colors",
              autoRefresh ? "bg-green-50 border-green-200 text-green-700" : ""
            )}
          >
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
          <Button
            size="sm"
            onClick={fetchData}
            className="bg-black text-white hover:bg-gray-900"
          >
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Real-Time Metrics */}
      {realTimeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Today&apos;s Bookings</p>
                <p className="text-2xl font-bold text-blue-900">{realTimeMetrics.todayBookings}</p>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed Today</p>
                <p className="text-2xl font-bold text-green-900">{realTimeMetrics.completedBookings}</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Active Now</p>
                <p className="text-2xl font-bold text-purple-900">{realTimeMetrics.activeBookings}</p>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Special Requests</p>
                <p className="text-2xl font-bold text-amber-900">{realTimeMetrics.specialRequests}</p>
              </div>
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Service Categories Breakdown */}
      {dailyAnalytics && Object.keys(dailyAnalytics.servicesByType).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Services by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(dailyAnalytics.servicesByType).map(([category, count]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{count}</p>
                <p className="text-sm font-medium text-gray-700 capitalize">{category}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Popular Services */}
      {serviceMetrics && serviceMetrics.popularServices.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Services (Past 7 Days)</h3>
          <div className="space-y-3">
            {serviceMetrics.popularServices.slice(0, 5).map((service, index) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{service.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{service.count} bookings</p>
                  <p className="text-sm text-gray-600">Past 7 days</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Staff Performance */}
      {staffMetrics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Staff Performance</h3>
          <div className="space-y-4">
            {staffMetrics.slice(0, 5).map((staff) => (
              <div key={staff.staffId} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {staff.staffName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{staff.staffName}</p>
                      <p className="text-sm text-gray-500">{staff.totalBookings} bookings today</p>
                    </div>
                  </div>
                  {staff.specialRequests > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                      {staff.specialRequests} special requests
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Utilization</p>
                    <p className="font-medium">{Math.round(staff.utilizationRate)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Top Services</p>
                    <p className="font-medium text-xs">{staff.topServices.join(', ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weekly Overview */}
      {serviceMetrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{serviceMetrics.totalBookings}</p>
              <p className="text-sm text-gray-600">Total Bookings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{Math.round(serviceMetrics.totalBookings / 7)}</p>
              <p className="text-sm text-gray-600">Average Daily Bookings</p>
            </div>
          </div>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Auto-refreshing every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}// Force rebuild for Vercel deployment
