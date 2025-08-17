"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { simpleAuth } from "@/lib/simple-auth"
import { TodaysSchedule } from "@/components/admin/todays-schedule"
import { ScheduleViewToggle } from "@/components/admin/ScheduleViewToggle"
import { StaffSchedule } from "@/components/admin/staff-schedule"
import { WalkInsSection } from "@/components/admin/walk-ins-section"
import { DailySummary } from "@/components/admin/DailySummary"
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type TabValue = "schedule" | "timeline" | "staff" | "walkins" | "reports"

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("schedule")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check authentication
    const authenticated = simpleAuth.isAuthenticated()
    setIsAuthenticated(authenticated)
    
    if (!authenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/admin/login'
    }
    
    setLoading(false)
  }, [])

  const tabs = [
    {
      value: "schedule" as const,
      label: "Today's Schedule",
      description: "View all appointments for today"
    },
    {
      value: "walkins" as const,
      label: "Walk-Ins",
      description: "Manage walk-in customers"
    },
    {
      value: "timeline" as const,
      label: "Schedule Timeline",
      description: "Staff and room scheduling views"
    },
    {
      value: "staff" as const,
      label: "Staff Schedule",
      description: "Staff availability and assignments"
    },
    {
      value: "reports" as const,
      label: "Daily Report",
      description: "Daily summary and analytics"
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Verifying authentication...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your spa operations and monitor daily activities
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link href="/admin/payment-links">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              Payment Links
            </Button>
          </Link>
          <Link href="/admin/bookings">
            <Button variant="outline" className="border-gray-300">
              All Bookings
            </Button>
          </Link>
          <Link href="/admin/monitor">
            <Button className="bg-black text-white hover:bg-gray-900">
              Monitor Mode
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex h-auto p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              active={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-sm flex flex-col items-center justify-center h-16 lg:h-10 lg:flex-row lg:space-x-2 text-xs lg:text-sm"
            >
              <span className="font-medium">{tab.label}</span>
              {/* Mobile: show description below, Desktop: hide description */}
              <span className="text-xs text-gray-500 block lg:hidden mt-1">
                {tab.description.split(' ').slice(0, 3).join(' ')}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          <TabsContent value="schedule" activeValue={activeTab}>
            <TodaysSchedule displayMode="dashboard" />
          </TabsContent>

          <TabsContent value="walkins" activeValue={activeTab}>
            <WalkInsSection />
          </TabsContent>

          <TabsContent value="timeline" activeValue={activeTab}>
            <ScheduleViewToggle />
          </TabsContent>

          <TabsContent value="staff" activeValue={activeTab}>
            <StaffSchedule />
          </TabsContent>

          <TabsContent value="reports" activeValue={activeTab}>
            <DailySummary />
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick Stats Card */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Dashboard Navigation
            </h3>
            <p className="text-gray-600 text-sm">
              {activeTab === 'timeline' || activeTab === 'schedule' || activeTab === 'staff' 
                ? 'Schedule and timeline views are display-only for monitoring'
                : 'Manage walk-ins and view booking information'}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm">
                View All Bookings
              </Button>
            </Link>
            <Button 
              size="sm" 
              className="bg-primary text-white hover:bg-primary-dark"
              onClick={() => window.location.reload()}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}