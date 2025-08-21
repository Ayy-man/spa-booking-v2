"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BookingWithRelations, AvailableStaffForReassignment } from "@/types/booking"
import { getAvailableStaffForSlot, reassignStaff } from "@/lib/admin-booking-logic"
import { AlertCircle, CheckCircle, Loader2, User, UserCheck, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface StaffReassignmentDropdownProps {
  booking: BookingWithRelations
  onReassign: (newStaffId: string) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export function StaffReassignmentDropdown({
  booking,
  onReassign,
  onCancel,
  isOpen
}: StaffReassignmentDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<AvailableStaffForReassignment[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [reassignmentReason, setReassignmentReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableStaff = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getAvailableStaffForSlot(booking.id)
      
      if (result.success && result.data) {
        setAvailableStaff(result.data.available_staff || [])
        // Set current staff as default selection
        setSelectedStaffId(booking.staff_id)
      } else {
        setError(result.error || "Failed to fetch available staff")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [booking.id])

  // Fetch available staff when component mounts or becomes visible
  useEffect(() => {
    if (isOpen) {
      fetchAvailableStaff()
    }
  }, [isOpen, fetchAvailableStaff])

  const handleStaffSelect = (staffId: string) => {
    if (staffId === booking.staff_id) {
      setError("Please select a different staff member")
      return
    }
    setSelectedStaffId(staffId)
    setError(null)
    setShowConfirmDialog(true)
  }

  const handleConfirmReassignment = async () => {
    if (!selectedStaffId || selectedStaffId === booking.staff_id) {
      setError("Please select a different staff member")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await reassignStaff(
        booking.id, 
        selectedStaffId,
        reassignmentReason || undefined
      )

      if (result.success) {
        await onReassign(selectedStaffId)
        setShowConfirmDialog(false)
        setReassignmentReason("")
      } else {
        setError(result.error || "Failed to reassign staff")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const getStaffIcon = (staff: AvailableStaffForReassignment) => {
    if (!staff.can_perform) return <UserX className="w-4 h-4 text-red-500" />
    if (!staff.is_available) return <UserX className="w-4 h-4 text-orange-500" />
    return <UserCheck className="w-4 h-4 text-green-500" />
  }

  const getStaffBadge = (staff: AvailableStaffForReassignment) => {
    if (staff.staff_id === booking.staff_id) {
      return <Badge variant="secondary" className="ml-2">Current</Badge>
    }
    if (staff.staff_id === 'any') {
      return <Badge variant="outline" className="ml-2">Flexible</Badge>
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading available staff...</span>
      </div>
    )
  }

  const selectedStaff = availableStaff.find(s => s.staff_id === selectedStaffId)

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor="staff-select">Select New Staff Member</Label>
          <Select
            value={selectedStaffId}
            onValueChange={handleStaffSelect}
            disabled={submitting}
          >
            <SelectTrigger id="staff-select" className="w-full mt-2">
              <SelectValue placeholder="Choose a staff member" />
            </SelectTrigger>
            <SelectContent>
              {availableStaff.map((staff) => (
                <SelectItem 
                  key={staff.staff_id} 
                  value={staff.staff_id}
                  disabled={!staff.is_available || staff.staff_id === booking.staff_id}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {getStaffIcon(staff)}
                      <span className="ml-2">{staff.staff_name}</span>
                      {getStaffBadge(staff)}
                    </div>
                    {staff.conflict_reason && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({staff.conflict_reason})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Assignment Info */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Current Staff:</span> {booking.staff?.name || 'Not Assigned'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Service:</span> {booking.service?.name}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Date & Time:</span> {new Date(booking.appointment_date).toLocaleDateString()} at {booking.start_time}
          </p>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span>Available for reassignment</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-orange-500" />
            <span>Not available at this time</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-500" />
            <span>Cannot perform this service</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Staff Reassignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to reassign this booking?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-md space-y-2">
              <p className="text-sm">
                <span className="font-medium">From:</span> {booking.staff?.name || 'Not Assigned'}
              </p>
              <p className="text-sm">
                <span className="font-medium">To:</span> {selectedStaff?.staff_name || 'Unknown'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Service:</span> {booking.service?.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Date:</span> {new Date(booking.appointment_date).toLocaleDateString()} at {booking.start_time}
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Reassignment (Optional)</Label>
              <Textarea
                id="reason"
                value={reassignmentReason}
                onChange={(e) => setReassignmentReason(e.target.value)}
                placeholder="Enter reason for reassignment..."
                className="mt-2"
                rows={3}
              />
            </div>

            {booking.booking_type === 'couple' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    This is a couples booking. Only this appointment will be reassigned.
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassignment}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Reassignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}