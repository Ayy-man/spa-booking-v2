'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { 
  Bell, 
  Search, 
  Filter, 
  Download, 
  Settings, 
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Calendar,
  Clock,
  AlertCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useNotifications } from '@/hooks/use-notifications'
import { createClient } from '@supabase/supabase-js'
import type { 
  NotificationWithHistory,
  NotificationType,
  NotificationPriority 
} from '@/types/notifications'
import {
  getNotificationIcon,
  formatNotificationTime,
  getPriorityConfig,
  NOTIFICATION_CONFIG,
  PRIORITY_CONFIG
} from '@/types/notifications'
import { simpleAuth } from '@/lib/simple-auth'
import { NotificationSettingsModal } from '@/components/admin/notification-settings-modal'

export default function NotificationsPage() {
  const {
    notifications: realtimeNotifications,
    unreadCount,
    loading: realtimeLoading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refresh
  } = useNotifications()

  const [notifications, setNotifications] = useState<NotificationWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'dismissed'>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [adminEmail, setAdminEmail] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)

  const itemsPerPage = 20

  // Initialize Supabase client and check for hash
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      setSupabase(createClient(supabaseUrl, supabaseKey))
    }
    
    const sessionInfo = simpleAuth.getSessionInfo()
    setAdminEmail(sessionInfo?.email || 'admin@dermalspa.com')
    
    // Check if settings hash is in URL
    if (window.location.hash === '#settings') {
      setShowSettings(true)
      // Remove hash from URL
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Fetch notifications with filters
  const fetchNotifications = useCallback(async () => {
    if (!supabase || !adminEmail) return
    
    setLoading(true)
    
    try {
      // Build query
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }
      
      // Apply priority filter
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }
      
      // Apply date range filter
      const now = new Date()
      if (dateRange === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        query = query.gte('created_at', today.toISOString())
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', monthAgo.toISOString())
      }
      
      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`)
      }
      
      // Apply pagination
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)
      
      const { data: notificationsData, error: notifError, count } = await query
      
      if (notifError) throw notifError
      
      // Fetch history for current admin
      const notificationIds = (notificationsData || []).map(n => n.id)
      const { data: historyData } = await supabase
        .from('admin_notification_history')
        .select('*')
        .in('notification_id', notificationIds)
        .eq('admin_email', adminEmail)
      
      // Process notifications
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
      
      // Apply status filter
      let filteredNotifications = processedNotifications
      if (statusFilter === 'unread') {
        filteredNotifications = filteredNotifications.filter(n => !n.isRead)
      } else if (statusFilter === 'read') {
        filteredNotifications = filteredNotifications.filter(n => n.isRead && !n.isDismissed)
      } else if (statusFilter === 'dismissed') {
        filteredNotifications = filteredNotifications.filter(n => n.isDismissed)
      }
      
      setNotifications(filteredNotifications)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, adminEmail, typeFilter, priorityFilter, statusFilter, dateRange, searchQuery, page])

  // Fetch on filter changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Title', 'Message', 'Priority', 'Status']
    const rows = notifications.map(n => [
      format(new Date(n.createdAt), 'yyyy-MM-dd'),
      format(new Date(n.createdAt), 'HH:mm'),
      n.type.replace(/_/g, ' '),
      n.title,
      n.message,
      n.priority,
      n.isDismissed ? 'Dismissed' : n.isRead ? 'Read' : 'Unread'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notifications-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all notifications
  const clearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      return
    }
    
    if (!supabase || !adminEmail) return
    
    try {
      const notificationIds = notifications.map(n => n.id)
      
      for (const id of notificationIds) {
        await supabase
          .from('admin_notification_history')
          .upsert({
            notification_id: id,
            admin_email: adminEmail,
            dismissed_at: new Date().toISOString()
          }, {
            onConflict: 'notification_id,admin_email'
          })
      }
      
      await fetchNotifications()
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Manage and review all system notifications</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {notifications.filter(n => n.requiresAction && !n.isRead).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="new_booking">New Booking</SelectItem>
                <SelectItem value="walk_in">Walk-In</SelectItem>
                <SelectItem value="payment_received">Payment</SelectItem>
                <SelectItem value="booking_cancelled">Cancelled</SelectItem>
                <SelectItem value="booking_rescheduled">Rescheduled</SelectItem>
                <SelectItem value="system_alert">System Alert</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notifications found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const priorityConfig = getPriorityConfig(notification.priority)
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors",
                      !notification.isRead && "bg-blue-50",
                      notification.isDismissed && "opacity-60"
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className={cn(
                                "text-sm font-medium text-gray-900",
                                !notification.isRead && "font-semibold"
                              )}>
                                {notification.title}
                              </p>
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
                              {notification.requiresAction && !notification.isRead && (
                                <Badge 
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Action Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(notification.createdAt), 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(notification.createdAt), 'h:mm a')}
                              </span>
                              {notification.isDismissed ? (
                                <span className="text-xs text-gray-400">Dismissed</span>
                              ) : notification.isRead ? (
                                <span className="text-xs text-green-600">Read</span>
                              ) : (
                                <span className="text-xs text-blue-600 font-medium">Unread</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {!notification.isDismissed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => dismissNotification(notification.id)}
                                className="text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = notification.actionUrl}
                                className="text-xs"
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
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