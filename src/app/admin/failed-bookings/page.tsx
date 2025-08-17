'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Calendar,
  Clock,
  User,
  Users,
  Home,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'

interface BookingError {
  id: string
  error_type: string
  error_message: string
  error_details: any
  booking_data: any
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  service_name?: string
  service_id?: string
  appointment_date?: string
  appointment_time?: string
  staff_name?: string
  staff_id?: string
  room_id?: number
  is_couples_booking: boolean
  secondary_service_name?: string
  secondary_service_id?: string
  secondary_staff_name?: string
  secondary_staff_id?: string
  resolved: boolean
  resolved_at?: string
  resolution_notes?: string
  retry_count: number
  created_at: string
  updated_at: string
}

export default function FailedBookingsPage() {
  const [errors, setErrors] = useState<BookingError[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const fetchErrors = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (filter === 'unresolved') {
        filters.resolved = false
      } else if (filter === 'resolved') {
        filters.resolved = true
      }
      
      const data = await supabaseClient.getBookingErrors(filters)
      setErrors(data || [])
    } catch (error) {
      console.error('Error fetching booking errors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchErrors()
    setRefreshing(false)
  }

  const toggleErrorExpansion = (errorId: string) => {
    const newExpanded = new Set(expandedErrors)
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId)
    } else {
      newExpanded.add(errorId)
    }
    setExpandedErrors(newExpanded)
  }

  const markAsResolved = async (errorId: string, notes?: string) => {
    try {
      const response = await fetch('/api/booking-errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: errorId,
          resolved: true,
          resolution_notes: notes || 'Manually marked as resolved'
        })
      })
      
      if (response.ok) {
        await fetchErrors()
      }
    } catch (error) {
      console.error('Error marking as resolved:', error)
    }
  }

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'couples_booking':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'single_booking':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'validation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'conflict':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A'
    try {
      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return timeString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin'}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Admin
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-primary mb-2">Failed Bookings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and debug booking errors to improve system reliability
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({errors.length})
            </Button>
            <Button
              variant={filter === 'unresolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unresolved')}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Unresolved
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('resolved')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolved
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error List */}
        {errors.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No {filter !== 'all' ? filter : ''} booking errors found.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {errors.map((error) => (
              <Card key={error.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getErrorTypeColor(error.error_type)}>
                        {error.error_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {error.is_couples_booking && (
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          Couples
                        </Badge>
                      )}
                      {error.resolved && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="font-medium text-red-600 dark:text-red-400 mb-2">
                      {error.error_message}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {error.customer_name && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          {error.customer_name}
                        </div>
                      )}
                      
                      {error.service_name && (
                        <div className="text-gray-600 dark:text-gray-400">
                          Service: {error.service_name}
                        </div>
                      )}
                      
                      {error.appointment_date && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {formatDate(error.appointment_date)}
                        </div>
                      )}
                      
                      {error.appointment_time && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatTime(error.appointment_time)}
                        </div>
                      )}
                    </div>
                    
                    {error.secondary_service_name && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Secondary: {error.secondary_service_name} 
                        {error.secondary_staff_name && ` with ${error.secondary_staff_name}`}
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-500">
                      {format(new Date(error.created_at), 'MMM dd, yyyy h:mm a')}
                      {error.retry_count > 0 && (
                        <span className="ml-2">• Retried {error.retry_count} times</span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleErrorExpansion(error.id)}
                  >
                    {expandedErrors.has(error.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Expanded Details */}
                {expandedErrors.has(error.id) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-3">
                      {/* Error Details */}
                      {error.error_details && (
                        <div>
                          <h4 className="font-medium mb-2">Error Details:</h4>
                          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.error_details, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {/* Booking Data */}
                      {error.booking_data && (
                        <div>
                          <h4 className="font-medium mb-2">Booking Data:</h4>
                          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.booking_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {/* Resolution Notes */}
                      {error.resolved && error.resolution_notes && (
                        <div>
                          <h4 className="font-medium mb-2">Resolution:</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {error.resolution_notes}
                          </p>
                          {error.resolved_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Resolved on {format(new Date(error.resolved_at), 'MMM dd, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Actions */}
                      {!error.resolved && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsResolved(error.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Resolved
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}