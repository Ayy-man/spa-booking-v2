"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  Users, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Loader2,
  TrendingUp,
  Clock,
  CalendarDays
} from "lucide-react"
import { format, addDays, subDays } from "date-fns"

interface DailySummaryData {
  date: string
  overview: {
    totalAppointments: number
    completed: number
    noShows: number
    cancelled: number
    totalRevenue: number
    depositsCollected: number
    addonsRevenue?: number
    totalWithAddons?: number
  }
  staffPerformance: Array<{
    name: string
    appointments: number
    revenue: number
  }>
  serviceBreakdown: {
    [category: string]: number
  }
  tomorrowPreview: {
    totalBookings: number
    firstAppointment: string
    lastAppointment: string
  }
}

interface DailySummaryProps {
  className?: string
}

export function DailySummary({ className }: DailySummaryProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  // Fetch daily summary data
  const fetchSummaryData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      const response = await fetch(`/api/admin/daily-summary?date=${dateStr}`)
      if (!response.ok) {
        throw new Error('Failed to fetch summary data')
      }
      
      const data = await response.json()
      setSummaryData(data)
    } catch (err: any) {
      console.error('Error fetching summary:', err)
      setError('Failed to load daily summary. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Send report to n8n webhook
  const sendDailyReport = async () => {
    if (!summaryData) return
    
    try {
      setSendingReport(true)
      setError("")
      setSuccess("")
      
      // Send to n8n webhook
      const response = await fetch('https://primary-production-66f3.up.railway.app/webhook/bcab11df-b41a-42db-933b-0f187174ce35', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'daily_report',
          spa_name: 'Dermal Skin Care & Spa',
          recipient_email: 'happyskinhappyyou@gmail.com',
          report_date: summaryData.date,
          data: summaryData,
          timestamp: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        setSuccess('Report sent successfully!')
        setTimeout(() => setSuccess(""), 5000)
      } else {
        throw new Error('Failed to send report')
      }
    } catch (error) {
      console.error('Error sending report:', error)
      setError('Failed to send report. Please try again.')
    } finally {
      setSendingReport(false)
    }
  }

  // Load data when date changes
  useEffect(() => {
    fetchSummaryData()
  }, [fetchSummaryData])

  // Navigation functions
  const goToToday = () => setSelectedDate(new Date())
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format service category name
  const formatCategoryName = (category: string) => {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-2xl">Daily Report</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={goToPreviousDay}
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-2 px-3 py-2 border rounded-lg bg-white">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={goToNextDay}
                  disabled={loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {!isToday && (
                  <Button
                    variant="outline"
                    onClick={goToToday}
                    disabled={loading}
                  >
                    Today
                  </Button>
                )}
              </div>
            </div>
            
            <Button
              onClick={sendDailyReport}
              disabled={loading || sendingReport || !summaryData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Report
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : summaryData ? (
        <>
          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Appointments</CardDescription>
                <CardTitle className="text-3xl">{summaryData.overview.totalAppointments}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Scheduled today</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-green-600">{summaryData.overview.completed}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Successfully served</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>No Shows / Cancelled</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {summaryData.overview.noShows + summaryData.overview.cancelled}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{summaryData.overview.noShows} no-show, {summaryData.overview.cancelled} cancelled</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-3xl text-blue-600">
                  {formatCurrency(summaryData.overview.totalWithAddons || summaryData.overview.totalRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span>{summaryData.overview.depositsCollected} deposits collected</span>
                  </div>
                  {summaryData.overview.addonsRevenue !== undefined && summaryData.overview.addonsRevenue > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{formatCurrency(summaryData.overview.addonsRevenue)} from add-ons</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Staff Performance</CardTitle>
              <CardDescription>Individual staff metrics for today</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData.staffPerformance.length > 0 ? (
                <div className="space-y-4">
                  {summaryData.staffPerformance.map((staff, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-sm text-gray-600">{staff.appointments} appointments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(staff.revenue)}</p>
                        <p className="text-sm text-gray-600">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No staff appointments for this date</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Service Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Services Today</CardTitle>
                <CardDescription>Breakdown by service category</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(summaryData.serviceBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(summaryData.serviceBreakdown).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{formatCategoryName(category)}</span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No services for this date</p>
                )}
              </CardContent>
            </Card>

            {/* Tomorrow's Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Tomorrow&apos;s Schedule</CardTitle>
                <CardDescription>Preview of next day&apos;s bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Total Bookings</span>
                    </div>
                    <span className="text-2xl font-semibold">{summaryData.tomorrowPreview.totalBookings}</span>
                  </div>
                  
                  {summaryData.tomorrowPreview.totalBookings > 0 && (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-green-600" />
                          <span className="font-medium">First Appointment</span>
                        </div>
                        <span className="font-semibold">{summaryData.tomorrowPreview.firstAppointment || "N/A"}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">Last Appointment</span>
                        </div>
                        <span className="font-semibold">{summaryData.tomorrowPreview.lastAppointment || "N/A"}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Select a date to view the daily report</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}