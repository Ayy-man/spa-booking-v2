"use client"

import * as React from "react"
import { useState } from "react"
import { RoomTimeline } from "./room-timeline"
import { StaffScheduleView } from "./StaffScheduleView"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Users, DoorOpen } from "lucide-react"

type ViewMode = 'staff' | 'rooms'

export function ScheduleViewToggle() {
  // Default to staff view (what they're used to from paper booking)
  const [viewMode, setViewMode] = useState<ViewMode>('staff')

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === 'staff' ? 'Staff Schedule View' : 'Room Timeline View'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode === 'staff' 
                ? 'View all staff schedules at a glance'
                : 'View room availability and utilization across all treatment rooms'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <Button
                variant={viewMode === 'staff' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('staff')}
                className={cn(
                  "rounded-none",
                  viewMode === 'staff' 
                    ? "bg-primary text-white hover:bg-primary/90" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <Users className="h-4 w-4 mr-2" />
                Staff View
              </Button>
              <Button
                variant={viewMode === 'rooms' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('rooms')}
                className={cn(
                  "rounded-none",
                  viewMode === 'rooms' 
                    ? "bg-primary text-white hover:bg-primary/90" 
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                Room View
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'staff' ? (
        <StaffScheduleView />
      ) : (
        <RoomTimeline />
      )}
    </div>
  )
}