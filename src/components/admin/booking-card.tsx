"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BookingWithRelations } from "@/types/booking"
import { QuickActions } from "./quick-actions"
import { isSpecialStaffRequest } from "@/lib/booking-utils"

interface BookingCardProps {
  booking: BookingWithRelations
  size?: "sm" | "md" | "lg"
  showRoom?: boolean
  showStaff?: boolean
  showDuration?: boolean
  showActions?: boolean
  onUpdate?: () => void
  className?: string
}

export function BookingCard({ 
  booking, 
  size = "md", 
  showRoom = true, 
  showStaff = true, 
  showDuration = true,
  showActions = false,
  onUpdate,
  className 
}: BookingCardProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getCardPadding = () => {
    switch (size) {
      case 'sm': return "p-3"
      case 'lg': return "p-6"
      default: return "p-4"
    }
  }

  const getTextSizes = () => {
    switch (size) {
      case 'sm': 
        return {
          time: "text-lg font-bold",
          service: "text-sm font-medium",
          details: "text-xs",
          room: "text-xs font-medium"
        }
      case 'lg':
        return {
          time: "text-3xl font-bold",
          service: "text-xl font-medium",
          details: "text-base",
          room: "text-lg font-medium"
        }
      default:
        return {
          time: "text-xl font-bold",
          service: "text-base font-medium",
          details: "text-sm",
          room: "text-sm font-medium"
        }
    }
  }

  const textSizes = getTextSizes()
  const isSpecialRequest = isSpecialStaffRequest(booking)

  return (
    <Card className={cn(
      "bg-white border border-gray-200 hover:shadow-md transition-shadow relative",
      getCardPadding(),
      // Special request styling
      isSpecialRequest && "ring-2 ring-amber-300 border-amber-300 bg-gradient-to-br from-amber-50 to-white",
      className
    )}>
      {/* Special Request Indicator */}
      {isSpecialRequest && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {/* Time and Status Row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <span className={cn(textSizes.time, "text-gray-900")}>
              {formatTime(booking.start_time)}
            </span>
            {showDuration && (
              <span className={cn(textSizes.details, "text-gray-500")}>
                ({booking.duration}min)
              </span>
            )}
          </div>
          <StatusBadge 
            status={booking.status} 
            size={size === 'lg' ? 'md' : 'sm'} 
          />
        </div>

        {/* Service Name */}
        <div>
          <h3 className={cn(textSizes.service, "text-gray-900 truncate")}>
            {booking.service.name}
          </h3>
        </div>

        {/* Room and Staff Info */}
        <div className="grid grid-cols-2 gap-4">
          {showRoom && (
            <div>
              <p className={cn(textSizes.details, "text-gray-500 mb-1")}>
                Room
              </p>
              <p className={cn(textSizes.room, "text-gray-900")}>
                #{booking.room.name}
              </p>
            </div>
          )}
          
          {showStaff && (
            <div>
              <p className={cn(textSizes.details, "text-gray-500 mb-1")}>
                Staff
              </p>
              <div className="flex items-center space-x-2">
                <p className={cn(textSizes.room, "text-gray-900")}>
                  {booking.staff.name}
                </p>
                {isSpecialRequest && (
                  <span className="text-amber-600 text-xs font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                    Requested
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions Section */}
        {showActions && size !== 'lg' && (
          <div className="pt-3 border-t border-gray-100">
            {!showQuickActions ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuickActions(true)}
                className="w-full text-xs"
              >
                Quick Actions
              </Button>
            ) : (
              <div className="space-y-3">
                <QuickActions 
                  booking={booking} 
                  onSuccess={() => {
                    setShowQuickActions(false)
                    if (onUpdate) onUpdate()
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQuickActions(false)}
                  className="w-full text-xs"
                >
                  Hide Actions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice - Only for wall display */}
        {size === 'lg' && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 italic">
              Customer details hidden for privacy
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}