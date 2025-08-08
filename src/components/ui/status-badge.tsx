"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
  previousStatus?: string // For animation purposes
  showAnimation?: boolean
}

export function StatusBadge({ 
  status, 
  size = "md", 
  className, 
  previousStatus,
  showAnimation = false 
}: StatusBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayStatus, setDisplayStatus] = useState(status)

  // Trigger animation when status changes
  useEffect(() => {
    if (showAnimation && previousStatus && previousStatus !== status) {
      setIsAnimating(true)
      
      // Delay status change to show animation
      const timer = setTimeout(() => {
        setDisplayStatus(status)
        
        // Reset animation state
        setTimeout(() => {
          setIsAnimating(false)
        }, 300)
      }, 150)
      
      return () => clearTimeout(timer)
    } else {
      setDisplayStatus(status)
    }
  }, [status, previousStatus, showAnimation])
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s-]/g, '_')
    
    switch (normalizedStatus) {
      case 'confirmed':
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          hoverColor: "hover:bg-green-200 hover:border-green-300",
          label: "Confirmed",
          icon: "✓",
          pulseColor: "before:bg-green-400"
        }
      case 'cancelled':
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          hoverColor: "hover:bg-red-200 hover:border-red-300",
          label: "Cancelled",
          icon: "✕",
          pulseColor: "before:bg-red-400"
        }
      case 'completed':
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          hoverColor: "hover:bg-blue-200 hover:border-blue-300",
          label: "Completed",
          icon: "🎉",
          pulseColor: "before:bg-blue-400"
        }
      case 'in_progress':
      case 'checked_in':
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          hoverColor: "hover:bg-yellow-200 hover:border-yellow-300",
          label: "In Progress",
          icon: "⏳",
          pulseColor: "before:bg-yellow-400"
        }
      case 'no_show':
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          hoverColor: "hover:bg-orange-200 hover:border-orange-300",
          label: "No Show",
          icon: "👻",
          pulseColor: "before:bg-orange-400"
        }
      case 'pending':
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          hoverColor: "hover:bg-gray-200 hover:border-gray-300",
          label: "Pending",
          icon: "⏱️",
          pulseColor: "before:bg-gray-400"
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          hoverColor: "hover:bg-gray-200 hover:border-gray-300",
          label: status.charAt(0).toUpperCase() + status.slice(1),
          icon: "?",
          pulseColor: "before:bg-gray-400"
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

  const { color, hoverColor, label, icon, pulseColor } = getStatusConfig(displayStatus)
  const sizeClasses = getSizeClasses(size)

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium",
        "transition-all duration-300 ease-out relative overflow-hidden",
        "hover:scale-105 hover:shadow-sm cursor-default",
        // Base colors
        color,
        hoverColor,
        sizeClasses,
        // Animation states
        isAnimating && [
          "animate-bounce",
          "before:absolute before:inset-0 before:rounded-full before:animate-ping before:opacity-75",
          pulseColor
        ],
        // Prefers reduced motion support
        "motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:animate-none",
        className
      )}
    >
      <span className="relative z-10 flex items-center gap-1">
        {showAnimation && (
          <span className={cn(
            "text-xs transition-all duration-300",
            isAnimating ? "animate-pulse scale-125" : "scale-100"
          )}>
            {icon}
          </span>
        )}
        <span className={cn(
          "transition-all duration-300",
          isAnimating && "animate-pulse"
        )}>
          {label}
        </span>
      </span>
      
      {/* Success celebration animation for completed status */}
      {isAnimating && displayStatus === 'completed' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          <div className="absolute top-0 right-0 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.1s'}}></div>
          <div className="absolute bottom-0 left-0 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.2s'}}></div>
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.3s'}}></div>
        </div>
      )}
    </span>
  )
}