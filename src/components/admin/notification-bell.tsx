"use client"

import * as React from "react"
import { Bell, Check, X, Settings, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  getNotificationIcon, 
  formatNotificationTime,
  getPriorityConfig 
} from "@/types/notifications"
import type { NotificationWithHistory } from "@/types/notifications"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationSettingsModal } from "./notification-settings-modal"

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    soundEnabled,
    toggleSound,
    openSettings
  } = useNotifications()

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: NotificationWithHistory) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Navigate if action URL exists
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
      setIsOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const recentNotifications = notifications.slice(0, 20)

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 px-1.5 min-w-[20px] h-5 bg-red-500 text-white border-0"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSound()}
                className="p-1"
                aria-label={soundEnabled ? "Mute notifications" : "Unmute notifications"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-400" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSettings(true)
                  setIsOpen(false)
                }}
                className="p-1"
                aria-label="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  You&apos;ll see new bookings and events here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => {
                  const priorityConfig = getPriorityConfig(notification.priority)
                  
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                        !notification.isRead && "bg-blue-50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNotificationClick(notification)
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium text-gray-900",
                                !notification.isRead && "font-semibold"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.priority !== 'normal' && (
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  priorityConfig.bgColor,
                                  priorityConfig.color,
                                  priorityConfig.borderColor
                                )}
                              >
                                {notification.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm text-blue-600 hover:text-blue-700"
              onClick={() => {
                window.location.href = '/admin/notifications'
                setIsOpen(false)
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      <NotificationSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  )
}