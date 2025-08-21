"use client"

import * as React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// Using Dialog for confirmation instead of AlertDialog
// AlertDialog can be added later if needed
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { CouplesBookingIndicator } from "@/components/ui/couples-booking-indicator"
import { BookingWithRelations } from "@/types/booking"
import { deleteBooking } from "@/lib/admin-booking-logic"
import { cancelBookingRPC } from "@/lib/admin-booking-rpc"
import { format } from "date-fns"
import { formatPhoneNumber } from "@/lib/phone-utils"
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign,
  AlertCircle,
  Trash2,
  XCircle,
  CalendarClock,
  Edit2
} from "lucide-react"
import { simpleAuth } from "@/lib/simple-auth"
import { RescheduleModal } from "./RescheduleModal"
import { StaffReassignmentDropdown } from "./StaffReassignmentDropdown"
import { Badge } from "@/components/ui/badge"

interface BookingDetailsModalProps {
  booking: BookingWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete?: () => void
}

export function BookingDetailsModal({
  booking,
  open,
  onOpenChange,
  onActionComplete
}: BookingDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showStaffReassignment, setShowStaffReassignment] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin for delete functionality
  const isAdmin = simpleAuth.isAuthenticated()
  
  // Debug logging for reassignment button visibility
  const canReassignStaff = booking?.status !== 'cancelled' && booking?.status !== 'completed' && booking?.status !== 'no_show'
  
  console.log('[BookingDetailsModal] Debug:', {
    bookingId: booking?.id,
    bookingStatus: booking?.status,
    isAdmin,
    canReassignStaff,
    shouldShowButtons: booking?.status !== 'cancelled' && booking?.status !== 'completed',
    booking
  })

  if (!booking) return null

  const handleCancel = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Use RPC function for proper cancellation with all fields
      const result = await cancelBookingRPC(booking.id, cancellationReason)
      if (result.success) {
        setShowCancelDialog(false)
        setCancellationReason("")
        onOpenChange(false)
        onActionComplete?.()
      } else {
        setError(result.error || "Failed to cancel booking")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    
    console.log('[BookingDetailsModal] Starting delete for booking:', booking.id)
    
    try {
      const result = await deleteBooking(booking.id)
      console.log('[BookingDetailsModal] Delete result:', result)
      
      if (result.success) {
        console.log('[BookingDetailsModal] Delete successful, closing dialogs')
        setShowDeleteDialog(false)
        onOpenChange(false)
        onActionComplete?.()
      } else {
        console.error('[BookingDetailsModal] Delete failed:', result.error)
        setError(result.error || "Failed to delete booking")
      }
    } catch (err) {
      console.error('[BookingDetailsModal] Delete error:', err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM d, yyyy")
  }

  // Get customer details
  const customer = booking.customer
  const customerName = customer 
    ? (customer.last_name 
      ? `${customer.first_name} ${customer.last_name}`
      : customer.first_name)
    : 'Unknown Customer'
  const customerEmail = customer?.email || 'No email'
  const customerPhone = customer?.phone || 'No phone'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              Booking Details
              <StatusBadge status={booking.status} />
            </DialogTitle>
            <DialogDescription>
              Booking ID: {booking.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Service Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Service Information
                <CouplesBookingIndicator bookingType={booking.booking_type} />
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Service</Label>
                  <p className="font-medium">{booking.service?.name || 'Unknown Service'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">{booking.service?.duration || 0} minutes</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium capitalize">
                    {booking.service?.category?.replace('_', ' ') || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price</Label>
                  <p className="font-medium">${booking.final_price || 0}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time
                {(booking as any).rescheduled_count > 0 && (
                  <Badge variant="outline" className="ml-2">
                    Rescheduled {(booking as any).rescheduled_count}x
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDate(booking.appointment_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="font-medium">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </p>
                </div>
              </div>
              {(booking as any).original_appointment_date && (booking as any).original_start_time && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-800">
                    <span className="font-medium">Originally scheduled:</span> {formatDate((booking as any).original_appointment_date)} at {formatTime((booking as any).original_start_time)}
                  </p>
                  {(booking as any).reschedule_reason && (
                    <p className="text-sm text-orange-700 mt-1">
                      <span className="font-medium">Reason:</span> {(booking as any).reschedule_reason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Staff & Room */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Staff & Room Assignment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Staff Member</Label>
                    {canReassignStaff && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStaffReassignment(true)}
                        className="h-7 px-2 text-xs"
                        title="Reassign staff"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Reassign
                      </Button>
                    )}
                  </div>
                  <p className="font-medium flex items-center">
                    {booking.staff?.name || 'Not Assigned'}
                    {(booking as any).staff_change_count > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Reassigned {(booking as any).staff_change_count}x
                      </Badge>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room</Label>
                  <p className="font-medium">Room {booking.room?.name || 'Not Assigned'}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{customerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formatPhoneNumber(customerPhone)}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Payment Option</Label>
                  <p className="font-medium capitalize">
                    {booking.payment_option?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <p className="font-medium capitalize">
                    {booking.payment_status || 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(booking.notes || booking.internal_notes) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Notes</h3>
                {booking.notes && (
                  <div>
                    <Label className="text-muted-foreground">Customer Notes</Label>
                    <p className="text-sm mt-1">{booking.notes}</p>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <Label className="text-muted-foreground">Internal Notes</Label>
                    <p className="text-sm mt-1">{booking.internal_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-2 text-xs text-muted-foreground border-t pt-4">
              <p>Created: {format(new Date(booking.created_at), "PPp")}</p>
              {booking.updated_at && (
                <p>Last Updated: {format(new Date(booking.updated_at), "PPp")}</p>
              )}
              {booking.cancelled_at && (
                <p className="text-red-600">
                  Cancelled: {format(new Date(booking.cancelled_at), "PPp")}
                </p>
              )}
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
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            
            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowStaffReassignment(true)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Reassign Staff
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRescheduleModal(true)}
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Reschedule
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Booking
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will mark the booking as cancelled and free up the time slot.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={loading}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Booking Permanently?</DialogTitle>
            <DialogDescription className="space-y-2">
              <span>
                This action cannot be undone. This will permanently delete the booking for:
              </span>
              <div className="bg-gray-50 p-3 rounded mt-2 space-y-1">
                <p className="font-medium text-gray-900">{customerName}</p>
                <p className="text-sm text-gray-600">
                  {booking.service?.name} on {formatDate(booking.appointment_date)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatTime(booking.start_time)} with {booking.staff?.name}
                </p>
              </div>
              <span className="text-red-600 font-medium block mt-3">
                ⚠️ All booking history and payment records will be permanently removed.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={booking}
        open={showRescheduleModal}
        onOpenChange={setShowRescheduleModal}
        onRescheduleComplete={() => {
          setShowRescheduleModal(false)
          onActionComplete?.()
        }}
      />

      {/* Staff Reassignment Dialog */}
      <Dialog open={showStaffReassignment} onOpenChange={setShowStaffReassignment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Staff Member</DialogTitle>
            <DialogDescription>
              Select a new staff member for this booking. Only available staff who can perform this service will be shown.
            </DialogDescription>
          </DialogHeader>
          
          <StaffReassignmentDropdown
            booking={booking}
            isOpen={showStaffReassignment}
            onReassign={async (newStaffId) => {
              setShowStaffReassignment(false)
              onActionComplete?.()
            }}
            onCancel={() => setShowStaffReassignment(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}