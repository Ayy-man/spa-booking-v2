'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertCircle, PhoneCall, CheckCircle, XCircle, Clock, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Staff } from '@/types/booking'
import { 
  StaffAvailabilityStatus, 
  AVAILABILITY_STATUS_CONFIG, 
  getStatusDisplay 
} from '@/types/staff-availability'
import { cn } from '@/lib/utils'

interface StaffStatusProps {
  staff: Staff
  onStatusChange?: () => void
}

export function StaffAvailabilityStatusCard({ staff, onStatusChange }: StaffStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<StaffAvailabilityStatus>(
    staff.current_status || 'working'
  )
  const [advanceNoticeHours, setAdvanceNoticeHours] = useState(
    staff.default_advance_notice_hours || 2
  )
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [tempStatus, setTempStatus] = useState(currentStatus)
  const [tempAdvanceHours, setTempAdvanceHours] = useState(advanceNoticeHours)

  const statusConfig = AVAILABILITY_STATUS_CONFIG[currentStatus]

  const handleQuickStatusChange = async (newStatus: StaffAvailabilityStatus) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          current_status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', staff.id)

      if (error) throw error

      setCurrentStatus(newStatus)
      onStatusChange?.()
    } catch (error) {
      console.error('Error updating staff status:', error)
      alert('Failed to update staff status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveAdvancedSettings = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          current_status: tempStatus,
          default_advance_notice_hours: tempAdvanceHours,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', staff.id)

      if (error) throw error

      setCurrentStatus(tempStatus)
      setAdvanceNoticeHours(tempAdvanceHours)
      setShowEditDialog(false)
      onStatusChange?.()
    } catch (error) {
      console.error('Error updating staff status:', error)
      alert('Failed to update staff status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{staff.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {staff.role || 'Therapist'}
              </p>
            </div>
            <Badge
              className={cn(
                "font-medium",
                statusConfig.bgColor,
                statusConfig.color,
                statusConfig.borderColor,
                "border"
              )}
            >
              <span className="mr-1">{statusConfig.icon}</span>
              {getStatusDisplay(currentStatus, advanceNoticeHours)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Status Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={currentStatus === 'working' ? 'default' : 'outline'}
              onClick={() => handleQuickStatusChange('working')}
              disabled={isUpdating}
              className={cn(
                currentStatus === 'working' && "bg-green-600 hover:bg-green-700"
              )}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Working
            </Button>
            <Button
              size="sm"
              variant={currentStatus === 'on_call' ? 'default' : 'outline'}
              onClick={() => handleQuickStatusChange('on_call')}
              disabled={isUpdating}
              className={cn(
                currentStatus === 'on_call' && "bg-yellow-600 hover:bg-yellow-700"
              )}
            >
              <PhoneCall className="h-4 w-4 mr-1" />
              On Call
            </Button>
            <Button
              size="sm"
              variant={currentStatus === 'off' ? 'default' : 'outline'}
              onClick={() => handleQuickStatusChange('off')}
              disabled={isUpdating}
              className={cn(
                currentStatus === 'off' && "bg-gray-600 hover:bg-gray-700"
              )}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Off
            </Button>
          </div>

          {/* Status Details */}
          <div className="text-sm space-y-1">
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              {currentStatus === 'working' && "Available for immediate booking"}
              {currentStatus === 'on_call' && `Requires ${advanceNoticeHours}h advance notice`}
              {currentStatus === 'off' && "Not available for bookings"}
            </div>
            {staff.status_updated_at && (
              <p className="text-xs text-gray-400">
                Last updated: {format(new Date(staff.status_updated_at), 'MMM d, h:mm a')}
              </p>
            )}
          </div>

          {/* Advanced Settings Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTempStatus(currentStatus)
              setTempAdvanceHours(advanceNoticeHours)
              setShowEditDialog(true)
            }}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Settings Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advanced Availability Settings - {staff.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Availability Status</Label>
              <RadioGroup value={tempStatus} onValueChange={(v) => setTempStatus(v as StaffAvailabilityStatus)}>
                {Object.entries(AVAILABILITY_STATUS_CONFIG).map(([value, config]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`status-${value}`} />
                    <Label htmlFor={`status-${value}`} className="flex items-center cursor-pointer">
                      <span className="mr-2">{config.icon}</span>
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-gray-500">{config.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Advance Notice Hours (only for on-call) */}
            {tempStatus === 'on_call' && (
              <div className="space-y-2">
                <Label htmlFor="advance-hours">Advance Notice Required (hours)</Label>
                <Input
                  id="advance-hours"
                  type="number"
                  min="0"
                  max="48"
                  value={tempAdvanceHours}
                  onChange={(e) => setTempAdvanceHours(parseInt(e.target.value) || 2)}
                />
                <p className="text-sm text-gray-500">
                  Customers must book at least {tempAdvanceHours} hours in advance when you're on-call
                </p>
              </div>
            )}

            {/* Status Warning */}
            {tempStatus === 'off' && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Staff will be completely unavailable</p>
                  <p>No bookings can be made when status is set to "Off"</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdvancedSettings} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Main component for managing all staff availability
export function StaffAvailabilityManager() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | StaffAvailabilityStatus>('all')

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = filter === 'all' 
    ? staff 
    : staff.filter(s => (s.current_status || 'working') === filter)

  const statusCounts = {
    working: staff.filter(s => (s.current_status || 'working') === 'working').length,
    on_call: staff.filter(s => s.current_status === 'on_call').length,
    off: staff.filter(s => s.current_status === 'off').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Availability Status</h2>
          <p className="text-gray-600">Manage staff working status and advance notice requirements</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            {statusCounts.working} Working
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            {statusCounts.on_call} On Call
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
            {statusCounts.off} Off
          </Badge>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Staff
        </Button>
        <Button
          size="sm"
          variant={filter === 'working' ? 'default' : 'outline'}
          onClick={() => setFilter('working')}
        >
          Working ({statusCounts.working})
        </Button>
        <Button
          size="sm"
          variant={filter === 'on_call' ? 'default' : 'outline'}
          onClick={() => setFilter('on_call')}
        >
          On Call ({statusCounts.on_call})
        </Button>
        <Button
          size="sm"
          variant={filter === 'off' ? 'default' : 'outline'}
          onClick={() => setFilter('off')}
        >
          Off ({statusCounts.off})
        </Button>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staffMember) => (
          <StaffAvailabilityStatusCard
            key={staffMember.id}
            staff={staffMember}
            onStatusChange={fetchStaff}
          />
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No staff members found with selected status
        </div>
      )}
    </div>
  )
}