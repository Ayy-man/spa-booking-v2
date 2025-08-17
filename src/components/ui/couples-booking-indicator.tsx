"use client"

import * as React from "react"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CouplesBookingIndicatorProps {
  bookingType: string
  size?: "sm" | "md" | "lg"
  className?: string
  showLabel?: boolean
}

export function CouplesBookingIndicator({ 
  bookingType, 
  size = "md", 
  className,
  showLabel = false 
}: CouplesBookingIndicatorProps) {
  // Only show indicator for couples bookings
  if (bookingType !== 'couple') {
    return null
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: "px-1.5 py-0.5 text-xs",
          icon: "h-3 w-3"
        }
      case 'lg':
        return {
          badge: "px-3 py-1 text-sm",
          icon: "h-4 w-4"
        }
      default:
        return {
          badge: "px-2 py-0.5 text-xs",
          icon: "h-3.5 w-3.5"
        }
    }
  }

  const sizeClasses = getSizeClasses()

  const indicator = (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 inline-flex items-center gap-1",
        sizeClasses.badge,
        className
      )}
    >
      <Users className={sizeClasses.icon} />
      {showLabel && "Couples"}
    </Badge>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>Couples Booking</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}