"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s-]/g, '_')
    
    switch (normalizedStatus) {
      case 'confirmed':
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Confirmed"
        }
      case 'cancelled':
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Cancelled"
        }
      case 'completed':
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Completed"
        }
      case 'in_progress':
      case 'checked_in':
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          label: "In Progress"
        }
      case 'no_show':
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          label: "No Show"
        }
      case 'pending':
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Pending"
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: status.charAt(0).toUpperCase() + status.slice(1)
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return "px-2 py-1 text-xs"
      case 'lg':
        return "px-4 py-2 text-base font-medium"
      default:
        return "px-3 py-1 text-sm"
    }
  }

  const { color, label } = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium transition-colors",
        color,
        sizeClasses,
        className
      )}
    >
      {label}
    </span>
  )
}