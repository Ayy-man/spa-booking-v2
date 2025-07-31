"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { TodaysSchedule } from "@/components/admin/todays-schedule"
import { RoomTimeline } from "@/components/admin/room-timeline" 
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

type MonitorView = "schedule" | "timeline"

export default function MonitorModePage() {
  const [currentView, setCurrentView] = useState<MonitorView>("schedule")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Auto-cycle through views every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentView(prev => prev === "schedule" ? "timeline" : "schedule")
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Handle fullscreen toggle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }, [])

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen()
    } else if (event.key === 'f' || event.key === 'F') {
      toggleFullscreen()
    } else if (event.key === ' ') {
      event.preventDefault()
      setCurrentView(prev => prev === "schedule" ? "timeline" : "schedule")
    }
  }, [toggleFullscreen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  return (
    <div className={cn(
      "min-h-screen bg-gray-900 text-white transition-all duration-300",
      isFullscreen ? "p-4" : "p-6"
    )}>
      {/* Header - Hide in fullscreen for cleaner display */}
      {!isFullscreen && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Monitor Mode - Wall Display
            </h1>
            <p className="text-gray-300">
              Optimized for large screens • Auto-cycling every 60 seconds
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link href="/admin">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                ← Back to Dashboard
              </Button>
            </Link>
            <Button 
              onClick={toggleFullscreen}
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              Enter Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Current Time & View Indicator */}
      <div className={cn(
        "flex justify-between items-center mb-8",
        isFullscreen ? "text-2xl" : "text-xl"
      )}>
        <div className="text-gray-300">
          <span className="font-mono">
            {currentTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit' 
            })}
          </span>
          <span className="ml-4">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('schedule')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded transition-colors",
                currentView === 'schedule'
                  ? "bg-white text-gray-900"
                  : "text-gray-300 hover:text-white"
              )}
            >
              Schedule
            </button>
            <button
              onClick={() => setCurrentView('timeline')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded transition-colors",
                currentView === 'timeline'
                  ? "bg-white text-gray-900"
                  : "text-gray-300 hover:text-white"
              )}
            >
              Timeline
            </button>
          </div>
          
          {/* Auto-cycle indicator */}
          <div className="text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Auto-cycling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {currentView === "schedule" ? (
          <div className="bg-white rounded-xl text-gray-900 overflow-hidden">
            <TodaysSchedule displayMode="monitor" />
          </div>
        ) : (
          <div className="bg-white rounded-xl text-gray-900 overflow-hidden">
            <RoomTimeline />
          </div>
        )}
      </div>

      {/* Footer - Show only in fullscreen */}
      {isFullscreen && (
        <div className="fixed bottom-4 left-4 right-4 flex justify-between items-center text-sm text-gray-400">
          <div>
            Dermal Care Medical Spa - Admin Monitor
          </div>
          <div className="flex space-x-6">
            <span>Press [Space] to switch views</span>
            <span>Press [F] for fullscreen</span>
            <span>Press [Esc] to exit</span>
          </div>
        </div>
      )}
    </div>
  )
}