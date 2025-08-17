'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Users,
  Home,
  User
} from 'lucide-react'
import { format } from 'date-fns'

interface Conflict {
  conflict_type: string
  resource_id: string
  resource_name: string
  existing_booking_id: string
  existing_start: string
  existing_end: string
  existing_status: string
}

interface AvailabilityCheck {
  is_available: boolean
  error_message: string | null
  room_id: number | null
  conflicts: any
}

export default function BookingDiagnosticsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [primaryServiceId, setPrimaryServiceId] = useState('')
  const [secondaryServiceId, setSecondaryServiceId] = useState('')
  const [primaryStaffId, setPrimaryStaffId] = useState('any')
  const [secondaryStaffId, setSecondaryStaffId] = useState('any')

  const diagnoseTimeSlot = async () => {
    setLoading(true)
    try {
      const conflictData = await supabaseClient.diagnoseBookingConflicts(
        date,
        time,
        duration
      )
      setConflicts(conflictData || [])
    } catch (error) {
      console.error('Error diagnosing conflicts:', error)
      setConflicts([])
    } finally {
      setLoading(false)
    }
  }

  const checkCouplesAvailability = async () => {
    if (!primaryServiceId || !secondaryServiceId) {
      alert('Please enter both service IDs')
      return
    }

    setLoading(true)
    try {
      const availData = await supabaseClient.checkCouplesAvailability({
        primary_service_id: primaryServiceId,
        secondary_service_id: secondaryServiceId,
        primary_staff_id: primaryStaffId,
        secondary_staff_id: secondaryStaffId,
        booking_date: date,
        start_time: time
      })
      
      if (availData && availData.length > 0) {
        setAvailability(availData[0])
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailability(null)
    } finally {
      setLoading(false)
    }
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'staff_conflict':
        return <User className="h-4 w-4" />
      case 'room_conflict':
        return <Home className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getConflictColor = (type: string) => {
    switch (type) {
      case 'staff_conflict':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'room_conflict':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
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
          
          <h1 className="text-3xl font-bold text-primary mb-2">Booking Diagnostics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Diagnose booking conflicts and check availability
          </p>
        </div>

        {/* Diagnostic Tools */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Time Slot Conflict Checker */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Time Slot Conflicts
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                />
              </div>
              
              <Button 
                onClick={diagnoseTimeSlot}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Checking...' : 'Check Conflicts'}
              </Button>
              
              {/* Conflicts Display */}
              {conflicts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="font-medium">Found {conflicts.length} conflict(s):</h3>
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="border rounded p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getConflictColor(conflict.conflict_type)}>
                          {getConflictIcon(conflict.conflict_type)}
                          <span className="ml-1">{conflict.conflict_type.replace('_', ' ')}</span>
                        </Badge>
                        <span className="font-medium">{conflict.resource_name}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div>Booking ID: {conflict.existing_booking_id}</div>
                        <div>Time: {conflict.existing_start} - {conflict.existing_end}</div>
                        <div>Status: {conflict.existing_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {conflicts.length === 0 && !loading && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No conflicts found for this time slot
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Couples Booking Availability Checker */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Couples Booking Availability
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-service">Primary Service ID</Label>
                  <Input
                    id="primary-service"
                    placeholder="e.g., deep-cleansing-facial"
                    value={primaryServiceId}
                    onChange={(e) => setPrimaryServiceId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="secondary-service">Secondary Service ID</Label>
                  <Input
                    id="secondary-service"
                    placeholder="e.g., swedish-massage"
                    value={secondaryServiceId}
                    onChange={(e) => setSecondaryServiceId(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-staff">Primary Staff ID</Label>
                  <Input
                    id="primary-staff"
                    placeholder="any or staff ID"
                    value={primaryStaffId}
                    onChange={(e) => setPrimaryStaffId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="secondary-staff">Secondary Staff ID</Label>
                  <Input
                    id="secondary-staff"
                    placeholder="any or staff ID"
                    value={secondaryStaffId}
                    onChange={(e) => setSecondaryStaffId(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={checkCouplesAvailability}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Checking...' : 'Check Availability'}
              </Button>
              
              {/* Availability Display */}
              {availability && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {availability.is_available ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-4 w-4 mr-1" />
                        Not Available
                      </Badge>
                    )}
                    {availability.room_id && (
                      <span className="text-sm">Room {availability.room_id}</span>
                    )}
                  </div>
                  
                  {availability.error_message && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {availability.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {availability.conflicts && (
                    <div className="border rounded p-3">
                      <h4 className="font-medium mb-2">Conflict Details:</h4>
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(availability.conflicts, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold mb-3">How to Use</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Time Slot Conflicts:</strong> Enter a date, time, and duration to see what bookings 
              are blocking that time slot. This shows both staff and room conflicts.
            </p>
            <p>
              <strong>Couples Availability:</strong> Enter service IDs and staff IDs to check if a couples 
              booking can be made. Use "any" for staff IDs to allow any available staff member.
            </p>
            <p>
              <strong>Service IDs:</strong> You can find service IDs in the Services management page. 
              They typically look like "deep-cleansing-facial" or "swedish-massage".
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}