"use client"

import * as React from "react"
import { createClient } from "@supabase/supabase-js"
import { browserNotificationManager } from "@/lib/browser-notification-manager"
import type { 
  NotificationWithHistory,
  AdminNotificationSettings,
  AdminNotificationPreference,
  Notification
} from "@/types/notifications"
import { simpleAuth } from "@/lib/simple-auth"

interface UseNotificationsReturn {
  notifications: NotificationWithHistory[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (notificationId: string) => Promise<void>
  soundEnabled: boolean
  toggleSound: () => void
  openSettings: () => void
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = React.useState<NotificationWithHistory[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [settings, setSettings] = React.useState<AdminNotificationSettings | null>(null)
  const [preferences, setPreferences] = React.useState<AdminNotificationPreference[]>([])
  
  const supabaseRef = React.useRef<ReturnType<typeof createClient> | null>(null)
  const subscriptionRef = React.useRef<any>(null)
  const adminEmailRef = React.useRef<string | null>(null)

  // Initialize Supabase client
  React.useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      supabaseRef.current = createClient(supabaseUrl, supabaseKey)
    }
    
    // Get admin email from session
    const sessionInfo = simpleAuth.getSessionInfo()
    adminEmailRef.current = sessionInfo?.email || 'admin@dermalspa.com'
    
    // Request browser notification permission on mount
    browserNotificationManager.requestPermission()
  }, [])

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    if (!supabaseRef.current || !adminEmailRef.current) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch notifications with history
      const { data: notificationsData, error: notifError } = await supabaseRef.current
        .from('notifications')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (notifError) throw notifError
      
      // Fetch history separately for the current admin
      const notificationIds = (notificationsData || []).map(n => n.id)
      const { data: historyData } = await supabaseRef.current
        .from('admin_notification_history')
        .select('*')
        .in('notification_id', notificationIds)
        .eq('admin_email', adminEmailRef.current)
      
      // Process notifications to add read/dismissed status
      const processedNotifications: NotificationWithHistory[] = (notificationsData || []).map(notification => {
        const history = historyData?.find(
          (h: any) => h.notification_id === notification.id
        )
        
        return {
          ...notification,
          history: history || undefined,
          isRead: !!history?.read_at,
          isDismissed: !!history?.dismissed_at
        } as NotificationWithHistory
      })
      
      setNotifications(processedNotifications)
      
      // Calculate unread count
      const unread = processedNotifications.filter(n => !n.isRead && !n.isDismissed).length
      setUnreadCount(unread)
      
      // Fetch user settings
      const { data: settingsData } = await supabaseRef.current
        .from('admin_notification_settings')
        .select('*')
        .eq('admin_email', adminEmailRef.current)
        .single()
      
      if (settingsData) {
        setSettings(settingsData as unknown as AdminNotificationSettings)
        setSoundEnabled((settingsData as any).soundEnabled !== false)
        browserNotificationManager.setSoundVolume((settingsData as any).soundVolume || 50)
      }
      
      // Fetch preferences
      const { data: prefsData } = await supabaseRef.current
        .from('admin_notification_preferences')
        .select('*')
        .eq('admin_email', adminEmailRef.current)
      
      setPreferences((prefsData as unknown as AdminNotificationPreference[]) || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notification as read
  const markAsRead = React.useCallback(async (notificationId: string) => {
    if (!supabaseRef.current || !adminEmailRef.current) return
    
    try {
      const { error } = await supabaseRef.current
        .from('admin_notification_history')
        .upsert({
          notification_id: notificationId,
          admin_email: adminEmailRef.current,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'notification_id,admin_email'
        })
      
      if (error) throw error
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = React.useCallback(async () => {
    if (!supabaseRef.current || !adminEmailRef.current) return
    
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
      
      for (const id of unreadIds) {
        await markAsRead(id)
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [notifications, markAsRead])

  // Dismiss notification
  const dismissNotification = React.useCallback(async (notificationId: string) => {
    if (!supabaseRef.current || !adminEmailRef.current) return
    
    try {
      const { error } = await supabaseRef.current
        .from('admin_notification_history')
        .upsert({
          notification_id: notificationId,
          admin_email: adminEmailRef.current,
          dismissed_at: new Date().toISOString()
        }, {
          onConflict: 'notification_id,admin_email'
        })
      
      if (error) throw error
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isDismissed: true } : n
      ))
      if (!notifications.find(n => n.id === notificationId)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error dismissing notification:', err)
    }
  }, [notifications])

  // Toggle sound
  const toggleSound = React.useCallback(async () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    
    if (supabaseRef.current && adminEmailRef.current) {
      await supabaseRef.current
        .from('admin_notification_settings')
        .upsert({
          admin_email: adminEmailRef.current,
          sound_enabled: newValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_email'
        })
    }
  }, [soundEnabled])

  // Open settings
  const openSettings = React.useCallback(() => {
    // This function is kept for compatibility
    // The actual modal is handled in the NotificationBell component
    window.location.href = '/admin/notifications#settings'
  }, [])

  // Handle new notification
  const handleNewNotification = React.useCallback((notification: Notification) => {
    // Check if notification type is enabled for this user
    const pref = preferences.find(p => p.notificationType === notification.type)
    if (pref && !pref.enabled) return
    
    // Add to notifications list
    setNotifications(prev => [{
      ...notification,
      isRead: false,
      isDismissed: false
    }, ...prev])
    
    setUnreadCount(prev => prev + 1)
    
    // Show browser notification if enabled
    if (pref?.browserEnabled !== false && settings?.browserPermissionGranted) {
      browserNotificationManager.showNotification(notification, settings)
    }
    
    // Show toast notification
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        duration: undefined, // Use default based on priority
        onAction: notification.actionUrl ? () => {
          window.location.href = notification.actionUrl
        } : undefined
      })
    }
  }, [preferences, settings])

  // Set up real-time subscription
  React.useEffect(() => {
    if (!supabaseRef.current) return
    
    // Subscribe to new notifications
    subscriptionRef.current = supabaseRef.current
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          handleNewNotification(payload.new as Notification)
        }
      )
      .subscribe()
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(subscriptionRef.current)
      }
    }
  }, [handleNewNotification])

  // Initial fetch
  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Polling fallback (every 30 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    soundEnabled,
    toggleSound,
    openSettings,
    refresh: fetchNotifications
  }
}