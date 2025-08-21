"use client"

import * as React from "react"
import { useState, useEffect } from "react"
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
import { Calendar } from "@/components/ui/calendar"
import { BookingWithRelations } from "@/types/booking"
import { 
  rescheduleBooking, 
  getAvailableRescheduleSlots, 
  checkRescheduleEligibility,
  type AvailableSlot,
  type RescheduleCheckResult
} from "@/lib/reschedule-logic"
import { format, addDays, startOfDay } from "date-fns"
import { 
  CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getGuamTime } from "@/lib/timezone-utils"

interface RescheduleModalProps {
  booking: BookingWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescheduleComplete?: () => void
}

export function RescheduleModal({
  booking,
  open,
  onOpenChange,
  onRescheduleComplete
}: RescheduleModalProps) {
  const [loading, setLoading] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [eligibility, setEligibility] = useState<RescheduleCheckResult | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open && booking) {
      setSelectedDate(undefined)
      setSelectedTime(null)
      setRescheduleReason("")
      setError(null)
      setAvailableSlots([])
      checkEligibility()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking])

  // Check if booking can be rescheduled
  const checkEligibility = async () => {
    if (!booking) return

    setCheckingEligibility(true)
    setError(null)

    try {
      const result = await checkRescheduleEligibility(booking.id)
      setEligibility(result)
      
      if (!result.can_reschedule) {
        setError(result.reason)
      }
    } catch (err) {
      setError("Failed to check reschedule eligibility")
    } finally {
      setCheckingEligibility(false)
    }
  }

  // Load available slots when date is selected
  useEffect(() => {
    if (selectedDate && booking && eligibility?.can_reschedule) {
      loadAvailableSlots()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, booking, eligibility?.can_reschedule])

  const loadAvailableSlots = async () => {
    if (!selectedDate || !booking) return

    setLoadingSlots(true)
    setSelectedTime(null)
    setError(null)

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const slots = await getAvailableRescheduleSlots(booking, dateStr)
      setAvailableSlots(slots)
      
      // Check if any slots are available
      const hasAvailable = slots.some(s => s.available)
      if (!hasAvailable) {
        setError("No available time slots on this date. Please select another date.")
      }
    } catch (err) {
      setError("Failed to load available time slots")
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleReschedule = async () => {
    if (!booking || !selectedDate || !selectedTime) return

    setLoading(true)
    setError(null)
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await rescheduleBooking(
        booking.id,
        dateStr,
        selectedTime,
        rescheduleReason || undefined,
        true // notify customer
      )
      
      if (result.success) {
        onOpenChange(false)
        onRescheduleComplete?.()
      } else {
        setError(result.error || "Failed to reschedule booking")
      }
    } catch (err) {
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

  if (!booking) return null

  // Current booking details
  const currentDate = booking.appointment_date
  const currentTime = booking.start_time
  const serviceName = booking.service?.name || 'Unknown Service'
  const staffName = booking.staff?.name || 'Unknown Staff'
  const customerName = booking.customer 
    ? (booking.customer.last_name 
      ? `${booking.customer.first_name} ${booking.customer.last_name}`
      : booking.customer.first_name)
    : 'Unknown Customer'

  // Calculate min and max dates for calendar
  const today = startOfDay(getGuamTime())
  const minDate = addDays(today, 1) // Tomorrow minimum
  const maxDate = addDays(today, 30) // 30 days maximum

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Reschedule the appointment for {customerName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Current Appointment Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Current Appointment</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-600">Service:</span> {serviceName}</p>
                <p><span className="text-gray-600">Date:</span> {formatDate(currentDate)}</p>
                <p><span className="text-gray-600">Time:</span> {formatTime(currentTime)} - {formatTime(booking.end_time)}</p>
                <p><span className="text-gray-600">Staff:</span> {staffName}</p>
                <p><span className="text-gray-600">Room:</span> Room {booking.room?.name}</p>
              </div>
              {booking.booking_type === 'couple' && (
                <Badge variant="secondary" className="mt-2">
                  <Info className="w-3 h-3 mr-1" />
                  Couples Booking - Both appointments will be rescheduled
                </Badge>
              )}
            </div>

            {/* Eligibility Check */}
            {checkingEligibility ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Checking eligibility...</span>
              </div>
            ) : eligibility && !eligibility.can_reschedule ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {eligibility.reason}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Reschedule History */}
                {eligibility?.history && eligibility.history.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This booking has been rescheduled {eligibility.history.length} time(s) before.
                      {eligibility.history.length >= 2 && (
                        <span className="text-orange-600 font-medium ml-1">
                          (Only 1 more reschedule allowed)
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Date Selection */}
                <div className="space-y-3">
                  <Label>Select New Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      date < minDate || 
                      date > maxDate || 
                      date.getDay() === 0 // Disable Sundays if needed
                    }
                    className="rounded-md border"
                  />
                </div>

                {/* Time Slot Selection */}
                {selectedDate && (
                  <div className="space-y-3">
                    <Label>Select New Time</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span className="text-sm text-gray-600">Loading available slots...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            size="sm"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={cn(
                              "relative",
                              !slot.available && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {formatTime(slot.time)}
                            {!slot.available && (
                              <XCircle className="w-3 h-3 absolute top-0 right-0 -mt-1 -mr-1 text-red-500" />
                            )}
                            {slot.available && selectedTime === slot.time && (
                              <CheckCircle className="w-3 h-3 absolute top-0 right-0 -mt-1 -mr-1 text-green-500" />
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                    {selectedDate && availableSlots.length === 0 && !loadingSlots && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No time slots available for this date
                      </p>
                    )}
                  </div>
                )}

                {/* Reschedule Reason */}
                <div className="space-y-3">
                  <Label htmlFor="reason">Reason for Reschedule (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Enter reason for rescheduling..."
                    rows={3}
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={
              loading || 
              !selectedDate || 
              !selectedTime || 
              !eligibility?.can_reschedule ||
              checkingEligibility
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Confirm Reschedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}