'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircleIcon, XCircleIcon, CalendarIcon, ClockIcon, UserIcon, HomeIcon } from 'lucide-react'
import { WalkIn } from '@/lib/walk-in-logic'
import { supabaseClient } from '@/lib/supabase'

interface AssignmentFormProps {
  walkIn: WalkIn
  onSuccess: () => void
  onCancel: () => void
}

interface StaffMember {
  id: string
  name: string
  capabilities: string[]
  work_days: number[]
  is_active: boolean
}

interface Room {
  id: number
  name: string
  capabilities: string[]
  is_active: boolean
}

export function WalkInAssignmentForm({ walkIn, onSuccess, onCancel }: AssignmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Form state
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch staff and rooms
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [staffData, roomsData] = await Promise.all([
          supabaseClient.getStaff(),
          supabaseClient.getRooms()
        ])

        setStaff(staffData || [])
        setRooms(roomsData || [])
      } catch (err: any) {
        setError('Failed to load staff and room options')
        console.error('Assignment form options error:', err)
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [])

  // Get available staff for the selected service
  const getAvailableStaff = () => {
    // Filter staff who can perform this service category
    return staff.filter(member => {
      // Check if staff can perform this service category
      const canPerformService = member.capabilities.includes(walkIn.service_category) || 
                               member.capabilities.length === 0 // Staff with no specific capabilities can do any service
      
      // Check if staff is working on the selected day
      const selectedDate = new Date(appointmentDate)
      const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      const isWorkingDay = member.work_days.includes(dayOfWeek)

      return canPerformService && isWorkingDay && member.is_active
    })
  }

  // Get available rooms for the selected service
  const getAvailableRooms = () => {
    return rooms.filter(room => {
      // Check if room can handle this service category
      const canHandleService = room.capabilities.includes(walkIn.service_category) || 
                              room.capabilities.length === 0 // Rooms with no specific capabilities can handle any service
      
      return canHandleService && room.is_active
    })
  }

  // Generate time options (9 AM to 7 PM in 15-minute intervals)
  const getTimeOptions = () => {
    const times = []
    for (let hour = 9; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        times.push({ value: timeStr, label: displayTime })
      }
    }
    return times
  }

  const validateForm = () => {
    if (!selectedStaff) return 'Please select a staff member'
    if (!selectedRoom) return 'Please select a room'
    if (!appointmentDate) return 'Please select an appointment date'
    if (!startTime) return 'Please select a start time'
    
    // Check if date is not in the past
    const selectedDate = new Date(appointmentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      return 'Appointment date cannot be in the past'
    }

    return null
  }

  const handleSubmit = async () => {
    const validation = validateForm()
    if (validation) {
      setError(validation)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/walk-ins/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walkInId: walkIn.id,
          staffId: selectedStaff,
          roomId: parseInt(selectedRoom),
          appointmentDate,
          startTime,
          notes: notes || undefined
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Failed to assign walk-in')
      }
    } catch (err: any) {
      setError('Network error. Please try again.')
      console.error('Assignment submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loadingOptions) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment options...</p>
        </div>
      </Card>
    )
  }

  const availableStaff = getAvailableStaff()
  const availableRooms = getAvailableRooms()

  return (
    <Card className="p-6 border-blue-200 bg-blue-50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-blue-900 mb-1">
            Assign Walk-In to Schedule
          </h3>
          <p className="text-sm text-blue-700">
            {walkIn.customer_name} • {walkIn.service_name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Staff Selection */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-2">
            <UserIcon className="w-4 h-4" />
            Select Staff Member *
          </Label>
          <Select value={selectedStaff} onValueChange={setSelectedStaff} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Choose staff member" />
            </SelectTrigger>
            <SelectContent>
              {availableStaff.length === 0 ? (
                <SelectItem value="" disabled>
                  No available staff for this service
                </SelectItem>
              ) : (
                availableStaff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {availableStaff.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No staff members are available for {walkIn.service_category} services on the selected date.
            </p>
          )}
        </div>

        {/* Room Selection */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-2">
            <HomeIcon className="w-4 h-4" />
            Select Room *
          </Label>
          <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Choose room" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.length === 0 ? (
                <SelectItem value="" disabled>
                  No available rooms for this service
                </SelectItem>
              ) : (
                availableRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    Room {room.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {availableRooms.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No rooms are configured for {walkIn.service_category} services.
            </p>
          )}
        </div>

        {/* Date and Time Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4" />
              Appointment Date *
            </Label>
            <Input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <ClockIcon className="w-4 h-4" />
              Start Time *
            </Label>
            <Select value={startTime} onValueChange={setStartTime} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {getTimeOptions().map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-medium mb-2">
            Assignment Notes (Optional)
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific instructions or notes..."
            disabled={loading}
          />
        </div>

        {/* Assignment Summary */}
        {selectedStaff && selectedRoom && appointmentDate && startTime && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Assignment Summary</h4>
            <div className="text-sm text-green-800 space-y-1">
              <div>Customer: {walkIn.customer_name}</div>
              <div>Service: {walkIn.service_name}</div>
              <div>Staff: {availableStaff.find(s => s.id === selectedStaff)?.name}</div>
              <div>Room: {availableRooms.find(r => r.id.toString() === selectedRoom)?.name}</div>
              <div>Date & Time: {new Date(appointmentDate).toLocaleDateString()} at {
                getTimeOptions().find(t => t.value === startTime)?.label
              }</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedStaff || !selectedRoom || !appointmentDate || !startTime}
            className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                Assign Walk-In
              </div>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}